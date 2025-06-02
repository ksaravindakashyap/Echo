const { ChatRoom } = require('./db');

module.exports = (io) => {
  const userSockets = new Map();
  const userStatus = new Map();

  const updateUserStatus = (userId, status) => {
    console.log(`Updating user ${userId} status to ${status}`);
    userStatus.set(userId, status);
    io.emit('user_status_update', { userId, status });
  };

  io.on('connection', (socket) => {
    console.log('New socket connection established');
    let userId = null;

    socket.on('authenticate', (data) => {
      console.log('User authenticating:', data);
      userId = data.userId;
      userSockets.set(userId, socket.id);
      updateUserStatus(userId, 'online');

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
        console.log('Creating room:', data);
        const room = await ChatRoom.create({
          name: data.name,
          createdBy: userId,
          isPrivate: data.isPrivate
        });
        socket.join(`room_${room.id}`);
        io.emit('room_created', room);
        callback({ success: true, room });
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: error.message });
      }
    });

    socket.on('join_room', async (data, callback) => {
      try {
        const room = await ChatRoom.join(data.roomId, userId, data.accessCode);
        socket.join(`room_${room.id}`);
        io.to(`room_${room.id}`).emit('user_joined_room', {
          roomId: room.id,
          userId,
          timestamp: new Date()
        });
        callback({ success: true, room });
      } catch (error) {
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
        const messages = await ChatRoom.getMessages(data.roomId);
        callback({ success: true, messages });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    socket.on('message', async (data) => {
      const message = {
        roomId: data.roomId,
        userId,
        content: data.content,
        timestamp: new Date()
      };
      io.to(`room_${data.roomId}`).emit('message', message);
    });

    socket.on('typing', (data) => {
      socket.to(`room_${data.roomId}`).emit('typing', {
        userId,
        roomId: data.roomId,
        isTyping: data.isTyping
      });
    });

    let activityTimeout;
    const setAwayStatus = () => {
      if (userId && userStatus.get(userId) === 'online') {
        updateUserStatus(userId, 'away');
      }
    };

    socket.on('activity', () => {
      if (userId) {
        clearTimeout(activityTimeout);
        updateUserStatus(userId, 'online');
        activityTimeout = setTimeout(setAwayStatus, 30000);
      }
    });

    socket.on('user_logout', () => {
      if (userId) {
        // Remove user from status tracking but keep socket connection
        userSockets.delete(userId);
        userStatus.delete(userId);
        io.emit('user_status_update', { userId, status: 'offline' });
        userId = null;
      }
    });

    socket.on('disconnect', () => {
      if (userId) {
        userSockets.delete(userId);
        userStatus.delete(userId);
        io.emit('user_status_update', { userId, status: 'offline' });
      }
    });
  });
}; 