import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Typography, Box, List, ListItem, Avatar, FormControlLabel, Radio, RadioGroup, FormControl, FormLabel, Alert } from '@mui/material';
import { Add as AddIcon, MoreVert as MoreVertIcon, Lock as LockIcon, LockOpen as LockOpenIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RoomList = ({ socket, onRoomSelect, selectedRoom }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'public',
    accessCode: ''
  });
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [lastCreatedRoom, setLastCreatedRoom] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (room) => {
      console.log('Room created event received:', room);
      setRooms(prev => {
        const exists = prev.some(r => r.id === room.id);
        if (!exists) {
          return [...prev, room];
        }
        return prev;
      });
      
      if (room.isPrivate && room.accessCode) {
        setLastCreatedRoom(room);
        setShowAccessCodeDialog(true);
      }
      onRoomSelect(room);
    };

    const handleRoomJoined = (room) => {
      setRooms(prev => {
        const exists = prev.some(r => r.id === room.id);
        if (!exists) {
          return [...prev, room];
        }
        return prev.map(r => r.id === room.id ? room : r);
      });
      onRoomSelect(room);
    };

    socket.on('room_created', handleRoomCreated);
    socket.on('room_joined', handleRoomJoined);
    socket.on('room_updated', (room) => {
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, ...room } : r));
    });

    // Get initial rooms
    socket.emit('get_rooms', {}, (response) => {
      if (response.success) {
        console.log('Received rooms:', response.rooms);
        setRooms(response.rooms);
      }
    });

    return () => {
      socket.off('room_created', handleRoomCreated);
      socket.off('room_joined', handleRoomJoined);
      socket.off('room_updated');
    };
  }, [socket, onRoomSelect]);

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) return;
    
    console.log('Creating room:', {
      name: newRoom.name,
      isPrivate: newRoom.type === 'private'
    });
    
    socket.emit('createRoom', {
      name: newRoom.name,
      isPrivate: newRoom.type === 'private'
    });
    
    setNewRoom({
      name: '',
      type: 'public',
      accessCode: ''
    });
    setShowCreateDialog(false);
  };

  const handleJoinPrivateRoom = () => {
    if (!joinRoomCode.trim() || joinRoomCode.length !== 6) return;
    socket.emit('join_room', { accessCode: joinRoomCode }, (response) => {
      if (response.success) {
        setShowJoinDialog(false);
        setJoinRoomCode('');
        onRoomSelect(response.room);
      }
    });
  };

  const handleCopyAccessCode = () => {
    if (lastCreatedRoom?.accessCode) {
      navigator.clipboard.writeText(lastCreatedRoom.accessCode);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Rooms Header */}
      <div className="p-4">
        <Typography variant="h6" className="text-gray-800 mb-4">
          Chat Rooms
        </Typography>
        <div className="space-y-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="w-full bg-[#6366f1] text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#4f46e5] transition-colors"
          >
            <AddIcon fontSize="small" />
            CREATE ROOM
          </button>
          <button
            onClick={() => setShowJoinDialog(true)}
            className="w-full border border-[#6366f1] text-[#6366f1] py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
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
              className={`cursor-pointer hover:bg-gray-50 ${
                selectedRoom?.id === room.id ? 'bg-gray-100' : ''
              }`}
              sx={{ py: 1.5 }}
            >
              <div className="flex items-center w-full">
                <Avatar 
                  sx={{ 
                    bgcolor: '#6366f1',
                    width: 40,
                    height: 40,
                    fontSize: '1rem'
                  }}
                >
                  {room.name.slice(0, 2).toUpperCase()}
                </Avatar>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Typography variant="subtitle2" className="font-medium">
                        {room.name}
                      </Typography>
                      {room.isPrivate && (
                        <LockIcon fontSize="small" className="text-gray-400" />
                      )}
                    </div>
                    <Typography variant="caption" className="text-gray-500">
                      {room.lastMessageTime || 'No messages'}
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
        onClose={() => setShowCreateDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400
          }
        }}
      >
        <DialogTitle>Create New Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={newRoom.name}
            onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 3 }}
          />
          <FormControl component="fieldset">
            <FormLabel component="legend">Room Type</FormLabel>
            <RadioGroup
              value={newRoom.type}
              onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
            >
              <FormControlLabel 
                value="public" 
                control={<Radio />} 
                label={
                  <div className="flex items-center gap-2">
                    <LockOpenIcon fontSize="small" />
                    <span>Public Room</span>
                  </div>
                }
              />
              <FormControlLabel 
                value="private" 
                control={<Radio />} 
                label={
                  <div className="flex items-center gap-2">
                    <LockIcon fontSize="small" />
                    <span>Private Room (6-digit code will be generated)</span>
                  </div>
                }
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button 
            onClick={() => setShowCreateDialog(false)}
            sx={{ color: 'gray' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateRoom}
            variant="contained"
            disabled={!newRoom.name.trim()}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5'
              }
            }}
          >
            Create Room
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Private Room Dialog */}
      <Dialog
        open={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400
          }
        }}
      >
        <DialogTitle>Join Private Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Enter 6-digit Room Code"
            fullWidth
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value.slice(0, 6))}
            inputProps={{ maxLength: 6 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button 
            onClick={() => setShowJoinDialog(false)}
            sx={{ color: 'gray' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleJoinPrivateRoom}
            variant="contained"
            disabled={joinRoomCode.length !== 6}
            sx={{
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5'
              }
            }}
          >
            Join Room
          </Button>
        </DialogActions>
      </Dialog>

      {/* Access Code Dialog */}
      <Dialog
        open={showAccessCodeDialog}
        onClose={() => setShowAccessCodeDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: 400
          }
        }}
      >
        <DialogTitle>Room Created Successfully</DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your private room has been created! Share this code with others to let them join:
          </Alert>
          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg">
            <Typography variant="h4" sx={{ letterSpacing: 4 }}>
              {lastCreatedRoom?.accessCode}
            </Typography>
            <IconButton onClick={handleCopyAccessCode} color="primary">
              <ContentCopyIcon />
            </IconButton>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setShowAccessCodeDialog(false)}
            variant="contained"
            sx={{
              bgcolor: '#6366f1',
              '&:hover': {
                bgcolor: '#4f46e5'
              }
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