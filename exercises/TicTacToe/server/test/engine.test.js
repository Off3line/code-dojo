import { describe, it, expect } from "vitest";
import {
  createBoard,
  isValidMove,
  applyMove,
  checkResult,
  recordRound,
  isMatchOver,
} from "../engine.js";

describe("createBoard", () => {
  it("is 9 empty cells", () => {
    expect(createBoard()).toEqual(Array(9).fill(null));
  });
});

describe("checkResult", () => {
  it("detects a row win", () => {
    const board = ["X", "X", "X", null, null, null, null, null, null];
    expect(checkResult(board)).toEqual({ winner: "X", line: [0, 1, 2] });
  });

  it("detects a column win", () => {
    const board = ["O", null, null, "O", null, null, "O", null, null];
    expect(checkResult(board)).toEqual({ winner: "O", line: [0, 3, 6] });
  });

  it("detects a diagonal win", () => {
    const board = ["X", null, null, null, "X", null, null, null, "X"];
    expect(checkResult(board)).toEqual({ winner: "X", line: [0, 4, 8] });
  });

  it("detects a draw on a full board", () => {
    const board = ["X", "O", "X", "X", "O", "O", "O", "X", "X"];
    expect(checkResult(board)).toEqual({ winner: "draw", line: null });
  });

  it("reports no result while playable", () => {
    const board = ["X", null, null, null, "O", null, null, null, null];
    expect(checkResult(board)).toEqual({ winner: null, line: null });
  });
});

describe("applyMove", () => {
  it("places a symbol without mutating the input", () => {
    const board = createBoard();
    const next = applyMove(board, 4, "X");
    expect(next[4]).toBe("X");
    expect(board[4]).toBe(null);
  });
});

describe("isValidMove", () => {
  const game = {
    status: "in_progress",
    board: ["X", null, null, null, null, null, null, null, null],
    currentTurn: "O",
    players: { X: "sx", O: "so" },
  };

  it("accepts the current player's move on an empty cell", () => {
    expect(isValidMove(game, "so", 1)).toBe(true);
  });

  it("rejects an out-of-turn move", () => {
    expect(isValidMove(game, "sx", 1)).toBe(false);
  });

  it("rejects an occupied cell", () => {
    expect(isValidMove(game, "so", 0)).toBe(false);
  });

  it("rejects out-of-range indices", () => {
    expect(isValidMove(game, "so", 9)).toBe(false);
    expect(isValidMove(game, "so", -1)).toBe(false);
  });

  it("rejects moves once the game is finished", () => {
    expect(isValidMove({ ...game, status: "finished" }, "so", 1)).toBe(false);
  });
});

describe("recordRound / isMatchOver (best-of-three)", () => {
  it("increments the round winner only", () => {
    expect(recordRound({ X: 0, O: 0 }, "X")).toEqual({ X: 1, O: 0 });
  });

  it("leaves scores unchanged on a draw", () => {
    expect(recordRound({ X: 1, O: 0 }, "draw")).toEqual({ X: 1, O: 0 });
  });

  it("declares the match winner at 2 wins", () => {
    expect(isMatchOver({ X: 2, O: 1 }, 2)).toBe("X");
    expect(isMatchOver({ X: 0, O: 2 }, 2)).toBe("O");
  });

  it("returns null before anyone reaches 2 wins", () => {
    expect(isMatchOver({ X: 1, O: 1 }, 2)).toBe(null);
  });
});
