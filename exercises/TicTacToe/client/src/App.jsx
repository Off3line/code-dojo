import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

// ---------------------------------------------------------------------------
// This is a DELIBERATELY MINIMAL skeleton. It only:
//   1. connects to the server,
//   2. lets you join the matchmaking queue ("Find match"),
//   3. dumps every event the server sends into a log.
//
// There is NO board, NO scoreboard, NO move buttons. That is YOUR job.
// Use the socket contract in the README to build the real game with React.
//
// Hints to get you going:
//   - listen for "gameState" and render `board` (a 9-cell array) as a 3x3 grid
//   - send a move with: socket.emit("makeMove", { index })  // index 0..8
//   - show the scoreboard from "gameState".scores and .round
//   - react to "roundOver" / "matchOver" / "opponentLeft"
// ---------------------------------------------------------------------------

const SERVER_URL = "http://localhost:3001";

// Every server -> client event from the contract. Logging them all is a handy
// way to *see* the protocol before you build UI for it.
const SERVER_EVENTS = [
  "queued",
  "matchFound",
  "gameState",
  "roundOver",
  "matchOver",
  "errorMsg",
  "opponentLeft",
];

export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState("Player");
  const [log, setLog] = useState([]);

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    const append = (event, payload) =>
      setLog((prev) => [{ event, payload, t: Date.now() }, ...prev].slice(0, 50));

    SERVER_EVENTS.forEach((event) => socket.on(event, (payload) => append(event, payload)));

    return () => socket.disconnect();
  }, []);

  const findMatch = () => socketRef.current?.emit("findMatch", { name });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "2rem auto" }}>
      <h1>Tic-Tac-Toe — starter client</h1>
      <p>
        Status: <strong>{connected ? "connected" : "disconnected"}</strong>
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <button onClick={findMatch} disabled={!connected}>
          Find match
        </button>
      </div>

      <h2>Server events</h2>
      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: 12,
          borderRadius: 8,
          maxHeight: 360,
          overflow: "auto",
          fontSize: 12,
        }}
      >
        {log.length === 0
          ? "// events will appear here…"
          : log.map((e, i) => `${e.event}: ${JSON.stringify(e.payload)}`).join("\n")}
      </pre>
    </div>
  );
}
