// UI CONTRACT TESTS
// ---------------------------------------------------------------------------
// These drive the UI you build. They will FAIL on the bare skeleton and turn
// green as you implement the lobby list, the invite popup, and the board.
//
// To let these tests find your elements, expose this MINIMAL set of hooks
// (style them however you like):
//   - a button whose text is "Join lobby", and a text input for the name
//   - each invitable lobby player: data-testid="invite-<playerId>"
//   - while an invitation is shown: data-testid="invite-accept" / "invite-decline"
//   - board cells: data-testid="cell-0" … "cell-8"
//   - your symbol somewhere: data-testid="my-symbol"  (renders "X" or "O")

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createMockSocket } from "./mockSocket";

const h = vi.hoisted(() => ({ mock: null }));
vi.mock("socket.io-client", () => ({ io: () => h.mock.socket }));

import App from "../src/App.jsx";

// The mock socket's own id; the lobby must hide this player from its own list.
const ME = "me-1";

beforeEach(() => {
  h.mock = createMockSocket();
});

// Fire a server -> client event and let React flush any state updates.
const fire = (event, payload) => act(() => h.mock.server(event, payload));

/** Render, connect, and join the lobby. */
function enterLobby() {
  render(<App />);
  fire("connect");
  fireEvent.click(screen.getByRole("button", { name: /join lobby/i }));
}

/** Render and drive into an in-progress game as player X, your turn. */
function enterGame(board = Array(9).fill(null), currentTurn = "X") {
  render(<App />);
  fire("connect");
  fire("matchFound", {
    gameId: "g1",
    symbol: "X",
    opponent: "Bob",
    bestOf: 3,
    scores: { X: 0, O: 0 },
    round: 1,
    yourTurn: currentTurn === "X",
  });
  fire("gameState", {
    board,
    currentTurn,
    status: "in_progress",
    round: 1,
    scores: { X: 0, O: 0 },
  });
}

describe("lobby", () => {
  it("shows other players (not yourself) and invites on click", () => {
    enterLobby();
    fire("lobby", {
      players: [
        { id: ME, name: "Me" },
        { id: "bob-1", name: "Bob" },
      ],
    });

    // your own entry must not be invitable
    expect(screen.queryByTestId(`invite-${ME}`)).not.toBeInTheDocument();

    const inviteBob = screen.getByTestId("invite-bob-1");
    fireEvent.click(inviteBob);

    const invites = h.mock.emittedEvents("invite");
    expect(invites).toContainEqual({ event: "invite", payload: { toId: "bob-1" } });
  });
});

describe("invitations", () => {
  it("accepting an invitation emits respondInvite with accept:true", () => {
    enterLobby();
    fire("inviteReceived", { inviteId: "42", from: { id: "bob-1", name: "Bob" } });

    fireEvent.click(screen.getByTestId("invite-accept"));

    expect(h.mock.emittedEvents("respondInvite")).toContainEqual({
      event: "respondInvite",
      payload: { inviteId: "42", accept: true },
    });
  });

  it("declining an invitation emits respondInvite with accept:false", () => {
    enterLobby();
    fire("inviteReceived", { inviteId: "42", from: { id: "bob-1", name: "Bob" } });

    fireEvent.click(screen.getByTestId("invite-decline"));

    expect(h.mock.emittedEvents("respondInvite")).toContainEqual({
      event: "respondInvite",
      payload: { inviteId: "42", accept: false },
    });
  });
});

describe("board", () => {
  it("renders your symbol and 9 cells from gameState", () => {
    enterGame(["X", "O", null, null, null, null, null, null, null]);

    expect(screen.getByTestId("my-symbol")).toHaveTextContent("X");
    for (let i = 0; i < 9; i++) {
      expect(screen.getByTestId(`cell-${i}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("cell-0")).toHaveTextContent("X");
    expect(screen.getByTestId("cell-1")).toHaveTextContent("O");
  });

  it("clicking an empty cell on your turn emits makeMove", () => {
    enterGame(Array(9).fill(null), "X"); // your turn
    fireEvent.click(screen.getByTestId("cell-4"));

    expect(h.mock.emittedEvents("makeMove")).toContainEqual({
      event: "makeMove",
      payload: { index: 4 },
    });
  });

  it("does not emit makeMove when it is not your turn", () => {
    enterGame(Array(9).fill(null), "O"); // opponent's turn
    fireEvent.click(screen.getByTestId("cell-4"));
    expect(h.mock.emittedEvents("makeMove")).toHaveLength(0);
  });

  it("does not emit makeMove for an occupied cell", () => {
    enterGame(["X", null, null, null, null, null, null, null, null], "X");
    fireEvent.click(screen.getByTestId("cell-0")); // already taken
    expect(h.mock.emittedEvents("makeMove")).toHaveLength(0);
  });
});
