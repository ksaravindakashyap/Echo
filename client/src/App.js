import React, { useState } from 'react';
import io from 'socket.io-client';
import ChatRoom from './components/ChatRoomUI';
import './index.css';

const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    const newSocket = io(SOCKET_SERVER_URL);
    setSocket(newSocket);
    newSocket.emit('join', username);
    setIsJoined(true);
  };

  return (
    <>
      {!isJoined ? (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center">Join Chat</h1>
            <form onSubmit={handleJoin} className="space-y-4">
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Join
              </button>
            </form>
          </div>
        </div>
      ) : (
        <ChatRoom socket={socket} username={username} />
      )}
    </>
  );
}

export default App; 