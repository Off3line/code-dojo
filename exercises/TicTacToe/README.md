# Multiplayer Tic-Tac-Toe Kata (React + socket.io)

## Prerequisites

Before starting, make sure you have:

- Node.js 18+ and npm
- A terminal / command line
- A modern browser
- A code editor of your choice
- Git for version control and to submit your results at the end

## Setup Instructions

The exercise has two parts: a **server** (already built for you) and a **client**
(the part you build). Open two terminals.

### 1. Start the server (provided — do not change it)

```bash
cd server
npm install
npm start
```

The server listens on `http://localhost:3001`. You can run its tests with:

```bash
npm test
```

### 2. Run the starter client

```bash
cd client
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5173`). To play against yourself,
open it in **two browser tabs** and click **Find match** in each.

---

## Overview

This session is a **coding dojo** focused on **React fundamentals** — component state,
effects, rendering from data, and reacting to a live event stream.

You are given a complete, **authoritative game server**. It owns all the rules: it
validates every move, tracks whose turn it is, detects wins and draws, runs the
best-of-three match, and tracks the score. **It cannot be cheated** — your client only
sends intentions (`findMatch`, `makeMove`) and renders whatever state the server reports.

Your job is to build the **React client**: the menu, the board, the scoreboard, and the
logic that turns clicks into `makeMove` events and server events into UI.

A tiny starter client is provided — it only connects and logs raw events. **It has no
board and no move buttons on purpose.** Grow it using the contract below
(spec-driven development).

The exercise is intentionally incremental. You are **not expected to finish everything**.

---

## How the game works

1. A player clicks **Find match** → the client emits `findMatch`. The server queues them.
2. The server pairs the **first two** waiting players into a **match** and assigns symbols
   (first to arrive is **X**).
3. A **match is best-of-three rounds**. Each round is one tic-tac-toe board.
   **First player to win 2 rounds wins the match.**
4. A **drawn round is replayed** (nobody scores, the round number stays the same).
5. The **starting player alternates** each round (round 1 = X starts).
6. When someone reaches 2 wins, the server announces the result and ends the match.
   Both players return to the menu and can **Find match** again.
7. If a player disconnects mid-match, the match is **aborted with no winner** and the
   opponent is told to return to the menu.

---

## The socket contract (your spec)

Connect to `http://localhost:3001` with `socket.io-client`. Board cells are indices
**0–8**, left-to-right, top-to-bottom:

```
 0 | 1 | 2
-----------
 3 | 4 | 5
-----------
 6 | 7 | 8
```

### Client → Server (what you send)

| Event       | Payload            | Meaning                          |
|-------------|--------------------|----------------------------------|
| `findMatch` | `{ name }`         | Enter the matchmaking queue      |
| `makeMove`  | `{ index }` (0–8)  | Place your mark in a cell        |

There is **no leave event**: you exit a match only by finishing it or disconnecting.

### Server → Client (what you listen for)

| Event          | Payload | Meaning |
|----------------|---------|---------|
| `queued`       | `{ position }` | You're waiting for an opponent |
| `matchFound`   | `{ gameId, symbol, opponent, bestOf, scores, round, yourTurn }` | You've been paired. `symbol` is `"X"` or `"O"`. |
| `gameState`    | `{ board, currentTurn, status, round, scores }` | Sent after every move. `board` is a 9-cell array of `null \| "X" \| "O"`. |
| `roundOver`    | `{ winner, line, scores, round, nextRound }` | A round ended (`winner` is `"X"`, `"O"`, or `"draw"`). `line` is the 3 winning cells, or `null`. A draw has `nextRound === round`. A fresh `gameState` follows. |
| `matchOver`    | `{ matchWinner, scores }` | The match is decided. The server then ends the game. |
| `errorMsg`     | `{ message }` | Your move was rejected (out of turn, occupied cell, etc.). |
| `opponentLeft` | _(none)_ | Your opponent disconnected; the match was aborted. Return to the menu. |

`scores` is always `{ X: <round wins>, O: <round wins> }`. `round` is 1-based.

### A minimal client recipe

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3001");

socket.emit("findMatch", { name: "Alice" });

socket.on("gameState", ({ board, currentTurn, round, scores }) => {
  // render the 3x3 board + scoreboard
});

// when a player clicks an empty cell `i`:
socket.emit("makeMove", { index: i });
```

---

## The Goal

This kata is **not** about game AI or clever algorithms — the server already enforces the
rules. The real goals are to:

- Model UI from server state (board, turn, score, round) rather than local guesses
- Use React state and effects to subscribe to a live event stream
- Handle the full lifecycle: menu → queued → playing → round results → match result → menu
- Show useful feedback (whose turn, illegal-move errors, opponent left)

Suggested increments:

1. Show connection status and a **Find match** button (the starter already does this).
2. Render the board from `gameState.board`.
3. Send `makeMove` when you click an empty cell; only allow it when it's your turn.
4. Add the scoreboard: current round and `scores`.
5. Handle `roundOver`, `matchOver`, and `opponentLeft` with clear UI transitions.
6. Polish: highlight the winning `line`, disable the board between rounds, etc.

If your UI faithfully reflects the server's state and a full best-of-three plays cleanly,
you are succeeding.

---

## About the server

The server is the source of truth. Its rules live in `server/engine.js` (pure functions,
unit-tested) and `server/matchmaking.js` (queue + round/match flow). You are encouraged to
**read** it to understand the contract, but you should not need to modify it.

If the UI "works" but disagrees with the server (e.g. lets you move out of turn), the UI is
wrong — the server will reject it with `errorMsg`.

## Use of AI Tools

The use of AI tools (ChatGPT, Copilot, etc.) is explicitly encouraged, with clear intent.

✅ Appropriate uses

- Explaining React, JSX, hooks, or socket.io concepts
- Explaining error messages or unexpected behavior
- Clarifying how an event in the contract behaves
- Asking why something renders the way it does

🚫 Not appropriate

- Asking AI to implement the whole client for you
- Copy-pasting a full finished app
- Letting AI decide your component design end to end

Rule of thumb: use AI like a senior colleague who explains things, not like someone who
writes the code for you.

### Working Agreement

- Work in pairs
- Build in small, visible increments
- Get one event rendering before moving to the next
- Prefer clarity over cleverness
- You do not need to finish all steps to succeed in this exercise
