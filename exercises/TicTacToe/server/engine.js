// Pure tic-tac-toe rules. No sockets, no I/O — everything here is unit-testable.

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/** A fresh, empty board: 9 cells, all null. */
function createBoard() {
  return Array(9).fill(null);
}

/**
 * Is this move legal right now?
 * - the game must still be in progress
 * - the index must be a real, empty cell
 * - it must be this socket's turn
 */
function isValidMove(game, socketId, index) {
  if (!game || game.status !== "in_progress") return false;
  if (!Number.isInteger(index) || index < 0 || index > 8) return false;
  if (game.board[index] !== null) return false;
  return game.players[game.currentTurn] === socketId;
}

/** Return a NEW board with `symbol` placed at `index` (does not mutate input). */
function applyMove(board, index, symbol) {
  const next = board.slice();
  next[index] = symbol;
  return next;
}

/**
 * Evaluate a single board.
 * → { winner: "X" | "O", line: [a,b,c] } on a win
 * → { winner: "draw", line: null } when full with no winner
 * → { winner: null, line: null } when the round is still playable
 */
function checkResult(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

/** Return NEW scores with the round winner incremented (draws change nothing). */
function recordRound(scores, winner) {
  if (winner !== "X" && winner !== "O") return { ...scores };
  return { ...scores, [winner]: scores[winner] + 1 };
}

/** Has someone reached the required number of round wins? → "X" | "O" | null */
function isMatchOver(scores, winsNeeded) {
  if (scores.X >= winsNeeded) return "X";
  if (scores.O >= winsNeeded) return "O";
  return null;
}

module.exports = {
  WINNING_LINES,
  createBoard,
  isValidMove,
  applyMove,
  checkResult,
  recordRound,
  isMatchOver,
};
