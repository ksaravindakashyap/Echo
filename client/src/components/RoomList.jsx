import React, { useState, useEffect } from 'react';
import { IconButton, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Typography, List, ListItem, Avatar, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel, Alert } from '@mui/material';
import { Add as AddIcon, Lock as LockIcon, LockOpen as LockOpenIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { LockClosedIcon } from "@radix-ui/react-icons";
import { useSocket } from '../contexts/SocketContext';

const RoomList = ({ onRoomSelect, selectedRoom, currentUser, currentUserStatus }) => {
  const { socket } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [error, setError] = useState('');
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'public'
  });
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [lastCreatedRoom, setLastCreatedRoom] = useState(null);
  const [userStatuses, setUserStatuses] = useState(() => {
    // Initialize with current user's status if available
    const initialStatuses = new Map();
    if (currentUser?.id) {
      initialStatuses.set(currentUser.id, currentUserStatus || 'offline');
    }
    return initialStatuses;
  });

  useEffect(() => {
    if (!socket || !currentUser?.id) {
      console.log('[RoomList] No socket or current user');
      return;
    }

    console.log('[RoomList] Setting up socket listeners');
    console.log('[RoomList] Current user:', currentUser.id);
    console.log('[RoomList] Current user status:', currentUserStatus);

    // Update current user's status whenever it changes
    if (currentUser.id && currentUserStatus) {
      console.log(`[RoomList] Updating current user ${currentUser.id} status to ${currentUserStatus}`);
      setUserStatuses(prev => {
        const next = new Map(prev);
        next.set(currentUser.id, currentUserStatus);
        return next;
      });
    }

    // Listen for user status updates
    socket.on('user_status_update', ({ userId, status }) => {
      console.log(`[RoomList] Status update for user ${userId}: ${status}`);
      setUserStatuses(prev => {
        const next = new Map(prev);
        next.set(userId, status);
        return next;
      });
    });

    // Get initial rooms
    socket.emit('get_rooms', {}, (response) => {
      if (response.success) {
        console.log('[RoomList] Received initial rooms:', response.rooms);
        setRooms(response.rooms);
      }
    });

    // Listen for room updates
    socket.on('room_created', (room) => {
      console.log('[RoomList] New room created:', room);
      console.log('[RoomList] Room isPrivate:', room.isPrivate);
      console.log('[RoomList] Room createdBy:', room.createdBy);
      console.log('[RoomList] Current user:', currentUser.id);
      
      // Add the room immediately if:
      // 1. It's a public room, OR
      // 2. Current user created this room (including private rooms)
      if (!room.isPrivate || Number(room.createdBy) === Number(currentUser.id)) {
        console.log('[RoomList] Adding room to list:', room.name);
        setRooms(prev => {
          // Check if room already exists to avoid duplicates
          const roomExists = prev.some(r => r.id === room.id);
          if (!roomExists) {
            return [...prev, room];
          }
          return prev;
        });
      }
    });

    socket.on('room_deleted', ({ roomId }) => {
      console.log('[RoomList] Room deleted:', roomId);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    });

    socket.on('room_updated', (room) => {
      console.log('[RoomList] Room updated received:', room);
      console.log('[RoomList] Current rooms before update:', rooms.map(r => ({ id: r.id, name: r.name, lastMessage: r.lastMessage })));
      
      setRooms(prev => {
        const updatedRooms = prev.map(r => {
          if (r.id === room.id) {
            console.log('[RoomList] Updating room:', r.id, 'with new data:', room);
            // Merge the room data to ensure all fields are preserved
            return {
              ...r,
              ...room,
              lastMessage: room.lastMessage,
              lastMessageTime: room.lastMessageTime
            };
          }
          return r;
        });
        
        console.log('[RoomList] Rooms after update:', updatedRooms.map(r => ({ id: r.id, name: r.name, lastMessage: r.lastMessage })));
        return updatedRooms;
      });
    });

    socket.on('user_joined_room', ({ roomId, userId }) => {
      console.log(`[RoomList] User ${userId} joined room ${roomId}`);
      if (userId === currentUser.id) {
        // Refresh rooms list when we join a room
        socket.emit('get_rooms', {}, (response) => {
          if (response.success) {
            setRooms(response.rooms);
          }
        });
      }
    });

    return () => {
      console.log('[RoomList] Cleaning up socket listeners');
      socket.off('room_created');
      socket.off('room_deleted');
      socket.off('room_updated');
      socket.off('user_joined_room');
      socket.off('user_status_update');
    };
  }, [socket, currentUser?.id]);

  const handleCreateRoom = () => {
    if (!socket) {
      setError('Socket connection not available');
      return;
    }

    if (!newRoom.name.trim()) {
      setError('Room name is required');
      return;
    }
    
    console.log('[RoomList] Creating room:', {
      name: newRoom.name,
      isPrivate: newRoom.type === 'private',
      currentUser: currentUser.id
    });
    
    socket.emit('create_room', {
      name: newRoom.name,
      isPrivate: newRoom.type === 'private'
    }, (response) => {
      if (response.success) {
        console.log('[RoomList] Room created successfully:', response.room);
        setError('');
        
        // Ensure the room is added to the list immediately
        setRooms(prev => {
          const roomExists = prev.some(r => r.id === response.room.id);
          if (!roomExists) {
            return [...prev, response.room];
          }
          return prev;
        });
        
        // Store the last created room with its access code
        if (response.room.isPrivate && response.room.accessCode) {
          setLastCreatedRoom(response.room);
          setShowAccessCodeDialog(true);
        }
        
        setNewRoom({
          name: '',
          type: 'public'
        });
        setShowCreateDialog(false);
        
        // Auto-select the newly created room
        onRoomSelect(response.room);
      } else {
        setError(response.error || 'Failed to create room');
      }
    });
  };

  const handleJoinPrivateRoom = () => {
    if (!socket) {
      setError('Socket connection not available');
      return;
    }

    if (!joinRoomCode.trim() || joinRoomCode.length !== 6) {
      setError('Invalid access code');
      return;
    }

    console.log('[RoomList] Attempting to join private room with access code:', joinRoomCode);
    socket.emit('join_room', { accessCode: joinRoomCode }, (response) => {
      if (response.success) {
        console.log('[RoomList] Successfully joined room:', response.room);
        setError('');
        setShowJoinDialog(false);
        setJoinRoomCode('');
        
        // Add the joined room to the list immediately if it's not already there
        setRooms(prev => {
          const roomExists = prev.some(room => room.id === response.room.id);
          if (!roomExists) {
            return [...prev, response.room];
          }
          return prev;
        });
        
        // Also refresh the full room list to ensure consistency
        socket.emit('get_rooms', {}, (refreshResponse) => {
          if (refreshResponse.success) {
            setRooms(refreshResponse.rooms);
          }
        });
        
        onRoomSelect(response.room);
      } else {
        console.error('[RoomList] Failed to join room:', response.error);
        setError(response.error || 'Failed to join room');
      }
    });
  };

  const handleCopyAccessCode = () => {
    if (lastCreatedRoom?.accessCode) {
      navigator.clipboard.writeText(lastCreatedRoom.accessCode);
    }
  };

  // Function to get status color
  const getStatusColor = (status) => {
    console.log('[RoomList] Getting color for status:', status);
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  // Function to get user status
  const getUserStatus = (userId) => {
    if (!userId) {
      console.log('[RoomList] No userId provided for status check');
      return 'offline';
    }

    if (userId === currentUser?.id) {
      console.log(`[RoomList] Getting status for current user: ${currentUserStatus}`);
      return currentUserStatus || 'offline';
    }

    const status = userStatuses.get(userId);
    console.log(`[RoomList] Getting status for user ${userId}:`, status);
    return status || 'offline';
  };

  // Function to format timestamp to IST time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      // Convert to IST (Indian Standard Time) in hh:mm:ss format
      const istTime = date.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return istTime;
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Rooms Header */}
      <div className="p-4">
        <Typography variant="h6" className="text-gray-900 mb-4">
          Chat Rooms
        </Typography>
        <div className="space-y-2">
          <button
            onClick={() => {
              setError('');
              setShowCreateDialog(true);
            }}
            className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:from-blue-700 hover:via-purple-700 hover:to-orange-600 transition-all duration-200"
          >
            <AddIcon fontSize="small" />
            CREATE ROOM
          </button>
          <button
            onClick={() => {
              setError('');
              setShowJoinDialog(true);
            }}
            className="w-full border border-orange-500 text-orange-600 py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
          >
            <LockIcon fontSize="small" />
            JOIN PRIVATE ROOM
          </button>
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto">
        <List>
          {rooms.map((room) => (
            <ListItem
              key={room.id}
              onClick={() => onRoomSelect(room)}
              className={`cursor-pointer hover:bg-orange-50 transition-colors ${
                selectedRoom?.id === room.id ? 'bg-orange-100' : ''
              }`}
              sx={{ py: 1.5 }}
            >
              <div className="flex items-center w-full">
                <div className="relative">
                  <Avatar 
                    sx={{ 
                      background: 'linear-gradient(to right, #f97316, #ea580c, #dc2626)',
                      width: 40,
                      height: 40,
                      fontSize: '1rem'
                    }}
                  >
                    {room.name.slice(0, 2).toUpperCase()}
                  </Avatar>
                  {/* Status Indicator */}
                  <div 
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusColor(getUserStatus(room.createdBy))}`}
                    title={`${getUserStatus(room.createdBy)}`}
                  ></div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Typography variant="subtitle2" className="font-medium text-gray-900">
                        {room.name}
                      </Typography>
                      {room.isPrivate && (
                        <LockClosedIcon className="text-orange-500 w-4 h-4" />
                      )}
                    </div>
                    <Typography variant="caption" className="text-gray-500">
                      {formatTime(room.lastMessageTime)}
                    </Typography>
                  </div>
                  <Typography variant="body2" className="text-gray-500 truncate" sx={{ maxWidth: '200px' }}>
                    {room.lastMessage || 'Start a conversation'}
                  </Typography>
                </div>
              </div>
            </ListItem>
          ))}
        </List>
      </div>

      {/* Create Room Dialog */}
      <Dialog 
        open={showCreateDialog} 
        onClose={() => {
          setError('');
          setShowCreateDialog(false);
        }}
        PaperProps={{
          sx: {
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          Create New Chat Room
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={newRoom.name}
            onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#f97316',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#f97316',
              },
            }}
          />
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend" sx={{ color: 'text.primary', '&.Mui-focused': { color: '#f97316' } }}>
              Room Type
            </FormLabel>
            <RadioGroup
              value={newRoom.type}
              onChange={(e) => setNewRoom({ ...newRoom, type: e.target.value })}
            >
              <FormControlLabel 
                value="public" 
                control={
                  <Radio 
                    sx={{
                      '&.Mui-checked': {
                        color: '#f97316',
                      },
                    }}
                  />
                } 
                label="Public Room" 
              />
              <FormControlLabel 
                value="private" 
                control={
                  <Radio 
                    sx={{
                      '&.Mui-checked': {
                        color: '#f97316',
                      },
                    }}
                  />
                } 
                label="Private Room" 
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => {
              setError('');
              setShowCreateDialog(false);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRoom}
            sx={{
              background: 'linear-gradient(to right, #2563eb, #9333ea, #f97316)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(to right, #1d4ed8, #7c3aed, #ea580c)',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog 
        open={showJoinDialog} 
        onClose={() => {
          setError('');
          setShowJoinDialog(false);
        }}
        PaperProps={{
          sx: {
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          Join Private Room
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            margin="dense"
            label="Access Code"
            type="text"
            fullWidth
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#f97316',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#f97316',
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={() => {
              setError('');
              setShowJoinDialog(false);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinPrivateRoom}
            disabled={!joinRoomCode}
            sx={{
              background: 'linear-gradient(to right, #2563eb, #9333ea, #f97316)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(to right, #1d4ed8, #7c3aed, #ea580c)',
              },
              '&.Mui-disabled': {
                background: '#e5e7eb',
                color: '#9ca3af',
              },
            }}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>

      {/* Access Code Dialog */}
      <Dialog 
        open={showAccessCodeDialog} 
        onClose={() => setShowAccessCodeDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          Room Access Code
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Alert 
            severity="success"
            sx={{ mb: 2 }}
          >
            Room created successfully! Here's your access code:
          </Alert>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 'medium' }}>
              {lastCreatedRoom?.accessCode}
            </Typography>
            <IconButton
              size="small"
              onClick={handleCopyAccessCode}
              sx={{ color: '#f97316' }}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </div>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Share this code with others to let them join your room
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={() => setShowAccessCodeDialog(false)}
            sx={{
              background: 'linear-gradient(to right, #2563eb, #9333ea, #f97316)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(to right, #1d4ed8, #7c3aed, #ea580c)',
              },
            }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RoomList; 