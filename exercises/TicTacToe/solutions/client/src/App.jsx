import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";
const EMPTY_BOARD = Array(9).fill(null);

// Phases of the UI lifecycle:
//   menu     -> enter name, click Join lobby
//   lobby    -> see waiting players, invite someone / accept an invite
//   playing  -> a match is in progress
//   finished -> match decided; offer a way back to the lobby
export default function App() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);

  const [name, setName] = useState("Player");
  const [phase, setPhase] = useState("menu");
  const [notice, setNotice] = useState("");

  // lobby state
  const [players, setPlayers] = useState([]);
  const [incoming, setIncoming] = useState([]); // [{ inviteId, from: { id, name } }]
  const [sentTo, setSentTo] = useState(null); // { inviteId, name } of an outstanding invite

  // match state
  const [symbol, setSymbol] = useState(null);
  const [opponent, setOpponent] = useState("");
  const [board, setBoard] = useState(EMPTY_BOARD);
  const [currentTurn, setCurrentTurn] = useState("X");
  const [round, setRound] = useState(1);
  const [scores, setScores] = useState({ X: 0, O: 0 });
  const [winLine, setWinLine] = useState(null);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setMyId(socket.id);
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("lobby", ({ players }) => setPlayers(players));

    socket.on("inviteReceived", (inv) => {
      setIncoming((prev) => [...prev.filter((i) => i.inviteId !== inv.inviteId), inv]);
    });

    socket.on("inviteSent", ({ inviteId, to }) => {
      setSentTo({ inviteId, name: to.name });
      setNotice(`Invitation sent to ${to.name}…`);
    });

    socket.on("inviteDeclined", ({ by }) => {
      setSentTo(null);
      setNotice(`${by.name} declined your invitation.`);
    });

    socket.on("inviteCancelled", ({ inviteId }) => {
      setIncoming((prev) => prev.filter((i) => i.inviteId !== inviteId));
      setSentTo((prev) => (prev?.inviteId === inviteId ? null : prev));
    });

    socket.on("matchFound", (p) => {
      setSymbol(p.symbol);
      setOpponent(p.opponent);
      setScores(p.scores);
      setRound(p.round);
      setBoard(EMPTY_BOARD);
      setWinLine(null);
      setError("");
      setBanner("");
      // leaving the lobby — clear its UI
      setIncoming([]);
      setSentTo(null);
      setPlayers([]);
      setPhase("playing");
    });

    socket.on("gameState", (s) => {
      setBoard(s.board);
      setCurrentTurn(s.currentTurn);
      setRound(s.round);
      setScores(s.scores);
      setWinLine(null);
      setError("");
    });

    socket.on("roundOver", (r) => {
      setBoard(r.board);
      setScores(r.scores);
      setWinLine(r.line);
      setBanner(
        r.winner === "draw"
          ? `Round ${r.round} was a draw — replaying.`
          : `${r.winner} won round ${r.round}!`
      );
    });

    socket.on("matchOver", (m) => {
      setScores(m.scores);
      setPhase("finished");
      setBanner(`${m.matchWinner} wins the match ${m.scores.X}–${m.scores.O}!`);
    });

    socket.on("opponentLeft", () => {
      setPhase("menu");
      setNotice("Your opponent left — the match was aborted.");
    });

    socket.on("errorMsg", (e) => setError(e.message));

    return () => socket.disconnect();
  }, []);

  const joinLobby = () => {
    setBanner("");
    setNotice("");
    setPhase("lobby");
    socketRef.current?.emit("joinLobby", { name });
  };

  const leaveLobby = () => {
    socketRef.current?.emit("leaveLobby");
    setPlayers([]);
    setIncoming([]);
    setSentTo(null);
    setPhase("menu");
  };

  const invite = (toId) => {
    setNotice("");
    socketRef.current?.emit("invite", { toId });
  };

  const respond = (inviteId, accept) => {
    socketRef.current?.emit("respondInvite", { inviteId, accept });
    setIncoming((prev) => prev.filter((i) => i.inviteId !== inviteId));
  };

  const play = (index) => socketRef.current?.emit("makeMove", { index });

  const myTurn = currentTurn === symbol && phase === "playing" && !winLine;
  const others = players.filter((p) => p.id !== myId);

  // ---- render -------------------------------------------------------------

  if (phase === "menu") {
    return (
      <div className="app">
        <h1>Tic-Tac-Toe</h1>
        <p className="status">{connected ? "Connected" : "Connecting…"}</p>
        {notice && <p className="banner">{notice}</p>}
        <div className="menu">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <button onClick={joinLobby} disabled={!connected}>
            Join lobby
          </button>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="app">
        <h1>Lobby</h1>
        <p className="status">Waiting as {name}. Click a player to challenge them.</p>
        {notice && <p className="banner">{notice}</p>}

        <ul className="lobby-list">
          {others.length === 0 && <li className="empty">No other players yet…</li>}
          {others.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button onClick={() => invite(p.id)} disabled={sentTo?.inviteId != null}>
                {sentTo && sentTo.name === p.name ? "Invited…" : "Challenge"}
              </button>
            </li>
          ))}
        </ul>

        <button className="ghost" onClick={leaveLobby}>
          Leave lobby
        </button>

        {incoming.map((inv) => (
          <div className="modal-backdrop" key={inv.inviteId}>
            <div className="modal">
              <p>
                <strong>{inv.from.name}</strong> challenges you to a match!
              </p>
              <div className="menu">
                <button onClick={() => respond(inv.inviteId, true)}>Accept</button>
                <button className="ghost" onClick={() => respond(inv.inviteId, false)}>
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // playing / finished
  return (
    <div className="app">
      <h1>Tic-Tac-Toe</h1>
      <p className="status">
        You are <strong>{symbol}</strong> vs {opponent || "opponent"}
      </p>

      <div className="scoreboard">
        <span className={symbol === "X" ? "me" : ""}>X {scores.X}</span>
        <span className="round">Round {round} · best of 3</span>
        <span className={symbol === "O" ? "me" : ""}>O {scores.O}</span>
      </div>

      <p className="banner">
        {phase === "finished"
          ? banner
          : banner || (myTurn ? "Your turn" : `${currentTurn}'s turn`)}
      </p>

      <div className="board">
        {board.map((cell, i) => {
          const isWin = winLine?.includes(i);
          return (
            <button
              key={i}
              className={`cell${cell ? " filled" : ""}${isWin ? " win" : ""}`}
              onClick={() => play(i)}
              disabled={!myTurn || cell !== null}
            >
              {cell && <span className={cell}>{cell}</span>}
            </button>
          );
        })}
      </div>

      <p className="error">{error}</p>

      {phase === "finished" && (
        <button onClick={joinLobby} disabled={!connected}>
          Back to lobby
        </button>
      )}
    </div>
  );
}
