import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { FiLogOut, FiSearch, FiMoreVertical, FiSmile, FiPaperclip, FiChevronDown } from 'react-icons/fi';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from "@mui/material";
import { TextField } from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from "../contexts/AuthContext";
import RoomList from "./RoomList";

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
export default function ChatRoomUI({ socket, username, onLogout }) {
  const { user, logout } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userStatuses, setUserStatuses] = useState(new Map());
  const [filteredUsers, setFilteredUsers] = useState([]);
  const scrollRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [showDeleteProfileDialog, setShowDeleteProfileDialog] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  useEffect(() => {
    // Filter users based on search query and exclude current user
    const filtered = onlineUsers.filter(name => 
      name !== username && name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, onlineUsers, username]);

  useEffect(() => {
    if (!socket) return;

    socket.on('message', (msg) => {
      if (msg.roomId === selectedRoom?.id) {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          author: msg.user,
          text: msg.text,
          ts: msg.timestamp
        }]);
      }
      // Reset user's inactivity timer when they send a message
      updateUserStatus(msg.user, 'online');
    });

    socket.on('userJoined', ({ user, users }) => {
      setOnlineUsers(users);
      updateUserStatus(user, 'online');
    });

    socket.on('userLeft', ({ user, users }) => {
      setOnlineUsers(users);
      setUserStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.delete(user);
        return newStatuses;
      });
    });

    socket.on('userList', ({ users }) => {
      setOnlineUsers(users);
      users.forEach(user => updateUserStatus(user, 'online'));
    });

    socket.on('userTyping', ({ user, isTyping, roomId }) => {
      if (user !== username && roomId === selectedRoom?.id) {
        setTypingUser(user);
        updateUserStatus(user, 'online');
        setTimeout(() => setTypingUser(null), 2000);
      }
    });

    socket.on('joinRoom', ({ roomId, messages: roomMessages }) => {
      setMessages(roomMessages.map(msg => ({
        id: msg.id || Date.now(),
        author: msg.user,
        text: msg.text,
        ts: msg.timestamp
      })));
    });

    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userList');
      socket.off('userTyping');
      socket.off('joinRoom');
    };
  }, [socket, username, selectedRoom]);

  const updateUserStatus = (user, status) => {
    setUserStatuses(prev => {
      const newStatuses = new Map(prev);
      newStatuses.set(user, status);
      
      // Clear existing timeout
      if (searchTimeoutRef.current?.[user]) {
        clearTimeout(searchTimeoutRef.current[user]);
      }

      // Set new timeout for inactivity
      if (!searchTimeoutRef.current) searchTimeoutRef.current = {};
      searchTimeoutRef.current[user] = setTimeout(() => {
        setUserStatuses(prev => {
          const newStatuses = new Map(prev);
          newStatuses.set(user, 'away');
          return newStatuses;
        });
      }, 30000); // 30 seconds

      return newStatuses;
    });
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!draft.trim() || !selectedRoom) return;
    socket.emit('message', { text: draft, roomId: selectedRoom.id });
    setDraft("");
    updateUserStatus(username, 'online');
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (selectedRoom) {
      socket.emit('typing', { isTyping: true, roomId: selectedRoom.id });
      updateUserStatus(username, 'online');
    }
  };

  const handleRoomSelect = (room) => {
    if (room) {
      socket.emit('joinRoom', { roomId: room.id });
    }
    setSelectedRoom(room);
    setMessages([]);
  };

  const getStatusColor = (user) => {
    const status = userStatuses.get(user);
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const onEmojiSelect = (emoji) => {
    setDraft(prev => prev + emoji.native);
    setShowEmojiPicker(false);
  };

  const handleUserMenuClick = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  const handleLogout = () => {
    if (socket) {
      socket.emit('user_logout');
    }
    logout();
  };

  const handleDeleteProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete profile');
      }

      if (socket) {
        socket.emit('user_logout');
      }
      logout();
    } catch (error) {
      console.error('Error deleting profile:', error);
      alert('Failed to delete profile. Please try again.');
    }
    setShowDeleteProfileDialog(false);
    setUserMenuAnchorEl(null);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* User Profile */}
        <div className="p-4 border-b flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>{user?.username?.[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user?.username}</span>
          </div>
          <IconButton onClick={(e) => setUserMenuAnchorEl(e.currentTarget)}>
            <FiMoreVertical />
          </IconButton>
        </div>

        {/* Room List */}
        <div className="flex-1 overflow-hidden">
          <RoomList
            socket={socket}
            onRoomSelect={handleRoomSelect}
            selectedRoom={selectedRoom}
          />
        </div>

        {/* Online Users */}
        <div className="border-t">
          <div className="p-4">
            <div className="flex items-center space-x-2 mb-4">
              <FiSearch className="text-gray-400" />
              <Input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="font-medium text-sm text-gray-500 mb-2">
              Online Users ({filteredUsers.length})
            </div>
            <ScrollArea className="h-48">
              {filteredUsers.map(user => (
                <div key={user} className="flex items-center space-x-3 py-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(user)}`} />
                  <span>{user}</span>
                </div>
              ))}
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">{selectedRoom.name}</h2>
              <div className="text-sm text-gray-500">
                {selectedRoom.participants?.length || 0} participants
              </div>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollRef} className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.author === user?.username ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`rounded-lg px-4 py-2 max-w-[70%] ${
                        msg.author === user?.username
                          ? "bg-[#A855F7] text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      {msg.author !== user?.username && (
                        <div className="text-sm font-medium mb-1">{msg.author}</div>
                      )}
                      <div>{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              {typingUser && (
                <div className="text-sm text-gray-500 mt-2">
                  {typingUser} is typing...
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Type a message..."
                    className="pr-24"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                      <FiSmile />
                    </IconButton>
                    <IconButton>
                      <FiPaperclip />
                    </IconButton>
                  </div>
                </div>
                <Button onClick={sendMessage}>Send</Button>
              </div>
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4">
                  <Picker data={data} onEmojiSelect={onEmojiSelect} />
                </div>
              )}
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
        onClose={handleUserMenuClose}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <FiLogOut />
          </ListItemIcon>
          <ListItemText>Sign Out</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          setShowDeleteProfileDialog(true);
          setUserMenuAnchorEl(null);
        }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete Profile</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Profile Dialog */}
      <Dialog open={showDeleteProfileDialog} onClose={() => setShowDeleteProfileDialog(false)}>
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your profile? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteProfileDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
} 