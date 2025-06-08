const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'chat.db');
console.log('[Database] Using database at:', dbPath);

// Create a new database connection with improved settings
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('[Database] Connection error:', err);
  } else {
    console.log('[Database] Connected to SQLite database');
    // Configure database for better concurrency and performance
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
      // Enable WAL mode for better concurrency
      db.run('PRAGMA journal_mode = WAL');
      // Set busy timeout to 30 seconds
      db.run('PRAGMA busy_timeout = 30000');
      // Optimize synchronization
      db.run('PRAGMA synchronous = NORMAL');
      
      console.log('[Database] PRAGMA settings applied');
      createTables();
    });
  }
});

// Gracefully close database on process exit
process.on('SIGINT', () => {
  console.log('[Database] Closing database connection...');
  db.close((err) => {
    if (err) {
      console.error('[Database] Error closing database:', err);
    } else {
      console.log('[Database] Database connection closed.');
    }
    process.exit(0);
  });
});

// Helper function to execute database operations with retry logic
function executeWithRetry(operation, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    function attemptOperation() {
      attempts++;
      operation()
        .then(resolve)
        .catch((error) => {
          // If it's a database busy error and we haven't exceeded max retries
          if (error.message && error.message.includes('SQLITE_BUSY') && attempts < maxRetries) {
            console.log(`[Database] Retry attempt ${attempts}/${maxRetries} for database operation`);
            // Wait before retrying (exponential backoff)
            setTimeout(attemptOperation, Math.pow(2, attempts) * 100);
          } else {
            reject(error);
          }
        });
    }
    
    attemptOperation();
  });
}

// Create necessary tables
function createTables() {
  console.log('[Database] Ensuring tables exist...');
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat rooms table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        access_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Chat room members table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_room_members (
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (room_id, user_id),
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('[Database] Tables created successfully');
  });
}

// User methods
const User = {
  create: async (email, username, password) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, username, password) VALUES (?, ?, ?)',
        [email, username, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, email, username });
        }
      );
    });
  },

  findByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  findByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  findById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },

  delete: (userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // First, remove user from all room memberships
        db.run(
          'DELETE FROM chat_room_members WHERE user_id = ?',
          [userId],
          (err) => {
            if (err) {
              console.error('[Database] Error removing user from rooms:', err);
              db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // Then delete the user (messages will have user_id set to NULL due to SET NULL constraint)
            db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
              if (err) {
                console.error('[Database] Error deleting user:', err);
                db.run('ROLLBACK');
                reject(err);
              } else {
                db.run('COMMIT');
                console.log(`[Database] User ${userId} deleted successfully, messages preserved with NULL user_id`);
                resolve(true);
              }
            });
          }
        );
      });
    });
  },

  comparePassword: async (password, hash) => {
    return bcrypt.compare(password, hash);
  }
};

