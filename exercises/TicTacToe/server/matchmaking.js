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
  /** @type {{ socketId: string, name: string }[]} */
  const queue = [];
  /** @type {Map<string, object>} gameId -> Game */
  const games = new Map();
  /** @type {Map<string, string>} socketId -> gameId */
  const socketToGame = new Map();

  let nextGameId = 1;

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

  /** Add a player to the queue; pair the first two waiting players. */
  function findMatch(socket, name) {
    // Ignore players already in a game or already queued.
    if (socketToGame.has(socket.id)) return;
    if (queue.some((p) => p.socketId === socket.id)) return;

    queue.push({ socketId: socket.id, name: String(name || "Anonymous") });
    socket.emit("queued", { position: queue.length });

    if (queue.length >= 2) {
      const first = queue.shift();
      const second = queue.shift();
      startGame(first, second);
    }
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

  /** A socket dropped: abort its match (no winner) and notify the opponent. */
  function handleDisconnect(socket) {
    // Remove from queue if waiting.
    const qi = queue.findIndex((p) => p.socketId === socket.id);
    if (qi !== -1) queue.splice(qi, 1);

    const gameId = socketToGame.get(socket.id);
    const game = gameId && games.get(gameId);
    if (!game) return;

    const opponentSymbol = game.players.X === socket.id ? "O" : "X";
    const opponentId = game.players[opponentSymbol];
    io.to(opponentId).emit("opponentLeft");
    cleanup(game);
  }

  return {
    findMatch,
    makeMove,
    handleDisconnect,
    // exposed for tests / inspection
    _games: games,
    _queue: queue,
  };
}

module.exports = { createMatchmaker, BEST_OF, WINS_NEEDED };
