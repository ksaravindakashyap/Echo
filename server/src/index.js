const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Store connected users
const users = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    users.set(socket.id, username);
    io.emit('userJoined', {
      user: username,
      users: Array.from(users.values())
    });
  });

  // Handle messages
  socket.on('message', (data) => {
    const user = users.get(socket.id);
    io.emit('message', {
      user,
      text: data.text,
      timestamp: new Date().toISOString()
    });
  });

  // Handle typing status
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    socket.broadcast.emit('userTyping', { user, isTyping });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    io.emit('userLeft', {
      user: username,
      users: Array.from(users.values())
    });
    console.log('User disconnected:', username);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 