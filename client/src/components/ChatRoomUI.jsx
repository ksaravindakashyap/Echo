import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { FiLogOut, FiSearch, FiMoreVertical, FiSmile, FiPaperclip, FiChevronDown } from 'react-icons/fi';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

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
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [userStatuses, setUserStatuses] = useState(new Map());
  const [filteredUsers, setFilteredUsers] = useState([]);
  const scrollRef = useRef(null);
  const searchTimeoutRef = useRef(null);

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
      setMessages((prev) => [...prev, {
        id: Date.now(),
        author: msg.user,
        text: msg.text,
        ts: msg.timestamp
      }]);
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

    socket.on('userTyping', ({ user, isTyping }) => {
      if (user !== username) {
        setTypingUser(user);
        updateUserStatus(user, 'online');
        setTimeout(() => setTypingUser(null), 2000);
      }
    });

    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userList');
      socket.off('userTyping');
    };
  }, [socket, username]);

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
    if (!draft.trim()) return;
    socket.emit('message', { text: draft });
    setDraft("");
    updateUserStatus(username, 'online');
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      socket.emit('typing', true);
      updateUserStatus(username, 'online');
    }
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

  return (
    <div className="h-screen flex">
      {/* Left Sidebar */}
      <div className="w-64 border-r flex flex-col bg-[#111827] text-white">
        {/* App Title and Search */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold mb-4">JustChat</h1>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Users List (excluding current user) */}
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <div className="space-y-2">
              {filteredUsers.map((name) => (
                <div
                  key={name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800"
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-gray-700 text-white">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#111827] ${getStatusColor(name)}`} />
                  </div>
                  <span className="flex-1 truncate">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>GC</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">Group Chat</h2>
              <p className="text-sm text-gray-500">{onlineUsers.length} participants</p>
            </div>
          </div>
          <div className="relative">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#A855F7] text-white">
                      {username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(username)}`} />
                </div>
                <FiChevronDown />
              </Button>
            </div>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5"
                >
                  <div className="py-1">
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full"
                    >
                      <FiLogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          <div className="space-y-4">
            {messages.map(({ id, author, text, ts }) => {
              const isSelf = author === username;
              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex items-start gap-3 max-w-[70%] ${isSelf ? "flex-row-reverse" : ""}`}>
                    {!isSelf && (
                      <Avatar className="mt-1">
                        <AvatarFallback>
                          {author.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`rounded-2xl p-3 ${isSelf ? "bg-[#A855F7] text-white" : "bg-white"}`}>
                      {!isSelf && <p className="font-medium text-sm mb-1">{author}</p>}
                      <p className="text-sm">{text}</p>
                      <p className="text-[10px] mt-1 opacity-70 text-right">
                        {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Typing Indicator */}
        {typingUser && (
          <div className="px-6 py-2">
            <p className="text-sm text-gray-500">{typingUser} is typing...</p>
          </div>
        )}

        {/* Message Input */}
        <div className="p-4 bg-white border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2"
          >
            <Button type="button" variant="ghost" size="icon">
              <FiPaperclip />
            </Button>
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your message..."
              className="flex-1"
            />
            <div className="relative">
              <Button 
                type="button" 
                variant="ghost" 
                size="icon"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <FiSmile />
              </Button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2">
                  <Picker 
                    data={data} 
                    onEmojiSelect={onEmojiSelect}
                    theme="light"
                  />
                </div>
              )}
            </div>
            <Button 
              type="submit" 
              disabled={!draft.trim()}
              className="bg-[#A855F7] text-white hover:bg-[#9333EA]"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 