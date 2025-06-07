const express = require('express');
const router = express.Router();
const { User, ChatRoom } = require('../db');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');

// Authentication routes
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const user = await User.create(email, username, password);
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await User.comparePassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Protected routes
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const publicRooms = await ChatRoom.getPublicRooms();
    const userRooms = await ChatRoom.getUserRooms(req.user.id);
    
    // Combine and deduplicate rooms
    const roomMap = new Map();
    [...publicRooms, ...userRooms].forEach(room => {
      roomMap.set(room.id, room);
    });
    
    res.json({ rooms: Array.from(roomMap.values()) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/rooms', authenticateToken, async (req, res) => {
  try {
    const { name, isPrivate } = req.body;
    const room = await ChatRoom.create({
      name,
      createdBy: req.user.id,
      isPrivate
    });
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/rooms/join', authenticateToken, async (req, res) => {
  try {
    const { roomId, accessCode } = req.body;
    const room = await ChatRoom.join(roomId, req.user.id, accessCode);
    res.json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/rooms/:roomId', authenticateToken, async (req, res) => {
  try {
    await ChatRoom.delete(req.params.roomId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// User management routes
router.delete('/users/:userId', authenticateToken, async (req, res) => {
  try {
    // Only allow users to delete their own account
    if (req.params.userId !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this user' });
    }

    await User.delete(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user profile
router.delete('/user/delete', authenticateToken, async (req, res) => {
  try {
    await User.deleteUser(req.user.id);
    res.status(200).json({ message: 'User profile deleted successfully' });
  } catch (error) {
    console.error('Error deleting user profile:', error);
    res.status(500).json({ error: 'Failed to delete user profile' });
  }
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connectivity
    const { db } = require('../db');
    
    // Simple database query to check if it's working
    await new Promise((resolve, reject) => {
      db.get('SELECT 1 as test', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Health Check] Database error:', error);
    res.status(500).json({ 
      status: 'unhealthy', 
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 