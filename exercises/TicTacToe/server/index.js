// Authoritative tic-tac-toe server: HTTP + socket.io wiring.
// Game rules live in engine.js; matchmaking & round flow live in matchmaking.js.

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const { createMatchmaker } = require("./matchmaking");

const PORT = process.env.PORT || 3001;

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }, // dojo convenience: any client origin may connect
});

const matchmaker = createMatchmaker(io);

io.on("connection", (socket) => {
  console.log(`+ connected: ${socket.id}`);

  socket.on("findMatch", (payload) => {
    matchmaker.findMatch(socket, payload && payload.name);
  });

  socket.on("makeMove", (payload) => {
    matchmaker.makeMove(socket, payload && payload.index);
  });

  socket.on("disconnect", () => {
    console.log(`- disconnected: ${socket.id}`);
    matchmaker.handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  console.log(`Tic-Tac-Toe server listening on http://localhost:${PORT}`);
});
