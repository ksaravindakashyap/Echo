const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create a new database connection
const db = new sqlite3.Database(path.join(__dirname, '../chat.db'), (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

// Create necessary tables
function createTables() {
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
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Chat room members table
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_room_members (
      room_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (room_id, user_id),
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
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

  delete: (userId) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // First, delete all messages by this user
        db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
        
        // Remove user from all chat rooms they're a member of
        db.run('DELETE FROM chat_room_members WHERE user_id = ?', [userId]);
        
        // Delete rooms created by this user
        db.all(
          'SELECT id FROM chat_rooms WHERE created_by = ?',
          [userId],
          (err, rooms) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Delete each room and its related data
            rooms.forEach(room => {
              db.serialize(() => {
                db.run('DELETE FROM messages WHERE room_id = ?', [room.id]);
                db.run('DELETE FROM chat_room_members WHERE room_id = ?', [room.id]);
                db.run('DELETE FROM chat_rooms WHERE id = ?', [room.id]);
              });
            });
            
            // Finally, delete the user
            db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
              if (err) reject(err);
              else resolve(true);
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
      db.run(
        'INSERT INTO chat_rooms (name, created_by, is_private, access_code) VALUES (?, ?, ?, ?)',
        [name, createdBy, isPrivate, accessCode],
        function(err) {
          if (err) reject(err);
          else {
            // Add creator as first member
            db.run(
              'INSERT INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
              [this.lastID, createdBy],
              (err) => {
                if (err) reject(err);
                else resolve({ 
                  id: this.lastID, 
                  name, 
                  createdBy, 
                  isPrivate, 
                  accessCode 
                });
              }
            );
          }
        }
      );
    });
  },

  join: (roomId, userId, accessCode = null) => {
    return new Promise((resolve, reject) => {
      // Check if room exists and if private, verify access code
      db.get(
        'SELECT * FROM chat_rooms WHERE id = ?',
        [roomId],
        (err, room) => {
          if (err) reject(err);
          else if (!room) reject(new Error('Room not found'));
          else if (room.is_private && room.access_code !== accessCode) {
            reject(new Error('Invalid access code'));
          } else {
            db.run(
              'INSERT OR IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
              [roomId, userId],
              (err) => {
                if (err) reject(err);
                else resolve(room);
              }
            );
          }
        }
      );
    });
  },

  getPublicRooms: () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT cr.*, u.username as creator_name, 
         COUNT(crm.user_id) as member_count 
         FROM chat_rooms cr 
         LEFT JOIN users u ON cr.created_by = u.id 
         LEFT JOIN chat_room_members crm ON cr.id = crm.room_id 
         WHERE cr.is_private = 0 
         GROUP BY cr.id`,
        [],
        (err, rooms) => {
          if (err) reject(err);
          else resolve(rooms);
        }
      );
    });
  },

  getUserRooms: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT cr.*, u.username as creator_name, 
         COUNT(crm2.user_id) as member_count 
         FROM chat_rooms cr 
         JOIN chat_room_members crm ON cr.id = crm.room_id 
         LEFT JOIN users u ON cr.created_by = u.id 
         LEFT JOIN chat_room_members crm2 ON cr.id = crm2.room_id 
         WHERE crm.user_id = ? 
         GROUP BY cr.id`,
        [userId],
        (err, rooms) => {
          if (err) reject(err);
          else resolve(rooms);
        }
      );
    });
  },

  delete: (roomId, userId) => {
    return new Promise((resolve, reject) => {
      // Check if user is the creator
      db.get(
        'SELECT * FROM chat_rooms WHERE id = ? AND created_by = ?',
        [roomId, userId],
        (err, room) => {
          if (err) reject(err);
          else if (!room) reject(new Error('Not authorized to delete this room'));
          else {
            // Delete all related data
            db.serialize(() => {
              db.run('DELETE FROM messages WHERE room_id = ?', [roomId]);
              db.run('DELETE FROM chat_room_members WHERE room_id = ?', [roomId]);
              db.run('DELETE FROM chat_rooms WHERE id = ?', [roomId], (err) => {
                if (err) reject(err);
                else resolve(true);
              });
            });
          }
        }
      );
    });
  },

  rename: (roomId, userId, newName) => {
    return new Promise((resolve, reject) => {
      // Check if user is the creator
      db.get(
        'SELECT * FROM chat_rooms WHERE id = ? AND created_by = ?',
        [roomId, userId],
        (err, room) => {
          if (err) reject(err);
          else if (!room) reject(new Error('Not authorized to rename this room'));
          else {
            db.run(
              'UPDATE chat_rooms SET name = ? WHERE id = ?',
              [newName, roomId],
              (err) => {
                if (err) reject(err);
                else {
                  // Get updated room data
                  db.get(
                    `SELECT cr.*, u.username as creator_name, 
                     COUNT(crm.user_id) as member_count 
                     FROM chat_rooms cr 
                     LEFT JOIN users u ON cr.created_by = u.id 
                     LEFT JOIN chat_room_members crm ON cr.id = crm.room_id 
                     WHERE cr.id = ?
                     GROUP BY cr.id`,
                    [roomId],
                    (err, updatedRoom) => {
                      if (err) reject(err);
                      else resolve(updatedRoom);
                    }
                  );
                }
              }
            );
          }
        }
      );
    });
  },

  getMessages: (roomId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, u.username 
         FROM messages m 
         JOIN users u ON m.user_id = u.id 
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

module.exports = { db, User, ChatRoom }; 