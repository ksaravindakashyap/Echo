import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { motion } from "framer-motion";

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
export default function ChatRoom({ socket, username }) {
  const [onlineUsers, setOnlineUsers] = useState([]); // ["Aravinda", "Ani"]
  const [messages, setMessages] = useState([]);       // {id, author, text, ts}
  const [draft, setDraft] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const scrollRef = useRef(null);

  /* ───────────────────────── WebSocket wiring */
  useEffect(() => {
    if (!socket) return;

    socket.on('message', (msg) => {
      setMessages((prev) => [...prev, {
        id: Date.now(),
        author: msg.user,
        text: msg.text,
        ts: msg.timestamp
      }]);
    });

    socket.on('userJoined', ({ user, users }) => {
      setOnlineUsers(users);
    });

    socket.on('userLeft', ({ user, users }) => {
      setOnlineUsers(users);
    });

    socket.on('userTyping', ({ user, isTyping }) => {
      if (user !== username) {
        setTypingUser(user);
        setTimeout(() => setTypingUser(null), 2000);
      }
    });

    return () => {
      socket.off('message');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userTyping');
    };
  }, [socket, username]);

  /* ───────────────────────── UX helpers */
  useEffect(() => {
    // always scroll to latest
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!draft.trim()) return;
    socket.emit('message', { text: draft });
    setDraft("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    } else {
      socket.emit('typing', true);
    }
  };

  /* ───────────────────────── Render */
  return (
    <div className="h-screen w-full bg-muted/40 grid lg:grid-cols-[250px_1fr]">
      {/* Online users sidebar */}
      <aside className="hidden lg:block border-r bg-background/70 backdrop-blur-xl">
        <Card className="m-4 shadow-none">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Online • {onlineUsers.length}</h2>
            <ScrollArea className="h-[calc(100vh_-_8rem)] pr-2">
              <ul className="space-y-2">
                {onlineUsers.map((name) => (
                  <li key={name} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{name}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      {/* Chat viewport */}
      <main className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-background/70 backdrop-blur-xl flex items-center gap-3">
          <h1 className="text-xl font-semibold flex-1">💬 Socket Chat</h1>
          <span className="text-sm text-muted-foreground">Signed in as {username}</span>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4 space-y-3">
          {messages.map(({ id, author, text, ts }) => {
            const isSelf = author === username;
            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isSelf ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[65%] rounded-2xl p-3 text-sm shadow-sm break-words ${isSelf ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  <span className="block font-medium mb-1">{author}</span>
                  <p>{text}</p>
                  <span className="block text-[10px] mt-1 text-muted-foreground text-right">{new Date(ts).toLocaleTimeString()}</span>
                </div>
              </motion.div>
            );
          })}
        </ScrollArea>

        {/* Typing indicator */}
        {typingUser && (
          <motion.p
            className="px-6 text-xs text-muted-foreground mb-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {typingUser} is typing…
          </motion.p>
        )}

        {/* Composer */}
        <div className="px-6 py-4 border-t bg-background/70 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-3"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="flex-1"
            />
            <Button type="submit" disabled={!draft.trim()}>Send</Button>
          </form>
        </div>
      </main>
    </div>
  );
} 