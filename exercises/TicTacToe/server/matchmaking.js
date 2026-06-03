// Matchmaking queue + game registry + best-of-three round/match flow.
//
// This module is socket-aware only through a small `emit` interface that is
// injected in, so it stays easy to reason about and (mostly) testable:
//   io  - used to emit to a whole room          io.to(room).emit(event, payload)
//   to(socketId).emit(event, payload)           single-socket emits
//
// In index.js we pass the real socket.io server in.

const {
  createBoard,
  isValidMove,
  applyMove,
  checkResult,
  recordRound,
  isMatchOver,
} = require("./engine");

const BEST_OF = 3;
const WINS_NEEDED = 2;

  function roomOf(gameId) {
  return `game:${gameId}`;
}

function createMatchmaker(io) {
  /** @type {Map<string, { name: string }>} socketId -> lobby entry (waiting players) */
  const lobby = new Map();
  /** @type {Map<string, { from, fromName, to, toName }>} inviteId -> invitation */
  const invites = new Map();
  /** @type {Map<string, object>} gameId -> Game */
  const games = new Map();
  /** @type {Map<string, string>} socketId -> gameId */
  const socketToGame = new Map();

  const LOBBY_ROOM = "lobby";
  let nextGameId = 1;
  let nextInviteId = 1;

  /** Snapshot a game into the public `gameState` payload shape. */
  function gameStatePayload(game) {
    return {
      board: game.board,
      currentTurn: game.currentTurn,
      status: game.status,
      round: game.round,
      scores: { ...game.scores },
    };
  }

  function broadcastState(game) {
    io.to(roomOf(game.id)).emit("gameState", gameStatePayload(game));
  }

  /** Send the current list of waiting players to everyone in the lobby. */
  function broadcastLobby() {
    const players = [...lobby.entries()].map(([id, entry]) => ({ id, name: entry.name }));
    io.to(LOBBY_ROOM).emit("lobby", { players });
    console.log(
      `[lobby] ${players.length} waiting: ${players.map((p) => p.name).join(", ") || "(none)"}`
    );
  }

  /** Cancel every pending invite that involves `socketId`, notifying the other party. */
  function cancelInvitesInvolving(socketId, reason) {
    for (const [inviteId, inv] of invites) {
      if (inv.from !== socketId && inv.to !== socketId) continue;
      const otherId = inv.from === socketId ? inv.to : inv.from;
      io.to(otherId).emit("inviteCancelled", { inviteId, reason });
      invites.delete(inviteId);
    }
  }

  /** Remove a player from the lobby (and the lobby room). */
  function removeFromLobby(socketId) {
    if (!lobby.delete(socketId)) return;
    const s = io.sockets.sockets.get(socketId);
    if (s) s.leave(LOBBY_ROOM);
  }

  /** Enter the waiting list. */
  function joinLobby(socket, name) {
    if (socketToGame.has(socket.id)) return; // already in a game
    lobby.set(socket.id, { name: String(name || "Anonymous") });
    socket.join(LOBBY_ROOM);
    broadcastLobby();
  }

  /** Leave the waiting list (cancels any invites to/from this player). */
  function leaveLobby(socket) {
    removeFromLobby(socket.id);
    cancelInvitesInvolving(socket.id, "left");
    broadcastLobby();
  }

  /** Invite another waiting player to a match. */
  function invite(socket, toId) {
    if (!lobby.has(socket.id)) {
      socket.emit("errorMsg", { message: "Join the lobby before inviting." });
      return;
    }
    if (toId === socket.id || !lobby.has(toId)) {
      socket.emit("errorMsg", { message: "That player is no longer available." });
      return;
    }
    // Don't stack duplicate invites between the same two players (same direction).
    for (const inv of invites.values()) {
      if (inv.from === socket.id && inv.to === toId) return;
    }

    const inviteId = String(nextInviteId++);
    const fromName = lobby.get(socket.id).name;
    const toName = lobby.get(toId).name;
    invites.set(inviteId, { from: socket.id, fromName, to: toId, toName });

    io.to(toId).emit("inviteReceived", { inviteId, from: { id: socket.id, name: fromName } });
    socket.emit("inviteSent", { inviteId, to: { id: toId, name: toName } });
  }

  /** Accept or decline a received invitation. */
  function respondInvite(socket, inviteId, accept) {
    const inv = invites.get(inviteId);
    if (!inv || inv.to !== socket.id) {
      socket.emit("errorMsg", { message: "That invitation is no longer available." });
      return;
    }
    invites.delete(inviteId);

    if (!accept) {
      io.to(inv.from).emit("inviteDeclined", {
        inviteId,
        by: { id: inv.to, name: inv.toName },
      });
      return;
    }

    // Accepted — both players must still be waiting.
    if (!lobby.has(inv.from) || !lobby.has(inv.to)) {
      socket.emit("errorMsg", { message: "That player is no longer available." });
      io.to(inv.from).emit("inviteCancelled", { inviteId, reason: "unavailable" });
      return;
    }

    const inviter = { socketId: inv.from, name: inv.fromName };
    const invitee = { socketId: inv.to, name: inv.toName };

    // Pull both out of the lobby and cancel their other pending invites.
    removeFromLobby(inviter.socketId);
    removeFromLobby(invitee.socketId);
    cancelInvitesInvolving(inviter.socketId, "matched");
    cancelInvitesInvolving(invitee.socketId, "matched");

    // The inviter plays X (they started it); the accepter plays O.
    startGame(inviter, invitee);
    broadcastLobby();
  }

  function startGame(playerX, playerO) {
    const id = String(nextGameId++);
    const game = {
      id,
      players: { X: playerX.socketId, O: playerO.socketId },
      names: { X: playerX.name, O: playerO.name },
      board: createBoard(),
      currentTurn: "X",
      round: 1,
      scores: { X: 0, O: 0 },
      bestOf: BEST_OF,
      winsNeeded: WINS_NEEDED,
      startingSymbol: "X",
      status: "in_progress",
      matchWinner: null,
    };

    games.set(id, game);
    socketToGame.set(playerX.socketId, id);
    socketToGame.set(playerO.socketId, id);

    const sx = io.sockets.sockets.get(playerX.socketId);
    const so = io.sockets.sockets.get(playerO.socketId);
    if (sx) sx.join(roomOf(id));
    if (so) so.join(roomOf(id));

    emitMatchFound(game, "X", playerX.socketId, playerO.name);
    emitMatchFound(game, "O", playerO.socketId, playerX.name);
    broadcastState(game);
  }

  function emitMatchFound(game, symbol, socketId, opponentName) {
    io.to(socketId).emit("matchFound", {
      gameId: game.id,
      symbol,
      opponent: opponentName,
      bestOf: game.bestOf,
      scores: { ...game.scores },
      round: game.round,
      yourTurn: game.currentTurn === symbol,
    });
  }

  /** Begin the next round: fresh board, alternate who starts. */
  function startNextRound(game) {
    game.round += 1;
    game.startingSymbol = game.startingSymbol === "X" ? "O" : "X";
    game.currentTurn = game.startingSymbol;
    game.board = createBoard();
  }

  /** Replay the current round after a draw: fresh board, same starter rotation. */
  function replayRound(game) {
    game.startingSymbol = game.startingSymbol === "X" ? "O" : "X";
    game.currentTurn = game.startingSymbol;
    game.board = createBoard();
  }

  function endMatch(game) {
    game.status = "finished";
    const room = roomOf(game.id);
    io.to(room).emit("matchOver", {
      matchWinner: game.matchWinner,
      scores: { ...game.scores },
    });
    cleanup(game);
  }

  /** Remove a game and detach its sockets from the room and registries. */
  function cleanup(game) {
    const room = roomOf(game.id);
    for (const symbol of ["X", "O"]) {
      const sid = game.players[symbol];
      const s = io.sockets.sockets.get(sid);
      if (s) s.leave(room);
      socketToGame.delete(sid);
    }
    games.delete(game.id);
  }

  function makeMove(socket, index) {
    const gameId = socketToGame.get(socket.id);
    const game = gameId && games.get(gameId);
    if (!game) {
      socket.emit("errorMsg", { message: "You are not in an active game." });
      return;
    }
    if (!isValidMove(game, socket.id, index)) {
      socket.emit("errorMsg", { message: "Illegal move." });
      return;
    }

    const symbol = game.players.X === socket.id ? "X" : "O";
    game.board = applyMove(game.board, index, symbol);

    const { winner, line } = checkResult(game.board);

    if (winner === null) {
      // Round still going — hand turn to the other player.
      game.currentTurn = game.currentTurn === "X" ? "O" : "X";
      broadcastState(game);
      return;
    }

    if (winner === "draw") {
      io.to(roomOf(game.id)).emit("roundOver", {
        winner: "draw",
        line: null,
        board: game.board, // the final (full) board of this round
        scores: { ...game.scores },
        round: game.round,
        nextRound: game.round, // replays the same round
      });
      replayRound(game);
      broadcastState(game);
      return;
    }

    // A player won the round.
    game.scores = recordRound(game.scores, winner);
    const matchWinner = isMatchOver(game.scores, game.winsNeeded);

    io.to(roomOf(game.id)).emit("roundOver", {
      winner,
      line,
      board: game.board, // the final board, including the winning move
      scores: { ...game.scores },
      round: game.round,
      nextRound: matchWinner ? game.round : game.round + 1,
    });

    if (matchWinner) {
      game.matchWinner = matchWinner;
      endMatch(game);
      return;
    }

    startNextRound(game);
    broadcastState(game);
  }

  /** A socket dropped: leave the lobby, cancel invites, and abort any match. */
  function handleDisconnect(socket) {
    // Remove from the lobby and tear down its invitations.
    const wasWaiting = lobby.has(socket.id);
    removeFromLobby(socket.id);
    cancelInvitesInvolving(socket.id, "left");
    if (wasWaiting) broadcastLobby();

    const gameId = socketToGame.get(socket.id);
    const game = gameId && games.get(gameId);
    if (!game) return;

    const opponentSymbol = game.players.X === socket.id ? "O" : "X";
    const opponentId = game.players[opponentSymbol];
    io.to(opponentId).emit("opponentLeft");
    cleanup(game);
  }

  return {
    joinLobby,
    leaveLobby,
    invite,
    respondInvite,
    makeMove,
    handleDisconnect,
    // exposed for tests / inspection
    _games: games,
    _lobby: lobby,
    _invites: invites,
  };
}

module.exports = { createMatchmaker, BEST_OF, WINS_NEEDED };
