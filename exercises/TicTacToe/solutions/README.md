# Reference Solution

A complete, working React client for the Tic-Tac-Toe kata. This is the picture of
"done" — use it to sanity-check the server and to compare against participant work.
**Don't show it to participants before the session.**

## One-command launch (server + two players)

```bash
cd solutions
npm install          # also installs the server and client deps (postinstall)
npm start            # runs the server + two clients at once
```

This starts three processes:

- the **server** on `http://localhost:3001`
- **player A** on `http://localhost:5173`
- **player B** on `http://localhost:5174`

Open both client URLs in two browser windows, click **Join lobby** in each, then
**Challenge** the other player from one window and **Accept** the popup in the other.
Play a full best-of-three. Press `Ctrl+C` once to stop everything.

## Running pieces manually

If you'd rather start things yourself:

```bash
# terminal 1 — server
cd ../server && npm install && npm start

# terminal 2 — player A
cd client && npm install && npm run dev -- --port 5173

# terminal 3 — player B
cd client && npm run dev -- --port 5174
```

## What this client demonstrates

- Full lifecycle: menu → lobby → invite/accept → playing → round results → match result → lobby
- Lobby list of waiting players with click-to-challenge and an accept/decline popup
- Renders the board and scoreboard purely from server `gameState`
- Sends `makeMove` only on your turn / empty cells (the server is still the final judge)
- Highlights the winning line on `roundOver`, shows draw/replay messaging
- Handles `opponentLeft` by returning to the menu

It lives in `solutions/client/` and is independent from the starter in `../client/`.
