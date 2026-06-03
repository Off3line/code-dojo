import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameServer } from "../index.js";

// Boots the real server on an ephemeral port and fetches /protocol, then guards
// against drift: the documented event sets must match what the server actually
// handles / emits. If someone adds or removes an event without updating
// protocol.js, this fails.

// The client -> server events the server actually wires up (see index.js).
const HANDLED_CLIENT_EVENTS = [
  "joinLobby",
  "leaveLobby",
  "invite",
  "respondInvite",
  "makeMove",
].sort();

// The server -> client events the server actually emits (see matchmaking.js).
const EMITTED_SERVER_EVENTS = [
  "lobby",
  "inviteReceived",
  "inviteSent",
  "inviteDeclined",
  "inviteCancelled",
  "matchFound",
  "gameState",
  "roundOver",
  "matchOver",
  "errorMsg",
  "opponentLeft",
].sort();

let server;
let url;

beforeEach(async () => {
  ({ server } = createGameServer({ log: false }));
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("GET /protocol", () => {
  it("returns the contract as JSON", async () => {
    const res = await fetch(`${url}/protocol`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);

    const body = await res.json();
    expect(body).toHaveProperty("clientToServer");
    expect(body).toHaveProperty("serverToClient");
    expect(body.transport).toBe("socket.io");
  });

  it("documents exactly the client->server events the server handles", async () => {
    const { clientToServer } = await (await fetch(`${url}/protocol`)).json();
    expect(Object.keys(clientToServer).sort()).toEqual(HANDLED_CLIENT_EVENTS);
  });

  it("documents exactly the server->client events the server emits", async () => {
    const { serverToClient } = await (await fetch(`${url}/protocol`)).json();
    expect(Object.keys(serverToClient).sort()).toEqual(EMITTED_SERVER_EVENTS);
  });

  it("gives every documented event a payload shape and (for client events) a description", async () => {
    const { clientToServer, serverToClient } = await (await fetch(`${url}/protocol`)).json();
    for (const def of Object.values(clientToServer)) {
      expect(def).toHaveProperty("payload"); // may be null for no-payload events
      expect(typeof def.desc).toBe("string");
    }
    for (const def of Object.values(serverToClient)) {
      expect(def).toHaveProperty("payload");
    }
  });
});