// Chat room methods
const ChatRoom = {
  create: ({ name, createdBy, isPrivate }) => {
    return new Promise((resolve, reject) => {
      const accessCode = isPrivate ? Math.floor(100000 + Math.random() * 900000).toString() : null;
      
      // Use a transaction to ensure both operations complete successfully
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          'INSERT INTO chat_rooms (name, created_by, is_private, access_code) VALUES (?, ?, ?, ?)',
          [name, createdBy, isPrivate, accessCode],
          function(err) {
            if (err) {
              console.error('[Database] Error creating room:', err);
              db.run('ROLLBACK');
              reject(new Error(`Failed to create room: ${err.message}`));
              return;
            }
            
            const roomId = this.lastID;
            
            // Add creator as first member
            db.run(
              'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
              [roomId, createdBy],
              (err) => {
                if (err) {
                  console.error('[Database] Error adding room member:', err);
                  db.run('ROLLBACK');
                  reject(new Error(`Failed to add room member: ${err.message}`));
                } else {
                  db.run('COMMIT');
                  console.log(`[Database] Room created successfully: ${name} (ID: ${roomId})`);
                  resolve({ 
                    id: roomId, 
                    name, 
                    createdBy, 
                    isPrivate, 
                    accessCode 
                  });
                }
              }
            );
          }
        );
      });
    });
  },

  getById: (roomId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT cr.*, u.username as creator_name
         FROM chat_rooms cr 
         LEFT JOIN users u ON cr.created_by = u.id 
         WHERE cr.id = ?`,
        [roomId],
        (err, room) => {
          if (err) reject(err);
          else resolve(room);
        }
      );
    });
  },

  getByAccessCode: (accessCode) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT cr.*, u.username as creator_name
         FROM chat_rooms cr 
         LEFT JOIN users u ON cr.created_by = u.id 
         WHERE cr.access_code = ?`,
        [accessCode],
        (err, room) => {
          if (err) reject(err);
          else resolve(room);
        }
      );
    });
  },

  getByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT DISTINCT cr.*, u.username as creator_name,
         CASE WHEN cr.created_by = ? THEN cr.access_code ELSE NULL END as accessCode,
         (SELECT content FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as lastMessage,
         (SELECT created_at FROM messages WHERE room_id = cr.id ORDER BY created_at DESC LIMIT 1) as lastMessageTime
         FROM chat_rooms cr 
         LEFT JOIN users u ON cr.created_by = u.id 
         LEFT JOIN chat_room_members crm ON cr.id = crm.room_id 
         WHERE (cr.is_private = 0) OR (crm.user_id = ?) OR (cr.created_by = ?)
         ORDER BY cr.created_at DESC`,
        [userId, userId, userId],
        (err, rooms) => {
          if (err) reject(err);
          else {
            // Convert database format to expected format
            const formattedRooms = rooms.map(room => ({
              id: room.id,
              name: room.name,
              isPrivate: Boolean(room.is_private),
              accessCode: room.accessCode,
              createdBy: room.created_by,
              createdAt: room.created_at,
              lastMessage: room.lastMessage,
              lastMessageTime: room.lastMessageTime
            }));
            resolve(formattedRooms);
          }
        }
      );
    });
  },

  getCreatedByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_rooms WHERE created_by = ?',
        [userId],
        (err, rooms) => {
          if (err) reject(err);
          else resolve(rooms);
        }
      );
    });
  },

  addMember: (roomId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
        [roomId, userId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  },

  isMember: (roomId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
        [roomId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  },

  update: (roomId, { name, accessCode }) => {
    return new Promise((resolve, reject) => {
      const updates = [];
      const params = [];
      
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      
      if (accessCode !== undefined) {
        updates.push('access_code = ?');
        params.push(accessCode);
      }
      
      if (updates.length === 0) {
        resolve();
        return;
      }
      
      params.push(roomId);
      
      db.run(
        `UPDATE chat_rooms SET ${updates.join(', ')} WHERE id = ?`,
        params,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  },

  delete: (roomId) => {
    return new Promise((resolve, reject) => {
      // SQLite will handle cascading deletes due to foreign key constraints
      db.run('DELETE FROM chat_rooms WHERE id = ?', [roomId], (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  },

  updateLastMessage: (roomId, lastMessage) => {
    return new Promise((resolve, reject) => {
      // For now, we don't store last message in the room table
      // This is just to prevent errors, could be implemented later
      resolve(true);
    });
  }
};

// Message methods
const Message = {
  create: ({ roomId, userId, content }) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO messages (room_id, user_id, content) VALUES (?, ?, ?)',
        [roomId, userId, content],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Get the saved message with user info and correct format
            db.get(
              `SELECT m.id, m.room_id as roomId, m.user_id as userId, 
               m.content, m.created_at as timestamp, 
               CASE WHEN u.username IS NULL THEN '[Deleted User]' ELSE u.username END as username
               FROM messages m 
               LEFT JOIN users u ON m.user_id = u.id 
               WHERE m.id = ?`,
              [this.lastID],
              (err, message) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(message);
                }
              }
            );
          }
        }
      );
    });
  },

  getByRoomId: (roomId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.id, m.room_id as roomId, m.user_id as userId, 
         m.content, m.created_at as timestamp, 
         CASE WHEN u.username IS NULL THEN '[Deleted User]' ELSE u.username END as username
         FROM messages m 
         LEFT JOIN users u ON m.user_id = u.id 
         WHERE m.room_id = ? 
         ORDER BY m.created_at ASC`,
        [roomId],
        (err, messages) => {
          if (err) reject(err);
          else resolve(messages);
        }
      );
    });
  }
};

module.exports = { db, User, ChatRoom, Message }; 