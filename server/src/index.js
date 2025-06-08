const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const { User, ChatRoom, Message } = require('./db');
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

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// WebSocket server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true
});

// Store connected users (in-memory for session management)
const connectedUsers = new Map();

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'your-default-jwt-secret-key-change-this'
    );
    socket.userId = parseInt(decoded.userId); // Ensure it's a number
    console.log('[Auth] Socket authenticated with userId:', socket.userId, typeof socket.userId);
    next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id, 'with userId:', socket.userId);

  socket.on('authenticate', async ({ userId }) => {
    console.log('User authenticate event:', userId, 'socket.userId:', socket.userId);
    const parsedUserId = parseInt(userId);
    connectedUsers.set(socket.id, parsedUserId);
    
    try {
      // Join all rooms the user is a member of
      const userRooms = await ChatRoom.getByUserId(parsedUserId);
      userRooms.forEach(room => {
        socket.join(room.id.toString());
      });
    } catch (error) {
      console.error('Error loading user rooms:', error);
    }
  });

  // Handle room creation
  socket.on('create_room', async (data, callback) => {
    try {
      console.log('Creating room:', data);
      
      const room = await ChatRoom.create({
        name: data.name,
        createdBy: socket.userId,
        isPrivate: data.isPrivate
      });
      
      socket.join(room.id.toString());
      
      // Format room data consistently for client
      const formattedRoom = {
        id: room.id,
        name: room.name,
        isPrivate: Boolean(room.isPrivate),
        createdBy: room.createdBy, // This should be socket.userId
        createdAt: room.createdAt,
        accessCode: room.accessCode
      };
      
      console.log('Room created successfully - sending to client:', formattedRoom);
      
      // Send complete room data (including access code) to creator
      socket.emit('room_created', formattedRoom);
      
      // For public rooms, broadcast to all other clients without access code
      if (!data.isPrivate) {
        socket.broadcast.emit('room_created', {
          ...formattedRoom,
          accessCode: undefined
        });
      }
      
      if (callback) {
        callback({ 
          success: true, 
          room: formattedRoom,
          accessCode: data.isPrivate ? room.accessCode : undefined
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
  socket.on('get_rooms', async (data, callback) => {
    try {
      console.log('Getting rooms for user:', socket.userId, 'Type:', typeof socket.userId);
      
      const userRooms = await ChatRoom.getByUserId(socket.userId);
      
      console.log('Raw rooms from database:', userRooms);
      console.log('Formatted rooms for client:', userRooms.map(r => ({
        id: r.id,
        name: r.name,
        isPrivate: r.isPrivate,
        createdBy: r.createdBy,
        createdByType: typeof r.createdBy,
        hasAccessCode: !!r.accessCode,
        isCreator: r.createdBy === socket.userId,
        isCreatorStrict: r.createdBy === socket.userId,
        isCreatorLoose: r.createdBy == socket.userId,
        isCreatorNumber: Number(r.createdBy) === Number(socket.userId)
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
        room = await ChatRoom.getByAccessCode(data.accessCode);
        console.log('Found room by access code:', room);
      } else {
        // Join by room ID
        room = await ChatRoom.getById(data.roomId);
      }
      
      if (!room) {
        console.log('Room not found');
        throw new Error('Room not found');
      }
      
      // Add user to room if not already a member
      await ChatRoom.addMember(room.id, socket.userId);
      
      socket.join(room.id.toString());
      
      // Notify room members
      io.to(room.id.toString()).emit('user_joined_room', {
        roomId: room.id,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
      
      console.log('User', socket.userId, 'joined room:', room.id);
      
      if (callback) {
        // Format room data consistently for the client
        const formattedRoom = {
          id: room.id,
          name: room.name,
          isPrivate: Boolean(room.is_private),
          createdBy: room.created_by, // Ensure this field is included
          createdAt: room.created_at,
          accessCode: room.created_by === socket.userId ? room.access_code : undefined
        };
        
        console.log('Sending formatted room to client:', formattedRoom);
        
        callback({ 
          success: true, 
          room: formattedRoom
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
  socket.on('message', async (data) => {
    try {
      const room = await ChatRoom.getById(data.roomId);
      if (!room) {
        console.error('Room not found for message');
        return;
      }
      
      // Check if user is a member of the room
      const isMember = await ChatRoom.isMember(data.roomId, socket.userId);
      if (!isMember) {
        console.error('User not a member of room');
        return;
      }
      
      const message = await Message.create({
        roomId: data.roomId,
        userId: socket.userId,
        content: data.content
      });
      
      // Get user details for the message
      const user = await User.findById(socket.userId);
      const messageWithUser = {
        ...message,
        username: user.username
      };
      
      io.to(data.roomId.toString()).emit('message', messageWithUser);
      
      // Get all connected sockets to broadcast room updates
      const allSockets = await io.fetchSockets();
      
      // For each connected user, get their room list and broadcast the update
      for (const clientSocket of allSockets) {
        try {
          if (clientSocket.userId) {
            const userRooms = await ChatRoom.getByUserId(clientSocket.userId);
            const roomForUser = userRooms.find(r => r.id === data.roomId);
            
            if (roomForUser) {
              // This user has access to this room, send them the update
              const formattedRoom = {
                id: roomForUser.id,
                name: roomForUser.name,
                isPrivate: roomForUser.isPrivate,
                createdBy: roomForUser.createdBy,
                createdAt: roomForUser.createdAt,
                lastMessage: roomForUser.lastMessage,
                lastMessageTime: roomForUser.lastMessageTime,
                accessCode: roomForUser.createdBy === clientSocket.userId ? roomForUser.accessCode : undefined
              };
              
              clientSocket.emit('room_updated', formattedRoom);
            }
          }
        } catch (error) {
          console.error('Error sending room update to user:', clientSocket.userId, error);
        }
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  // Handle get room messages
  socket.on('get_room_messages', async (data, callback) => {
    try {
      const isMember = await ChatRoom.isMember(data.roomId, socket.userId);
      if (!isMember) {
        throw new Error('Not a member of this room');
      }
      
      const messages = await Message.getByRoomId(data.roomId);
      
      if (callback) {
        callback({ success: true, messages });
      }
    } catch (error) {
      console.error('Error getting room messages:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle typing status
  socket.on('typing', async (data) => {
    try {
      const isMember = await ChatRoom.isMember(data.roomId, socket.userId);
      if (isMember) {
        socket.to(data.roomId.toString()).emit('typing', {
          userId: socket.userId,
          roomId: data.roomId,
          isTyping: data.isTyping,
          username: data.username
        });
      }
    } catch (error) {
      console.error('Error handling typing status:', error);
    }
  });

  // Handle rename room
  socket.on('rename_room', async (data, callback) => {
    try {
      console.log('Renaming room:', data.roomId, 'to:', data.name, 'by user:', socket.userId);
      
      const room = await ChatRoom.getById(data.roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      
      console.log('Room found - createdBy:', room.created_by, 'socket.userId:', socket.userId);
      console.log('Authorization check:', Number(room.created_by) === Number(socket.userId));
      
      if (Number(room.created_by) !== Number(socket.userId)) {
        throw new Error('Only room creator can rename the room');
      }
      
      if (!data.name || !data.name.trim()) {
        throw new Error('Room name cannot be empty');
      }
      
      await ChatRoom.update(data.roomId, { name: data.name.trim() });
      
      console.log('Room updated in database, now broadcasting updates...');
      
      // Get all connected sockets to broadcast room updates with complete data
      const allSockets = await io.fetchSockets();
      console.log(`Found ${allSockets.length} connected sockets`);
      
      // For each connected user, get their room list and broadcast the update
      for (const clientSocket of allSockets) {
        try {
          if (clientSocket.userId) {
            console.log(`Processing update for user ${clientSocket.userId}`);
            const userRooms = await ChatRoom.getByUserId(clientSocket.userId);
            const roomForUser = userRooms.find(r => r.id === data.roomId);
            
            if (roomForUser) {
              console.log(`User ${clientSocket.userId} has access to room, sending update`);
              // This user has access to this room, send them the complete update
              const formattedRoom = {
                id: roomForUser.id,
                name: roomForUser.name,
                isPrivate: roomForUser.isPrivate,
                createdBy: roomForUser.createdBy,
                createdAt: roomForUser.createdAt,
                lastMessage: roomForUser.lastMessage,
                lastMessageTime: roomForUser.lastMessageTime,
                accessCode: roomForUser.createdBy === clientSocket.userId ? roomForUser.accessCode : undefined
              };
              
              console.log(`Sending room_updated event to user ${clientSocket.userId}:`, formattedRoom);
              clientSocket.emit('room_updated', formattedRoom);
            } else {
              console.log(`User ${clientSocket.userId} does not have access to room ${data.roomId}`);
            }
          } else {
            console.log('Socket has no userId:', clientSocket.id);
          }
        } catch (error) {
          console.error('Error sending room update to user:', clientSocket.userId, error);
        }
      }
      
      console.log(`Room ${data.roomId} renamed to "${data.name.trim()}" by user ${socket.userId}`);
      
      if (callback) {
        // Get the updated room data for the callback
        const userRooms = await ChatRoom.getByUserId(socket.userId);
        const updatedRoomForCallback = userRooms.find(r => r.id === data.roomId);
        
        callback({ success: true, room: updatedRoomForCallback });
      }
    } catch (error) {
      console.error('Error renaming room:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle delete room
  socket.on('delete_room', async (data, callback) => {
    try {
      console.log('Deleting room:', data.roomId, 'by user:', socket.userId);
      
      const room = await ChatRoom.getById(data.roomId);
      if (!room) {
        throw new Error('Room not found');
      }
      
      console.log('Room found - createdBy:', room.created_by, 'socket.userId:', socket.userId);
      console.log('Authorization check:', Number(room.created_by) === Number(socket.userId));
      
      if (Number(room.created_by) !== Number(socket.userId)) {
        throw new Error('Only room creator can delete the room');
      }
      
      // Notify all room participants that the room is being deleted
      io.to(data.roomId.toString()).emit('room_deleted', { roomId: data.roomId });
      
      // Delete the room (cascade will handle members and messages)
      await ChatRoom.delete(data.roomId);
      
      console.log(`Room ${data.roomId} deleted by user ${socket.userId}`);
      
      if (callback) {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle delete profile
  socket.on('delete_profile', async (data, callback) => {
    try {
      const userId = data.userId || socket.userId;
      
      // Convert both to numbers for comparison to avoid type mismatch
      if (parseInt(userId) !== parseInt(socket.userId)) {
        throw new Error('You can only delete your own profile');
      }
      
      console.log(`Deleting profile for user ${userId} (socket user: ${socket.userId})`);
      
      // Get all rooms created by this user to notify participants
      const createdRooms = await ChatRoom.getCreatedByUserId(userId);
      
      // Notify participants of rooms that will be deleted
      for (const room of createdRooms) {
        io.to(room.id.toString()).emit('room_deleted', { roomId: room.id });
      }
      
      console.log(`Starting profile deletion for user ${userId}`);
      
      // Send callback first to confirm the operation started
      if (callback) {
        callback({ success: true });
      }
      
      // Send the profile deletion event
      socket.emit('profile_deleted', { userId: userId });
      
      // Process deletion immediately but disconnect after delay
      try {
        // Delete user (this will remove from room memberships and set message user_id to NULL)
        await User.delete(userId);
        
        // Remove user from connected users
        connectedUsers.delete(socket.id);
        
        console.log(`Profile deleted for user ${userId}`);
        
        // Disconnect after a brief delay to ensure client receives the event
        setTimeout(() => {
          console.log(`Disconnecting user ${userId} after profile deletion`);
          socket.disconnect();
        }, 500);
        
      } catch (deleteError) {
        console.error('Error during profile deletion:', deleteError);
        // Still disconnect on error
        socket.disconnect();
      }
      
    } catch (error) {
      console.error('Error deleting profile:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
    const userId = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    
    if (userId) {
      try {
        // Notify all rooms where the user was a participant
        const userRooms = await ChatRoom.getByUserId(userId);
        userRooms.forEach(room => {
          io.to(room.id.toString()).emit('user_left_room', {
            roomId: room.id,
            userId,
            timestamp: new Date().toISOString()
          });
        });
      } catch (error) {
        console.error('Error handling user disconnect:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 