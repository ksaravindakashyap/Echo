const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-key-change-this',
  resave: false,
  saveUninitialized: false
}));

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users
const users = new Map();

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-this'
    );
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle user joining
  socket.on('join', ({ username }) => {
    // Store user information
    users.set(socket.id, { username, userId: socket.userId });
    
    // Broadcast to all clients that a new user has joined
    io.emit('userJoined', {
      user: username,
      users: Array.from(users.values()).map(u => u.username)
    });
    
    // Send current users list to the newly joined user
    socket.emit('userList', {
      users: Array.from(users.values()).map(u => u.username)
    });
  });

  // Handle messages
  socket.on('message', (data) => {
    const user = users.get(socket.id);
    if (user) {
      io.emit('message', {
        user: user.username,
        text: data.text,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle typing status
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('userTyping', { user: user.username, isTyping });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('userLeft', {
        user: user.username,
        users: Array.from(users.values()).map(u => u.username)
      });
      console.log('User disconnected:', user.username);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 