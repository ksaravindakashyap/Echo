import { useEffect, useRef, useState } from "react";
import { Avatar } from "./ui/avatar";
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import { FiMoreVertical, FiSettings, FiLogOut, FiPaperclip, FiSmile } from 'react-icons/fi';
import { Delete as DeleteIcon } from '@mui/icons-material';
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
export default function ChatRoomUI({ socket }) {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('message', (msg) => {
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

    return () => {
      socket.off('message');
      socket.off('typing');
    };
  }, [socket, selectedRoom, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!draft.trim() || !selectedRoom) return;

    socket.emit('message', {
      roomId: selectedRoom.id,
      content: draft,
      username: user.username
    });
    setDraft("");
  };

  const handleTyping = (e) => {
    setDraft(e.target.value);
    if (selectedRoom) {
      socket.emit('typing', {
        roomId: selectedRoom.id,
        isTyping: e.target.value.length > 0,
        username: user.username
      });
    }
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setMessages([]);
    if (room) {
      socket.emit('join_room', { roomId: room.id }, (response) => {
        if (response.success) {
          socket.emit('get_room_messages', { roomId: room.id }, (response) => {
            if (response.success) {
              setMessages(response.messages || []);
            }
          });
        }
      });
    }
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

  return (
    <div className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-[280px] flex flex-col bg-white border-r">
        {/* User Profile */}
        <div className="p-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              {user?.username?.[0].toUpperCase()}
            </div>
            <span className="font-medium">{user?.username}</span>
          </div>
          <IconButton onClick={(e) => setUserMenuAnchorEl(e.currentTarget)}>
            <FiMoreVertical />
          </IconButton>
        </div>

        {/* Room List */}
        <RoomList
          socket={socket}
          onRoomSelect={handleRoomSelect}
          selectedRoom={selectedRoom}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#111111]">
        {/* Chat Header */}
        {selectedRoom && (
          <div className="h-[73px] px-6 flex items-center justify-between border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <h1 className="text-white text-xl font-semibold">
                {selectedRoom.name}
              </h1>
            </div>
            <IconButton sx={{ color: '#666666', '&:hover': { color: 'white' } }}>
              <FiSettings />
            </IconButton>
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
                            ? 'bg-[#6366f1] text-white rounded-tr-none'
                            : 'bg-[#2A2A2A] text-white rounded-tl-none'
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
                <div className="flex items-center gap-2 text-[#666666] text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-[#666666] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#666666] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#666666] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>
                    {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t border-[#2A2A2A] bg-[#1A1A1A]">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-2 text-[#666666] hover:text-white transition-colors"
                >
                  <FiPaperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={handleTyping}
                  placeholder="Type your message here..."
                  className="flex-1 bg-[#2A2A2A] text-white rounded-full px-6 py-3 focus:outline-none focus:ring-2 focus:ring-[#6366f1] placeholder-[#666666]"
                />
                <button
                  type="button"
                  className="p-2 text-[#666666] hover:text-white transition-colors"
                >
                  <FiSmile className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="p-3 rounded-full bg-[#6366f1] text-white hover:bg-[#4f46e5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#666666]">
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
            bgcolor: '#1A1A1A',
            color: 'white',
            border: '1px solid #2A2A2A',
            '& .MuiMenuItem-root': {
              color: 'white',
              '&:hover': {
                bgcolor: '#2A2A2A',
              },
            },
            '& .MuiListItemIcon-root': {
              color: '#666666',
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
        <Divider sx={{ bgcolor: '#2A2A2A' }} />
        <MenuItem onClick={() => {
          setUserMenuAnchorEl(null);
        }}>
          <ListItemIcon>
            <DeleteIcon />
          </ListItemIcon>
          <ListItemText>Delete Profile</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
} 