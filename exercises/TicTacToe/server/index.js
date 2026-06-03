// Authoritative tic-tac-toe server: HTTP + socket.io wiring.
// Game rules live in engine.js; matchmaking & round flow live in matchmaking.js.

const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const { createMatchmaker } = require("./matchmaking");
const { PROTOCOL } = require("./protocol");

const PORT = process.env.PORT || 3001;
// Bind address. 0.0.0.0 = listen on all interfaces (required inside a container
// so connections from outside reach the server). Override with HOST if needed.
const HOST = process.env.HOST || "0.0.0.0";

// Build (but do NOT start) the HTTP + socket.io server. Exported so tests can
// boot it on an ephemeral port; `npm start` calls it below and listens.
function createGameServer({ log = true } = {}) {
  const app = express();
  // Allow these helper routes to be fetched from any origin (e.g. a dev client).
  app.use(["/health", "/protocol"], (_req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    next();
  });
  app.get("/health", (_req, res) => res.json({ ok: true }));
  // Self-describing contract: open in a browser or `curl` it to see exactly
  // what the server accepts and emits. Pretty-printed for human reading.
  app.get("/protocol", (_req, res) => {
    res.type("application/json").send(JSON.stringify(PROTOCOL, null, 2));
  });

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
  server.listen(PORT, HOST, () => {
    console.log(`Tic-Tac-Toe server listening on http://${HOST}:${PORT}`);
    console.log(`Contract reference: http://${HOST}:${PORT}/protocol`);
  });
}

module.exports = { createGameServer };
