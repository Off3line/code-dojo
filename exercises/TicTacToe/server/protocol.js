// Single source of truth for the socket contract.
//
// Served as JSON at GET /protocol so participants can see exactly what the
// server accepts and emits — open it in a browser or `curl` it. Keep this in
// sync with the handlers in matchmaking.js (a test enforces the event sets).

const PROTOCOL = {
  transport: "socket.io",
  url: "http://<server-host>:3001",
  boardIndices: "cells are 0-8, left-to-right, top-to-bottom",
  match: { format: "best-of-three rounds", winsNeeded: 2, drawReplaysRound: true },

  // What YOU (the client) send to the server.
  clientToServer: {
    joinLobby: {
      payload: { name: "string" },
      desc: "Enter the lobby (the list of waiting players).",
    },
    leaveLobby: {
      payload: null,
      desc: "Leave the lobby and return to the menu.",
    },
    invite: {
      payload: { toId: "string (another waiting player's socket id)" },
      desc: "Invite a waiting player to a match.",
    },
    respondInvite: {
      payload: { inviteId: "string", accept: "boolean" },
      desc: "Accept (true) or decline (false) an invitation you received.",
    },
    makeMove: {
      payload: { index: "number 0-8" },
      desc: "Place your mark in a cell (only valid on your turn, empty cell).",
    },
  },

  // What the server sends to YOU. Subscribe with socket.on(event, payload => ...).
  serverToClient: {
    lobby: {
      payload: { players: "[{ id, name }]" },
      desc: "Current waiting players. Sent whenever the list changes. Hide your own id (socket.id).",
    },
    inviteReceived: {
      payload: { inviteId: "string", from: "{ id, name }" },
      desc: "Someone invited you — show an accept/decline prompt.",
    },
    inviteSent: {
      payload: { inviteId: "string", to: "{ id, name }" },
      desc: "Confirmation that your invitation was delivered.",
    },
    inviteDeclined: {
      payload: { inviteId: "string", by: "{ id, name }" },
      desc: "A player declined your invitation.",
    },
    inviteCancelled: {
      payload: { inviteId: "string", reason: "left | matched | unavailable" },
      desc: "An invitation is no longer valid.",
    },
    matchFound: {
      payload: {
        gameId: "string",
        symbol: "X | O",
        opponent: "string (name)",
        bestOf: "number",
        scores: "{ X, O }",
        round: "number",
        yourTurn: "boolean",
      },
      desc: "A match started. You play `symbol`.",
    },
    gameState: {
      payload: {
        board: "(null | X | O)[9]",
        currentTurn: "X | O",
        status: "in_progress | finished",
        round: "number",
        scores: "{ X, O }",
      },
      desc: "Sent after every move. Render the board and scoreboard from this.",
    },
    roundOver: {
      payload: {
        winner: "X | O | draw",
        line: "[a,b,c] winning cells, or null",
        board: "(null | X | O)[9] final board of the round",
        scores: "{ X, O }",
        round: "number",
        nextRound: "number (=== round when a draw replays)",
      },
      desc: "A round ended. Unless the match is over, a fresh gameState follows.",
    },
    matchOver: {
      payload: { matchWinner: "X | O", scores: "{ X, O }" },
      desc: "Best-of-three decided. The server then ends the game; return to the lobby.",
    },
    errorMsg: {
      payload: { message: "string" },
      desc: "Your last action was rejected (e.g. illegal move).",
    },
    opponentLeft: {
      payload: null,
      desc: "Your opponent disconnected; the match was aborted. Return to the menu.",
    },
  },
};

module.exports = { PROTOCOL };
