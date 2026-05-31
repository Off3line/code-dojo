import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { io as ioClient } from "socket.io-client";
import { createGameServer } from "../index.js";

// These tests boot the real socket.io server on an ephemeral port and connect
// real clients, so they exercise the actual event wiring end-to-end (not mocks).

let server;
let url;
let clients;

beforeEach(async () => {
  ({ server } = createGameServer({ log: false }));
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
  clients = [];
});

afterEach(async () => {
  clients.forEach((c) => c.disconnect());
  await new Promise((resolve) => server.close(resolve));
});

// --- helpers ---------------------------------------------------------------

function connect() {
  const socket = ioClient(url, { forceNew: true });
  clients.push(socket);
  return socket;
}

/** Resolve once `event` arrives on `socket` (rejects if it doesn't in time). */
function waitFor(socket, event, ms = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Collect every occurrence of `event` into an array (for multi-invite cases). */
function collect(socket, event) {
  const arr = [];
  socket.on(event, (payload) => arr.push(payload));
  return arr;
}

/** Connect a client, wait for it to join the lobby, and return it. */
async function joinLobby(name) {
  const socket = connect();
  await waitFor(socket, "connect");
  const lobby = waitFor(socket, "lobby");
  socket.emit("joinLobby", { name });
  await lobby;
  return socket;
}

/** Find a player's id in a lobby payload by name. */
const idOf = (lobby, name) => lobby.players.find((p) => p.name === name).id;

// --- tests -----------------------------------------------------------------

describe("lobby", () => {
  it("broadcasts the full waiting list to everyone", async () => {
    const alice = await joinLobby("Alice");
    const next = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob"); // triggers a fresh broadcast
    const payload = await next;

    expect(payload.players).toHaveLength(2);
    expect(payload.players.map((p) => p.name).sort()).toEqual(["Alice", "Bob"]);
    expect(bob).toBeDefined();
  });

  it("removes a player from the list when they leave", async () => {
    const alice = await joinLobby("Alice");
    const after = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    await after;

    const shrunk = waitFor(alice, "lobby");
    bob.emit("leaveLobby");
    const payload = await shrunk;
    expect(payload.players.map((p) => p.name)).toEqual(["Alice"]);
  });
});

describe("invitations", () => {
  it("delivers inviteReceived to the target and inviteSent to the sender", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    const lobby = await lobbyForAlice;

    const received = waitFor(bob, "inviteReceived");
    const sent = waitFor(alice, "inviteSent");
    alice.emit("invite", { toId: idOf(lobby, "Bob") });

    expect((await received).from.name).toBe("Alice");
    expect((await sent).to.name).toBe("Bob");
  });

  it("starts a match on accept: inviter is X, accepter is O", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    const lobby = await lobbyForAlice;

    const received = waitFor(bob, "inviteReceived");
    alice.emit("invite", { toId: idOf(lobby, "Bob") });
    const inv = await received;

    const matchA = waitFor(alice, "matchFound");
    const matchB = waitFor(bob, "matchFound");
    bob.emit("respondInvite", { inviteId: inv.inviteId, accept: true });

    expect((await matchA).symbol).toBe("X");
    expect((await matchB).symbol).toBe("O");
  });

  it("notifies the inviter when an invitation is declined", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    const lobby = await lobbyForAlice;

    const received = waitFor(bob, "inviteReceived");
    alice.emit("invite", { toId: idOf(lobby, "Bob") });
    const inv = await received;

    const declined = waitFor(alice, "inviteDeclined");
    bob.emit("respondInvite", { inviteId: inv.inviteId, accept: false });
    expect((await declined).by.name).toBe("Bob");
  });

  it("cancels a player's other pending invites once they accept one", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    await lobbyForAlice;
    const lobbyForCara = waitFor(alice, "lobby");
    const cara = await joinLobby("Cara");
    const lobby = await lobbyForCara;

    const bobInvites = collect(bob, "inviteReceived");
    const bobId = idOf(lobby, "Bob");
    alice.emit("invite", { toId: bobId });
    cara.emit("invite", { toId: bobId });

    // wait until Bob has both invites
    await waitFor(bob, "inviteReceived"); // at least one
    await new Promise((r) => setTimeout(r, 50));
    expect(bobInvites.length).toBe(2);

    const caraCancelled = waitFor(cara, "inviteCancelled");
    const fromAlice = bobInvites.find((i) => i.from.name === "Alice");
    bob.emit("respondInvite", { inviteId: fromAlice.inviteId, accept: true });

    expect((await caraCancelled).reason).toBe("matched");
  });
});

describe("disconnect", () => {
  it("aborts an in-progress match and notifies the opponent", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    const lobby = await lobbyForAlice;

    const received = waitFor(bob, "inviteReceived");
    alice.emit("invite", { toId: idOf(lobby, "Bob") });
    const inv = await received;
    await Promise.all([
      waitFor(alice, "matchFound"),
      (async () => {
        bob.emit("respondInvite", { inviteId: inv.inviteId, accept: true });
        return waitFor(bob, "matchFound");
      })(),
    ]);

    const left = waitFor(bob, "opponentLeft");
    alice.disconnect();
    await left; // resolves => opponent was notified
  });

  it("removes a disconnecting player from the lobby", async () => {
    const alice = await joinLobby("Alice");
    const lobbyForAlice = waitFor(alice, "lobby");
    const bob = await joinLobby("Bob");
    await lobbyForAlice;

    const shrunk = waitFor(alice, "lobby");
    bob.disconnect();
    const payload = await shrunk;
    expect(payload.players.map((p) => p.name)).toEqual(["Alice"]);
  });
});
