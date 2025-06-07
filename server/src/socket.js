const { ChatRoom } = require('./db');

module.exports = (io) => {
  const userSockets = new Map();
  const userStatus = new Map();
  const activityTimeouts = new Map();

  const updateUserStatus = (userId, status) => {
    console.log(`[Status Update] User ${userId} status changing to ${status}`);
    const previousStatus = userStatus.get(userId);
    userStatus.set(userId, status);
    // Broadcast to all clients
    io.emit('user_status_update', { userId, status });
    console.log(`[Status Changed] User ${userId}: ${previousStatus || 'none'} -> ${status}`);
  };

  const clearUserActivityTimeout = (userId) => {
    const timeout = activityTimeouts.get(userId);
    if (timeout) {
      clearTimeout(timeout);
      activityTimeouts.delete(userId);
    }
  };

  const setUserActivityTimeout = (userId) => {
    clearUserActivityTimeout(userId);
    const timeout = setTimeout(() => {
      if (userStatus.get(userId) === 'online') {
        console.log(`[Away Timer] Setting user ${userId} to away due to inactivity`);
        updateUserStatus(userId, 'away');
      }
    }, 30000);
    activityTimeouts.set(userId, timeout);
  };

  io.on('connection', (socket) => {
    console.log('[Socket] New connection established');
    let userId = null;

    socket.on('authenticate', (data) => {
      console.log('[Auth] User authenticating:', data);
      userId = data.userId;
      userSockets.set(userId, socket.id);
      
      // Set initial status to online
      updateUserStatus(userId, 'online');
      setUserActivityTimeout(userId);

      // Join all user's rooms
      ChatRoom.getUserRooms(userId)
        .then(rooms => {
          console.log(`Found ${rooms.length} rooms for user ${userId}`);
          rooms.forEach(room => {
            socket.join(`room_${room.id}`);
          });
        })
        .catch(err => console.error('Error joining rooms:', err));
    });

    socket.on('activity', () => {
      if (!userId) {
        console.log('[Activity] Received activity but no userId');
        return;
      }
      
      console.log(`[Activity] Received activity from user ${userId}`);
      updateUserStatus(userId, 'online');
      setUserActivityTimeout(userId);
    });

    // Get rooms event handler
    socket.on('get_rooms', async (data, callback) => {
      try {
        console.log('Getting rooms for user:', userId);
        const publicRooms = await ChatRoom.getPublicRooms();
        const userRooms = await ChatRoom.getUserRooms(userId);
        
        console.log('Public rooms:', publicRooms);
        console.log('User rooms:', userRooms);
        
        // Combine and deduplicate rooms
        const roomMap = new Map();
        [...publicRooms, ...userRooms].forEach(room => {
          roomMap.set(room.id, room);
        });
        
        const rooms = Array.from(roomMap.values());
        console.log('Sending rooms to client:', rooms);
        callback({ success: true, rooms });
      } catch (error) {
        console.error('Error getting rooms:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Chat room operations
    socket.on('create_room', async (data, callback) => {
      try {
        console.log('[Socket] Creating room:', data);
        const room = await ChatRoom.create({
          name: data.name,
          createdBy: userId,
          isPrivate: data.isPrivate,
          maxParticipants: data.maxParticipants || 50
        });
        
        // Join the room automatically after creation
        socket.join(`room_${room.id}`);
        
        // If private room, generate and return the access code
        const accessCode = data.isPrivate ? Math.floor(100000 + Math.random() * 900000).toString() : null;
        const responseRoom = {
          ...room,
          participants: [userId],
          accessCode: accessCode
        };
        
        // Update the room with the access code if it's private
        if (data.isPrivate) {
          await ChatRoom.update(room.id, { accessCode });
        }
        
        // Emit to all clients for public rooms, only to creator for private rooms
        if (!room.isPrivate) {
          io.emit('room_created', responseRoom);
        } else {
          socket.emit('room_created', responseRoom);
        }
        
        console.log('[Socket] Room created successfully:', {
          ...responseRoom,
          accessCode: data.isPrivate ? '******' : null
        });
        
        callback({ success: true, room: responseRoom });
      } catch (error) {
        console.error('[Socket] Error creating room:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('join_room', async (data, callback) => {
      try {
        console.log('[Socket] Joining room:', data);
        const room = await ChatRoom.join(data.roomId, userId);
        
        // Join the socket room
        socket.join(`room_${room.id}`);
        
        // Get online users in the room
        const roomSockets = await io.in(`room_${room.id}`).allSockets();
        const onlineUsers = Array.from(roomSockets).map(socketId => {
          const user = userSockets.get(socketId);
          return user ? { id: user.id, username: user.username } : null;
        }).filter(Boolean);
        
        // Notify room members
        io.to(`room_${room.id}`).emit('user_joined_room', {
          roomId: room.id,
          userId,
          username: socket.username,
          timestamp: new Date()
        });
        
        console.log('[Socket] Successfully joined room:', room.id);
        callback({ success: true, room });
      } catch (error) {
        console.error('[Socket] Error joining room:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('leave_room', async (data, callback) => {
      try {
        socket.leave(`room_${data.roomId}`);
        io.to(`room_${data.roomId}`).emit('user_left_room', {
          roomId: data.roomId,
          userId,
          timestamp: new Date()
        });
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('delete_room', async (data, callback) => {
      try {
        await ChatRoom.delete(data.roomId, userId);
        io.to(`room_${data.roomId}`).emit('room_deleted', {
          roomId: data.roomId,
          timestamp: new Date()
        });
        // Disconnect all users from the room
        const room = io.sockets.adapter.rooms.get(`room_${data.roomId}`);
        if (room) {
          room.forEach(socketId => {
            io.sockets.sockets.get(socketId).leave(`room_${data.roomId}`);
          });
        }
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('rename_room', async (data, callback) => {
      try {
        const room = await ChatRoom.rename(data.roomId, userId, data.name);
        io.emit('room_updated', room);
        callback({ success: true, room });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('get_room_messages', async (data, callback) => {
      try {
        console.log('[Socket] Getting messages for room:', data.roomId);
        const messages = await ChatRoom.getMessages(data.roomId);
        console.log(`[Socket] Found ${messages.length} messages`);
        callback({ success: true, messages });
      } catch (error) {
        console.error('[Socket] Error getting messages:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('get_room_details', async (data, callback) => {
      try {
        console.log('[Socket] Getting room details:', data);
        const room = await ChatRoom.getFullDetails(data.roomId, userId);
        
        if (!room) {
          throw new Error('Room not found');
        }
        
        // Only return access code if user is the creator
        const responseRoom = {
          ...room,
          accessCode: room.createdBy === userId ? room.accessCode : undefined
        };
        
        console.log('[Socket] Sending room details:', {
          ...responseRoom,
          accessCode: responseRoom.accessCode ? '******' : undefined
        });
        
        callback({ success: true, room: responseRoom });
      } catch (error) {
        console.error('[Socket] Error getting room details:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('message', async (data, callback) => {
      try {
        console.log('[Socket] New message in room:', data.roomId);
        const message = {
          roomId: data.roomId,
          userId,
          content: data.content,
          username: data.username,
          timestamp: new Date()
        };
        
        // Save message to database
        const savedMessage = await ChatRoom.saveMessage(message);
        
        // Update user's activity status when sending a message
        updateUserStatus(userId, 'online');
        setUserActivityTimeout(userId);
        
        // Broadcast message to room
        io.to(`room_${data.roomId}`).emit('message', savedMessage);
        
        if (callback) {
          callback({ success: true });
        }
      } catch (error) {
        console.error('[Socket] Error sending message:', error);
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    socket.on('typing', (data) => {
      // Update activity when typing
      updateUserStatus(userId, 'online');
      setUserActivityTimeout(userId);
      
      socket.to(`room_${data.roomId}`).emit('typing', {
        userId,
        roomId: data.roomId,
        isTyping: data.isTyping
      });
    });

    socket.on('user_logout', () => {
      if (userId) {
        console.log(`[Logout] User ${userId} logging out`);
        clearUserActivityTimeout(userId);
        userSockets.delete(userId);
        userStatus.delete(userId);
        io.emit('user_status_update', { userId, status: 'offline' });
        userId = null;
      }
    });

    socket.on('disconnect', () => {
      if (userId) {
        console.log(`[Disconnect] User ${userId} disconnected`);
        clearUserActivityTimeout(userId);
        userSockets.delete(userId);
        userStatus.delete(userId);
        io.emit('user_status_update', { userId, status: 'offline' });
      }
    });
  });
}; 