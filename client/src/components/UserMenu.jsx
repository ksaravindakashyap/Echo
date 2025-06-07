import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../lib/api';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Divider
} from '@mui/material';
import {
  AccountCircle,
  Logout,
  DeleteForever
} from '@mui/icons-material';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [anchorEl, setAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    if (socket) {
      socket.emit('user_logout');
    }
    await logout();
  };

  const handleDeleteProfile = async () => {
    try {
      const response = await api.delete('/api/user/delete');

      if (response.ok) {
        if (socket) {
          socket.emit('user_logout');
        }
        await logout();
      } else {
        throw new Error('Failed to delete profile');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      // You might want to show an error message to the user here
    }
    setDeleteDialogOpen(false);
    handleClose();
  };

  return (
    <>
      <IconButton
        size="large"
        aria-label="account of current user"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        onClick={handleMenu}
        color="inherit"
      >
        <Avatar sx={{ width: 32, height: 32 }}>
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          <ListItemText 
            primary={user?.username}
            secondary={user?.email}
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Sign Out" />
        </MenuItem>
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteForever color="error" />
          </ListItemIcon>
          <ListItemText primary="Delete Profile" />
        </MenuItem>
      </Menu>

      {/* Delete Profile Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your profile? This action cannot be undone.
            All your chat rooms will be deleted and you will be removed from all rooms you've joined.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">
            Delete Profile
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 