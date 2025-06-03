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

// Store connected users and rooms
const users = new Map();
const rooms = new Map();
const roomCodes = new Map(); // Map to store room codes

// Generate a random 6-digit code
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Socket authentication middleware (optional for development)
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    // For development, allow connection without token
    socket.userId = 'anonymous';
    return next();
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-this'
    );
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    // For development, allow connection even if token is invalid
    socket.userId = 'anonymous';
    next();
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Handle room creation
  socket.on('createRoom', async (data, callback) => {
    try {
      console.log('Creating room:', data);
      const roomId = Math.random().toString(36).substring(7);
      let accessCode = null;
      
      if (data.isPrivate) {
        accessCode = generateRoomCode();
        while (Array.from(rooms.values()).some(r => r.accessCode === accessCode)) {
          accessCode = generateRoomCode();
        }
        roomCodes.set(accessCode, roomId);
      }
      
      const room = {
        id: roomId,
        name: data.name,
        isPrivate: data.isPrivate,
        accessCode,
        participants: [socket.userId],
        messages: [],
        createdBy: socket.userId,
        createdAt: new Date().toISOString(),
        lastMessage: null,
        lastMessageTime: null
      };
      
      rooms.set(roomId, room);
      socket.join(roomId);
      
      // Send complete room data (including access code) to creator
      socket.emit('room_created', room);
      
      // For public rooms, broadcast to all other clients without access code
      if (!data.isPrivate) {
        socket.broadcast.emit('room_created', {
          ...room,
          accessCode: undefined
        });
      }

      console.log('Room created successfully:', {
        ...room,
        accessCode: data.isPrivate ? '******' : undefined
      });
      
      if (callback) {
        callback({ 
          success: true, 
          room,
          accessCode: data.isPrivate ? accessCode : undefined
        });
      }
    } catch (error) {
      console.error('Error creating room:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle get rooms
  socket.on('get_rooms', (data, callback) => {
    try {
      console.log('Getting rooms for user:', socket.userId);
      
      // Get all public rooms and private rooms where user is a participant
      const userRooms = Array.from(rooms.values())
        .filter(room => !room.isPrivate || room.participants.includes(socket.userId))
        .map(room => ({
          ...room,
          // Only include access code if user created the private room
          accessCode: room.isPrivate && room.createdBy === socket.userId ? room.accessCode : undefined
        }));
      
      console.log('Sending rooms:', userRooms.map(r => ({
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        hasAccessCode: !!r.accessCode
      })));
      
      if (callback) {
        callback({ success: true, rooms: userRooms });
      }
    } catch (error) {
      console.error('Error getting rooms:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle join room
  socket.on('join_room', async (data, callback) => {
    try {
      let room;
      
      if (data.accessCode) {
        // Join by access code
        const roomId = roomCodes.get(data.accessCode);
        if (!roomId) {
          throw new Error('Invalid access code');
        }
        room = rooms.get(roomId);
      } else {
        // Join by room ID
        room = rooms.get(data.roomId);
      }
      
      if (!room) {
        throw new Error('Room not found');
      }
      
      if (room.isPrivate && !room.participants.includes(socket.userId) && room.accessCode !== data.accessCode) {
        throw new Error('Cannot join private room without access code');
      }
      
      if (!room.participants.includes(socket.userId)) {
        room.participants.push(socket.userId);
      }
      
      socket.join(room.id);
      
      // Notify room members
      io.to(room.id).emit('user_joined_room', {
        roomId: room.id,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
      
      if (callback) {
        callback({ 
          success: true, 
          room: {
            ...room,
            accessCode: room.createdBy === socket.userId ? room.accessCode : undefined
          }
        });
      }
    } catch (error) {
      console.error('Error joining room:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle messages
  socket.on('message', (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.participants.includes(socket.userId)) {
      const message = {
        id: Date.now(),
        roomId: data.roomId,
        userId: socket.userId,
        username: data.username,
        content: data.content,
        timestamp: new Date().toISOString()
      };
      
      room.messages.push(message);
      room.lastMessage = data.content;
      room.lastMessageTime = message.timestamp;
      
      io.to(data.roomId).emit('message', message);
      io.emit('room_updated', {
        ...room,
        accessCode: undefined // Don't broadcast access code
      });
    }
  });

  // Handle get room messages
  socket.on('get_room_messages', (data, callback) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      
      if (!room.participants.includes(socket.userId)) {
        throw new Error('Not a member of this room');
      }
      
      if (callback) {
        callback({ success: true, messages: room.messages });
      }
    } catch (error) {
      console.error('Error getting room messages:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.participants.includes(socket.userId)) {
      socket.to(data.roomId).emit('typing', {
        userId: socket.userId,
        roomId: data.roomId,
        isTyping: data.isTyping,
        username: data.username
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    users.delete(socket.id);
    
    // Notify all rooms where the user was a participant
    rooms.forEach((room, roomId) => {
      if (room.participants.includes(socket.userId)) {
        io.to(roomId).emit('user_left_room', {
          roomId,
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 