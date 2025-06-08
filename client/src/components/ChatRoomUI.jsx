import { useEffect, useRef, useState } from "react";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { FiMoreVertical, FiSettings, FiLogOut, FiPaperclip, FiSmile } from 'react-icons/fi';
import { Delete as DeleteIcon, ContentCopy as ContentCopyIcon } from '@mui/icons-material';
import { useAuth } from "../contexts/AuthContext";
import RoomList from "./RoomList";
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Button } from "@mui/material";
import { useSocket } from "../contexts/SocketContext";

/**
 * ChatRoom – an opinionated, responsive UI for a Web‑Socket chat room.
 *
 * Props
 * ──────────────────────────────────────────────────────────
 * socket    – an active WebSocket instance already connected to the server
 * username  – the current user's display name
 *
 * The component focuses purely on UX polish – it leaves all auth / routing
 * concerns to the parent.
 */
export default function ChatRoomUI() {
  const { socket, isConnected } = useSocket();
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [userStatus, setUserStatus] = useState('online');
  const [socketError, setSocketError] = useState(null);
  const scrollRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [roomSettingsAnchorEl, setRoomSettingsAnchorEl] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  // Helper function to normalize room data format
  const normalizeRoomData = (room) => {
    if (!room) return null;
    
    return {
      id: room.id,
      name: room.name,
      isPrivate: Boolean(room.isPrivate || room.is_private),
      createdBy: room.createdBy || room.created_by,
      createdAt: room.createdAt || room.created_at,
      accessCode: room.accessCode || room.access_code,
      lastMessage: room.lastMessage,
      lastMessageTime: room.lastMessageTime
    };
  };

  // Track user activity
  useEffect(() => {
    if (!socket || !user) return;

    const updateActivity = () => {
      console.log('[Activity] Sending activity update');
      socket.emit('activity');
    };

    // Update activity on user interactions
    const handleActivity = () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      updateActivity();
    };

    // Listen for status updates
    socket.on('user_status_update', ({ userId, status }) => {
      console.log(`[Status Update] Received status update for user ${userId}: ${status}`);
      if (userId === user.id) {
        console.log(`[Status Update] Updating own status to: ${status}`);
        setUserStatus(status);
      }
    });

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Initial activity update
    console.log('[Activity] Sending initial activity update');
    updateActivity();

    // Set up periodic activity updates to ensure online status
    const activityInterval = setInterval(updateActivity, 25000); // Update every 25 seconds

    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      clearInterval(activityInterval);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      socket.off('user_status_update');
    };
  }, [socket, user]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message', (msg) => {
      console.log('[Message] Received message:', msg);
      if (msg.roomId === selectedRoom?.id) {
        setMessages(prev => [...prev, msg]);
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(msg.userId);
          return next;
        });
      }
    });

    socket.on('typing', ({ userId, roomId, isTyping, username }) => {
      if (roomId === selectedRoom?.id && userId !== user?.id) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          if (isTyping) {
            next.set(userId, username);
          } else {
            next.delete(userId);
          }
          return next;
        });
      }
    });

    socket.on('room_updated', (room) => {
      if (room.id === selectedRoom?.id) {
        const normalizedRoom = normalizeRoomData(room);
        setSelectedRoom(normalizedRoom);
      }
    });

    socket.on('user_joined_room', ({ roomId, userId, username }) => {
      console.log(`[ChatUI] User ${username} (${userId}) joined room ${roomId}`);
    });

    return () => {
      socket.off('message');
      socket.off('typing');
      socket.off('room_updated');
      socket.off('user_joined_room');
    };
  }, [socket, selectedRoom?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Handle profile deletion event
  useEffect(() => {
    if (!socket) return;

    socket.on('profile_deleted', ({ userId }) => {
      console.log('[ChatUI] Profile deleted event received for user:', userId);
      if (userId === user?.id) {
        // Clear all local data and redirect to landing page
        console.log('[ChatUI] Current user profile deleted, logging out and redirecting to landing page...');
        logout(true); // true flag redirects to landing page
      }
    });

    return () => {
      socket.off('profile_deleted');
    };
  }, [socket, user?.id, logout]);

  // Handle socket connection status
  useEffect(() => {
    if (!isConnected && user) {
      // Only show error if user is logged in
      setSocketError('Disconnected from server. Attempting to reconnect...');
    } else {
      setSocketError(null);
    }
  }, [isConnected, user]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (socketError) {
      console.error('[Message] Cannot send message - socket error:', socketError);
      return;
    }

    console.log('[Message] Attempting to send message:', {
      draft: draft.trim(),
      selectedRoom,
      socketConnected: isConnected,
      user: user
    });

    if (!isConnected) {
      console.error('[Message] Socket not connected');
      setSocketError('Cannot send message - disconnected from server');
      return;
    }

    if (!selectedRoom) {
      console.error('[Message] No room selected');
      return;
    }

    if (!draft.trim()) {
      console.error('[Message] Message is empty');
      return;
    }

    if (!user) {
      console.error('[Message] User not available');
      return;
    }

    console.log('[Message] Sending message to room:', selectedRoom.id);
    try {
      const messageContent = draft.trim(); // Store the message content
      setDraft(""); // Clear the input immediately
      
      socket.emit('message', {
        roomId: selectedRoom.id,
        content: messageContent,
        username: user.username
      }, (response) => {
        if (response?.success) {
          console.log('[Message] Message sent successfully');
          setSocketError(null);
        } else {
          console.error('[Message] Failed to send message:', response?.error);
          setSocketError('Failed to send message: ' + (response?.error || 'Unknown error'));
        }
      });
      
      socket.emit('activity');
    } catch (error) {
      console.error('[Message] Error sending message:', error);
      setSocketError('Error sending message: ' + error.message);
    }
  };

  const handleTyping = (e) => {
    setDraft(e.target.value);
    if (selectedRoom && socket) {
      console.log('[Typing] Updating typing status and activity');
      socket.emit('typing', {
        roomId: selectedRoom.id,
        isTyping: e.target.value.length > 0,
        username: user?.username
      });
      // Also update activity when typing
      socket.emit('activity');
    }
  };

  const handleRoomSelect = (room) => {
    const normalizedRoom = normalizeRoomData(room);
    setSelectedRoom(normalizedRoom);
    setMessages([]);

    if (!socket) {
      console.error('[ChatUI] Socket not available');
      return;
    }

    // Join the room and get messages
    socket.emit('join_room', { roomId: room.id }, (response) => {
      if (response.success) {
        // Update the selected room with the response data to ensure consistency
        const normalizedResponseRoom = normalizeRoomData(response.room);
        setSelectedRoom(normalizedResponseRoom);

        // Get room messages
        socket.emit('get_room_messages', { roomId: room.id }, (messagesResponse) => {
          if (messagesResponse.success) {
            setMessages(messagesResponse.messages || []);
          } else {
            console.error('[ChatUI] Failed to get messages:', messagesResponse.error);
          }
        });
      } else {
        console.error('[ChatUI] Failed to join room:', response.error);
      }
    });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLogout = () => {
    logout();
    setUserMenuAnchorEl(null);
  };

  const handleDeleteProfile = () => {
    if (window.confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
      if (socket) {
        socket.emit('delete_profile', { userId: user?.id }, (response) => {
          if (response.success) {
            console.log('[ChatUI] Profile deletion successful, waiting for server event...');
            // The logout will be handled by the 'profile_deleted' event
          } else {
            console.error('Failed to delete profile:', response.error);
            alert('Failed to delete profile: ' + (response.error || 'Unknown error'));
          }
        });
      } else {
        console.error('Socket not available');
        alert('Cannot delete profile - connection error');
      }
    }
    setUserMenuAnchorEl(null);
  };

  // Function to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
      default:
        return 'bg-gray-500';
    }
  };

  const handleEmojiSelect = (emoji) => {
    setDraft(prev => prev + emoji.native);
    setShowEmojiPicker(false);
    setEmojiAnchorEl(null);
  };

  const handleEmojiButtonClick = (event) => {
    setEmojiAnchorEl(event.currentTarget);
    setShowEmojiPicker(true);
  };

  const handleRenameRoom = () => {
    if (!socket || !selectedRoom || !newRoomName.trim()) return;
    
    socket.emit('rename_room', {
      roomId: selectedRoom.id,
      name: newRoomName
    }, (response) => {
      if (response.success) {
        setShowRenameDialog(false);
        setNewRoomName('');
        setRoomSettingsAnchorEl(null);
        // Update the selected room with new data
        const normalizedRoom = normalizeRoomData(response.room);
        setSelectedRoom(normalizedRoom);
      } else {
        console.error('Failed to rename room:', response.error);
        alert('Failed to rename room: ' + response.error);
      }
    });
  };

  const handleDeleteRoom = () => {
    if (!socket || !selectedRoom) return;

    if (!window.confirm(`Are you sure you want to delete the room "${selectedRoom.name}"? This action cannot be undone.`)) {
      return;
    }

    socket.emit('delete_room', {
      roomId: selectedRoom.id
    }, (response) => {
      if (response.success) {
        setSelectedRoom(null);
        setMessages([]);
        setRoomSettingsAnchorEl(null);
      } else {
        console.error('Failed to delete room:', response.error);
        alert('Failed to delete room: ' + response.error);
      }
    });
  };

  // Add this function to handle copying access code
  const handleCopyAccessCode = () => {
    if (selectedRoom?.accessCode) {
      navigator.clipboard.writeText(selectedRoom.accessCode);
    }
  };

  return (
    <div className="h-screen flex">
      {socketError && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center">
          {socketError}
        </div>
      )}
      {/* Left Sidebar */}
      <div className="w-[280px] flex flex-col bg-white border-r">
        {/* User Profile */}
        <div className="p-4 flex items-center justify-between border-b bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                {user?.username?.[0].toUpperCase()}
              </div>
              {/* Status Indicator */}
              <div 
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${getStatusColor(userStatus)}`}
                title={userStatus}
              ></div>
            </div>
            <span className="font-medium text-white">{user?.username}</span>
          </div>
          <IconButton onClick={(e) => setUserMenuAnchorEl(e.currentTarget)} className="text-white">
            <FiMoreVertical />
          </IconButton>
        </div>

        {/* Room List */}
        <RoomList
          onRoomSelect={handleRoomSelect}
          selectedRoom={selectedRoom}
          currentUser={user}
          currentUserStatus={userStatus}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        {selectedRoom && (
          <div className="h-[73px] px-6 flex items-center justify-between border-b bg-white">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {selectedRoom.name}
              </h1>
            </div>
            {(Number(selectedRoom.createdBy) === Number(user?.id)) && (
              <IconButton 
                className="text-gray-600 hover:text-gray-900"
                onClick={(e) => setRoomSettingsAnchorEl(e.currentTarget)}
              >
                <FiSettings />
              </IconButton>
            )}
          </div>
        )}

        {/* Messages Area */}
        {selectedRoom ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isOwnMessage = msg.userId === user?.id;
                return (
                  <div
                    key={idx}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] space-y-1 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      {/* Username */}
                      <div className={`text-sm ${isOwnMessage ? 'text-right' : 'text-left'} text-gray-500`}>
                        {isOwnMessage ? 'You' : msg.username}
                      </div>
                      
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-white rounded-tr-none'
                            : 'bg-white text-gray-900 rounded-tl-none shadow-sm border border-gray-100'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Indicators */}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 py-2 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiPaperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={handleTyping}
                  placeholder="Type your message here..."
                  className="flex-1 max-w-[calc(100%-200px)] bg-gray-50 text-gray-900 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={handleEmojiButtonClick}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiSmile className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="p-2 rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-orange-500 text-white hover:from-blue-700 hover:via-purple-700 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>

              {/* Emoji Picker Popover */}
              <Menu
                anchorEl={emojiAnchorEl}
                open={showEmojiPicker}
                onClose={() => {
                  setShowEmojiPicker(false);
                  setEmojiAnchorEl(null);
                }}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                transformOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                sx={{
                  '& .MuiPaper-root': {
                    marginTop: '-8px',
                    marginLeft: '-350px',
                  },
                }}
              >
                <div onClick={(e) => e.stopPropagation()}>
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="light"
                    set="native"
                  />
                </div>
              </Menu>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a room to start chatting
          </div>
        )}
      </div>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={() => setUserMenuAnchorEl(null)}
        PaperProps={{
          sx: {
            bgcolor: 'white',
            color: 'text.primary',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            '& .MuiMenuItem-root': {
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'rgb(249 250 251)',
              },
            },
            '& .MuiListItemIcon-root': {
              color: 'text.secondary',
            },
          },
        }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <FiLogOut />
          </ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteProfile}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete Profile</ListItemText>
        </MenuItem>
      </Menu>

      {/* Room Settings Menu */}
      <Menu
        anchorEl={roomSettingsAnchorEl}
        open={Boolean(roomSettingsAnchorEl)}
        onClose={() => setRoomSettingsAnchorEl(null)}
        PaperProps={{
          sx: {
            bgcolor: 'white',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }}
      >
        <MenuItem onClick={() => {
          setNewRoomName(selectedRoom?.name || '');
          setShowRenameDialog(true);
          setRoomSettingsAnchorEl(null);
        }}>
          <ListItemIcon>
            <FiSettings className="w-5 h-5" />
          </ListItemIcon>
          <ListItemText>Rename Room</ListItemText>
        </MenuItem>
        {selectedRoom?.isPrivate && (
          <MenuItem onClick={handleCopyAccessCode}>
            <ListItemIcon>
              <ContentCopyIcon className="w-5 h-5" />
            </ListItemIcon>
            <ListItemText>
              Copy Access Code: {selectedRoom.accessCode}
            </ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteRoom} className="text-red-500">
          <ListItemIcon>
            <DeleteIcon className="w-5 h-5 text-red-500" />
          </ListItemIcon>
          <ListItemText className="text-red-500">Delete Room</ListItemText>
        </MenuItem>
      </Menu>

      {/* Rename Room Dialog */}
      <Dialog
        open={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          Rename Room
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="New Room Name"
            fullWidth
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
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
            onClick={() => setShowRenameDialog(false)}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameRoom}
            disabled={!newRoomName.trim()}
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
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 