import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  Typography,
  Tooltip,
  FormControlLabel,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

const ChatRoomList = ({ onRoomSelect }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    if (!socket) {
      console.log('No socket connection available');
      return;
    }

    console.log('Setting up socket listeners for rooms');

    const handleRoomCreated = (room) => {
      console.log('Room created:', room);
      setRooms(prev => [...prev, room]);
    };

    const handleRoomDeleted = ({ roomId }) => {
      console.log('Room deleted:', roomId);
      setRooms(prev => prev.filter(room => room.id !== roomId));
      if (selectedRoomId === roomId) {
        setSelectedRoomId(null);
        onRoomSelect(null);
      }
    };

    const handleRoomUpdated = (room) => {
      console.log('Room updated:', room);
      setRooms(prev => prev.map(r => r.id === room.id ? room : r));
    };

    socket.on('room_created', handleRoomCreated);
    socket.on('room_deleted', handleRoomDeleted);
    socket.on('room_updated', handleRoomUpdated);

    // Get initial rooms
    console.log('Requesting initial rooms');
    socket.emit('get_rooms', {}, (response) => {
      console.log('Received rooms response:', response);
      if (response.success) {
        setRooms(response.rooms);
      }
    });

    return () => {
      console.log('Cleaning up socket listeners');
      socket.off('room_created', handleRoomCreated);
      socket.off('room_deleted', handleRoomDeleted);
      socket.off('room_updated', handleRoomUpdated);
    };
  }, [socket, selectedRoomId, onRoomSelect]);

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;

    socket.emit('create_room', {
      name: newRoomName,
      isPrivate
    }, (response) => {
      if (response.success) {
        setOpenCreateDialog(false);
        setNewRoomName('');
        setIsPrivate(false);
      }
    });
  };

  const handleJoinRoom = () => {
    socket.emit('join_room', {
      roomId: joinRoomId,
      accessCode
    }, (response) => {
      if (response.success) {
        setOpenJoinDialog(false);
        setJoinRoomId('');
        setAccessCode('');
        setRooms(prev => [...prev, response.room]);
      }
    });
  };

  const handleDeleteRoom = (roomId) => {
    socket.emit('delete_room', { roomId }, (response) => {
      if (!response.success) {
        console.error('Failed to delete room:', response.error);
      }
      handleCloseMenu();
    });
  };

  const handleRenameRoom = () => {
    if (!newRoomName.trim() || !selectedRoom) return;

    socket.emit('rename_room', {
      roomId: selectedRoom.id,
      name: newRoomName
    }, (response) => {
      if (response.success) {
        setOpenRenameDialog(false);
        setNewRoomName('');
        setSelectedRoom(null);
      }
    });
  };

  const handleRoomClick = (room) => {
    setSelectedRoomId(room.id);
    onRoomSelect(room);
  };

  const handleMenuClick = (event, room) => {
    event.stopPropagation();
    setSelectedRoom(room);
    setMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setSelectedRoom(null);
  };

  const handleRenameClick = () => {
    setNewRoomName(selectedRoom.name);
    setOpenRenameDialog(true);
    handleCloseMenu();
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Chat Rooms</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenCreateDialog(true)}
            fullWidth
          >
            Create Room
          </Button>
          <Button
            variant="outlined"
            onClick={() => setOpenJoinDialog(true)}
          >
            Join
          </Button>
        </Box>
      </Box>

      <List sx={{ flex: 1, overflow: 'auto' }}>
        {rooms.map((room) => (
          <ListItem
            key={room.id}
            button
            selected={selectedRoomId === room.id}
            onClick={() => handleRoomClick(room)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              '&:hover .room-actions': {
                opacity: 1
              }
            }}
          >
            <ListItemText 
              primary={room.name}
              secondary={Number(room.createdBy) === Number(user?.id) ? '(Creator)' : ''}
            />
            <ListItemSecondaryAction className="room-actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
              {room.isPrivate ? (
                <Tooltip title="Private Room">
                  <LockIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                </Tooltip>
              ) : (
                <Tooltip title="Public Room">
                  <LockOpenIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                </Tooltip>
              )}
              {Number(room.createdBy) === Number(user?.id) && (
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => handleMenuClick(e, room)}
                >
                  <MoreVertIcon />
                </IconButton>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {/* Room Management Menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleRenameClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Rename Room
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => {
            handleDeleteRoom(selectedRoom?.id);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Room
        </MenuItem>
      </Menu>

      {/* Create Room Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create New Chat Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room Name"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
            }
            label="Private Room"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Join Room Dialog */}
      <Dialog open={openJoinDialog} onClose={() => setOpenJoinDialog(false)}>
        <DialogTitle>Join Chat Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Room ID"
            fullWidth
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Access Code (for private rooms)"
            fullWidth
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJoinDialog(false)}>Cancel</Button>
          <Button onClick={handleJoinRoom} disabled={!joinRoomId}>
            Join
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Room Dialog */}
      <Dialog open={openRenameDialog} onClose={() => setOpenRenameDialog(false)}>
        <DialogTitle>Rename Chat Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Room Name"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRenameDialog(false)}>Cancel</Button>
          <Button onClick={handleRenameRoom} variant="contained">Rename</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatRoomList; 