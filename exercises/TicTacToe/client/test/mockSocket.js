import { vi } from "vitest";

// A fake socket.io-client used by the pre-flight tests so they run WITHOUT a
// real server. It records everything the client emits and lets a test push
// server -> client events in.
//
// It supports BOTH ways of listening so the tests don't dictate your style:
//   socket.on("gameState", cb)              // per-event
//   socket.onAny((event, payload) => ...)   // catch-all
//
// How the test files wire it up (vi.mock is hoisted, so we use vi.hoisted to
// share one mock instance between the module factory and the test):
//
//   const h = vi.hoisted(() => ({ mock: null }));
//   vi.mock("socket.io-client", () => ({ io: () => h.mock.socket }));
//   beforeEach(() => { h.mock = createMockSocket(); });
//
// Then in a test:
//   render(<App />);
//   h.mock.server("connect");                       // simulate connection
//   h.mock.server("lobby", { players: [...] });     // simulate a server event
//   expect(h.mock.emitted).toContainEqual({ event: "joinLobby", payload: { name: "Player" } });

export function createMockSocket() {
  const handlers = {}; // event -> [cb, ...]
  const anyHandlers = []; // onAny callbacks
  const emitted = []; // [{ event, payload }, ...]

  const socket = {
    id: "me-1",
    connected: true,
    on: vi.fn((event, cb) => {
      (handlers[event] ||= []).push(cb);
      return socket;
    }),
    off: vi.fn((event, cb) => {
      if (handlers[event]) handlers[event] = handlers[event].filter((h) => h !== cb);
      return socket;
    }),
    onAny: vi.fn((cb) => {
      anyHandlers.push(cb);
      return socket;
    }),
    emit: vi.fn((event, payload) => {
      emitted.push({ event, payload });
      return socket;
    }),
    disconnect: vi.fn(() => socket),
    connect: vi.fn(() => socket),
  };

  // Dispatch a server -> client event to every matching listener.
  function server(event, payload) {
    (handlers[event] || []).forEach((cb) => cb(payload));
    anyHandlers.forEach((cb) => cb(event, payload));
  }

  // Convenience: did the client emit this event (optionally matching payload)?
  function emittedEvents(name) {
    return emitted.filter((e) => e.event === name);
  }

  return { socket, server, emitted, emittedEvents, handlers };
}
