/**
 * socket.js — Socket.IO singleton
 * Call init(httpServer) once in server.js, then use emit() anywhere in routes.
 */
const { Server } = require('socket.io');

let _io = null;

function init(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  _io.on('connection', socket => {
    console.log(`🔌  Socket connected: ${socket.id}`);
    socket.on('disconnect', () =>
      console.log(`🔌  Socket disconnected: ${socket.id}`)
    );
  });

  return _io;
}

/** Safely emit to all connected clients (no-op if io not yet init'd) */
function emit(event, data) {
  if (_io) _io.emit(event, data);
}

function getIo() { return _io; }

module.exports = { init, emit, getIo };
