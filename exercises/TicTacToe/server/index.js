// Authoritative tic-tac-toe server: HTTP + socket.io wiring.
// Game rules live in engine.js; matchmaking & round flow live in matchmaking.js.

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const { createMatchmaker } = require("./matchmaking");

const PORT = process.env.PORT || 3001;

// Build (but do NOT start) the HTTP + socket.io server. Exported so tests can
// boot it on an ephemeral port; `npm start` calls it below and listens.
function createGameServer({ log = true } = {}) {
  const app = express();
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }, // dojo convenience: any client origin may connect
  });

  const matchmaker = createMatchmaker(io);

  io.on("connection", (socket) => {
    if (log) console.log(`+ connected: ${socket.id}`);

    socket.on("joinLobby", (payload) => {
      matchmaker.joinLobby(socket, payload && payload.name);
    });

    socket.on("leaveLobby", () => {
      matchmaker.leaveLobby(socket);
    });

    socket.on("invite", (payload) => {
      matchmaker.invite(socket, payload && payload.toId);
    });

    socket.on("respondInvite", (payload) => {
      matchmaker.respondInvite(socket, payload && payload.inviteId, !!(payload && payload.accept));
    });

    socket.on("makeMove", (payload) => {
      matchmaker.makeMove(socket, payload && payload.index);
    });

    socket.on("disconnect", () => {
      if (log) console.log(`- disconnected: ${socket.id}`);
      matchmaker.handleDisconnect(socket);
    });
  });

  return { app, server, io, matchmaker };
}

if (require.main === module) {
  const { server } = createGameServer();
  server.listen(PORT, () => {
    console.log(`Tic-Tac-Toe server listening on http://localhost:${PORT}`);
  });
}

module.exports = { createGameServer };
