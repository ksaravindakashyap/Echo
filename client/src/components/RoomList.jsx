import React, { useState, useEffect } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const RoomList = ({ socket, onRoomSelect, selectedRoom }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRoomMenu, setSelectedRoomMenu] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showRoomCodeDialog, setShowRoomCodeDialog] = useState(false);
  const [showJoinPrivateDialog, setShowJoinPrivateDialog] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [newRoom, setNewRoom] = useState({
    name: '',
    type: 'public',
    maxParticipants: 10
  });
  const [newRoomName, setNewRoomName] = useState('');

  useEffect(() => {
    if (!socket) return;

    socket.on('roomList', (roomList) => {
      setRooms(roomList);
    });

    socket.on('roomCreated', (room) => {
      setRooms(prev => [...prev, room]);
      if (room.type === 'private') {
        setRoomCode(room.code);
        setShowRoomCodeDialog(true);
      }
    });

    socket.on('roomJoined', (room) => {
      setRooms(prev => {
        const exists = prev.some(r => r.id === room.id);
        if (!exists) {
          return [...prev, room];
        }
        return prev.map(r => r.id === room.id ? room : r);
      });
      onRoomSelect(room);
      setJoinCode('');
      setShowJoinPrivateDialog(false);
    });

    socket.on('roomJoinError', (error) => {
      alert(error.message);
    });

    socket.on('roomRenamed', ({ roomId, newName }) => {
      setRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, name: newName } : room
      ));
    });

    socket.on('roomDeleted', (roomId) => {
      setRooms(prev => prev.filter(room => room.id !== roomId));
      if (selectedRoom?.id === roomId) {
        onRoomSelect(null);
      }
    });

    // Request initial room list
    socket.emit('getRooms');

    return () => {
      socket.off('roomList');
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomJoinError');
      socket.off('roomRenamed');
      socket.off('roomDeleted');
    };
  }, [socket, selectedRoom, onRoomSelect]);

  const handleMenuClick = (event, room) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedRoomMenu(room);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRoomMenu(null);
  };

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) return;
    socket.emit('createRoom', newRoom);
    setNewRoom({
      name: '',
      type: 'public',
      maxParticipants: 10
    });
    setShowCreateDialog(false);
  };

  const handleRenameRoom = () => {
    if (!newRoomName.trim() || !selectedRoomMenu) return;
    socket.emit('renameRoom', { roomId: selectedRoomMenu.id, newName: newRoomName });
    setNewRoomName('');
    setShowRenameDialog(false);
    handleMenuClose();
  };

  const handleDeleteRoom = () => {
    if (!selectedRoomMenu) return;
    socket.emit('deleteRoom', { roomId: selectedRoomMenu.id });
    handleMenuClose();
  };

  const handleJoinPrivateRoom = () => {
    if (!joinCode.trim()) return;
    socket.emit('joinPrivateRoom', { code: joinCode });
  };

  const canManageRoom = (room) => {
    return room.createdBy === user?.id;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col border-b">
        <div className="flex justify-between items-center p-4">
          <h2 className="text-lg font-semibold">Rooms</h2>
          <div className="flex items-center gap-2">
            <IconButton onClick={() => setShowJoinPrivateDialog(true)} size="small" title="Join Private Room">
              <span className="text-sm font-medium">Join</span>
            </IconButton>
            <IconButton onClick={() => setShowCreateDialog(true)} size="small" title="Create Room">
              <AddIcon />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {rooms.map(room => (
          <div
            key={room.id}
            onClick={() => onRoomSelect(room)}
            className={`flex justify-between items-center p-4 cursor-pointer hover:bg-gray-100 ${
              selectedRoom?.id === room.id ? 'bg-gray-100' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <div className="font-medium flex items-center gap-2">
                  {room.name}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    room.type === 'private' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {room.type}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {room.participants?.length || 0}/{room.maxParticipants} participants
                </div>
              </div>
            </div>
            {canManageRoom(room) && (
              <IconButton onClick={(e) => handleMenuClick(e, room)} size="small">
                <MoreVertIcon />
              </IconButton>
            )}
          </div>
        ))}
      </div>

      {/* Room Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setShowRenameDialog(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename Room</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteRoom}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete Room</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Room Dialog */}
      <Dialog 
        open={showCreateDialog} 
        onClose={() => setShowCreateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Room</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              autoFocus
              label="Room Name"
              type="text"
              fullWidth
              value={newRoom.name}
              onChange={(e) => setNewRoom(prev => ({ ...prev, name: e.target.value }))}
            />
            
            <FormControl component="fieldset">
              <FormLabel component="legend">Room Type</FormLabel>
              <RadioGroup
                value={newRoom.type}
                onChange={(e) => setNewRoom(prev => ({ ...prev, type: e.target.value }))}
              >
                <FormControlLabel value="public" control={<Radio />} label="Public (Anyone can join)" />
                <FormControlLabel value="private" control={<Radio />} label="Private (Join with code)" />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Maximum Participants"
              type="number"
              fullWidth
              value={newRoom.maxParticipants}
              onChange={(e) => setNewRoom(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 10 }))}
              inputProps={{ min: 2, max: 100 }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateRoom} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Room Dialog */}
      <Dialog open={showRenameDialog} onClose={() => setShowRenameDialog(false)}>
        <DialogTitle>Rename Room</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Room Name"
            type="text"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRenameDialog(false)}>Cancel</Button>
          <Button onClick={handleRenameRoom} variant="contained" color="primary">
            Rename
          </Button>
        </DialogActions>
      </Dialog>

      {/* Room Code Dialog */}
      <Dialog 
        open={showRoomCodeDialog} 
        onClose={() => setShowRoomCodeDialog(false)}
      >
        <DialogTitle>Room Created Successfully</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <p>Share this code with others to join the private room:</p>
            <div className="bg-gray-100 p-4 rounded-lg text-center text-2xl font-mono">
              {roomCode}
            </div>
            <p className="text-sm text-gray-500">
              Note: Keep this code safe. You'll need it to invite others to the room.
            </p>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRoomCodeDialog(false)} variant="contained" color="primary">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Join Private Room Dialog */}
      <Dialog 
        open={showJoinPrivateDialog} 
        onClose={() => setShowJoinPrivateDialog(false)}
      >
        <DialogTitle>Join Private Room</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-2">
            <TextField
              autoFocus
              label="Enter Room Code"
              type="text"
              fullWidth
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Enter 6-digit code"
              inputProps={{ 
                maxLength: 6,
                pattern: '[0-9]*'
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJoinPrivateDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleJoinPrivateRoom} 
            variant="contained" 
            color="primary"
            disabled={joinCode.length !== 6}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default RoomList; 