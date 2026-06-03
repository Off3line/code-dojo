// PRE-FLIGHT READINESS TESTS
// ---------------------------------------------------------------------------
// These confirm your client is "wired up" before you connect to the real
// server: it mounts, it survives every server event, and it joins the lobby.
//
// These should PASS on the starter skeleton already. If one goes red, you've
// removed some necessary plumbing. They make NO assumptions about your layout.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { createMockSocket } from "./mockSocket";

// Share one mock socket between the (hoisted) module mock and the tests.
const h = vi.hoisted(() => ({ mock: null }));
vi.mock("socket.io-client", () => ({ io: () => h.mock.socket }));

import App from "../src/App.jsx";

// Fire a server -> client event and let React flush any state updates.
const fire = (event, payload) => act(() => h.mock.server(event, payload));

// Every server -> client event in the contract. Firing each must not crash.
const SERVER_EVENTS = [
  ["lobby", { players: [] }],
  ["inviteReceived", { inviteId: "1", from: { id: "x", name: "Bob" } }],
  ["inviteSent", { inviteId: "1", to: { id: "x", name: "Bob" } }],
  ["inviteDeclined", { inviteId: "1", by: { id: "x", name: "Bob" } }],
  ["inviteCancelled", { inviteId: "1", reason: "left" }],
  ["matchFound", { gameId: "g1", symbol: "X", opponent: "Bob", bestOf: 3, scores: { X: 0, O: 0 }, round: 1, yourTurn: true }],
  ["gameState", { board: Array(9).fill(null), currentTurn: "X", status: "in_progress", round: 1, scores: { X: 0, O: 0 } }],
  ["roundOver", { winner: "X", line: [0, 1, 2], board: Array(9).fill(null), scores: { X: 1, O: 0 }, round: 1, nextRound: 2 }],
  ["matchOver", { matchWinner: "X", scores: { X: 2, O: 0 } }],
  ["errorMsg", { message: "nope" }],
  ["opponentLeft", undefined],
];

beforeEach(() => {
  h.mock = createMockSocket();
});

describe("pre-flight readiness", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });

  it("survives every server event without throwing", () => {
    render(<App />);
    fire("connect");
    for (const [event, payload] of SERVER_EVENTS) {
      expect(() => fire(event, payload)).not.toThrow();
    }
  });

  it("joins the lobby with a name when the user clicks Join lobby", () => {
    render(<App />);
    fire("connect");

    // Accessible-name lookup — works regardless of how the button is styled.
    const joinButton = screen.getByRole("button", { name: /join lobby/i });
    fireEvent.click(joinButton);

    const joins = h.mock.emittedEvents("joinLobby");
    expect(joins.length).toBeGreaterThanOrEqual(1);
    expect(joins[0].payload).toHaveProperty("name");
    expect(typeof joins[0].payload.name).toBe("string");
  });
});
