import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import ChatRoomList from './ChatRoomList';
import UserMenu from './UserMenu';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Avatar,
  Grid,
  Divider,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import EmojiPicker from './EmojiPicker';

const Chat = () => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (message) => {
      if (message.roomId === currentRoom?.id) {
        setMessages(prev => [...prev, message]);
      }
    };

    const handleTyping = ({ userId, roomId, isTyping }) => {
      if (roomId === currentRoom?.id && userId !== user.id) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    };

    socket.on('message', handleMessage);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message', handleMessage);
      socket.off('typing', handleTyping);
    };
  }, [socket, currentRoom, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentRoom) {
      // Load room messages
      socket.emit('get_room_messages', { roomId: currentRoom.id }, (response) => {
        if (response.success) {
          setMessages(response.messages);
        }
      });
    } else {
      setMessages([]);
    }
  }, [currentRoom, socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom) return;

    socket.emit('message', {
      roomId: currentRoom.id,
      content: newMessage
    });
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!currentRoom) return;

    socket.emit('typing', {
      roomId: currentRoom.id,
      isTyping: true
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', {
        roomId: currentRoom.id,
        isTyping: false
      });
    }, 1000);
  };

  const handleRoomSelect = (room) => {
    setCurrentRoom(room);
    setTypingUsers(new Set());
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji.native);
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex',
      bgcolor: 'background.default'
    }}>
      {/* Left Sidebar */}
      <Box sx={{ 
        width: 300, 
        borderRight: 1, 
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h6">Echo</Typography>
          <UserMenu />
        </Box>
        <ChatRoomList onRoomSelect={handleRoomSelect} />
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <Typography variant="h6">{currentRoom.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {currentRoom.member_count || 0} participants
              </Typography>
            </Box>

            {/* Messages Area */}
            <Box sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}>
              {messages.map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.userId === user.id ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      flexDirection: message.userId === user.id ? 'row-reverse' : 'row',
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {message.username?.[0]?.toUpperCase()}
                    </Avatar>
                    <Paper
                      sx={{
                        p: 1,
                        bgcolor: message.userId === user.id ? 'primary.main' : 'background.paper',
                        color: message.userId === user.id ? 'primary.contrastText' : 'text.primary',
                        maxWidth: '70%',
                      }}
                    >
                      <Typography variant="body1">{message.content}</Typography>
                    </Paper>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, color: 'text.secondary' }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
              {typingUsers.size > 0 && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {Array.from(typingUsers).join(', ')} typing...
                </Typography>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Message Input */}
            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <EmojiPicker onEmojiSelect={handleEmojiSelect} />
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleTyping}
                size="small"
              />
              <IconButton
                type="submit"
                color="primary"
                disabled={!newMessage.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          // Welcome Screen
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Typography variant="h4" color="text.secondary">
              Welcome to Echo
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Select a chat room from the sidebar or create a new one to start messaging
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Chat; 