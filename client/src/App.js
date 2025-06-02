import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import ChatRoomUI from './components/ChatRoomUI';
import Login from './components/Login';
import './index.css';

const SOCKET_SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData && userData.token) {
          // Create socket connection with stored credentials
          const newSocket = io(SOCKET_SERVER_URL, {
            auth: {
              token: userData.token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
          });

          // Handle successful connection
          newSocket.on('connect', () => {
            setSocket(newSocket);
            setUsername(userData.username);
            setIsAuthenticated(true);
            newSocket.emit('join', { username: userData.username });
          });

          // Handle connection errors
          newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
            if (error.message === 'Authentication error') {
              localStorage.removeItem('userData');
              setIsAuthenticated(false);
              setUsername('');
              setSocket(null);
            }
          });
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        localStorage.removeItem('userData');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    // Save auth data to localStorage
    localStorage.setItem('userData', JSON.stringify({
      token: userData.token,
      username: userData.username,
      userId: userData.userId
    }));

    // Create socket connection with auth token
    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        token: userData.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      setSocket(newSocket);
      setUsername(userData.username);
      setIsAuthenticated(true);
      newSocket.emit('join', { username: userData.username });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (error.message === 'Authentication error') {
        localStorage.removeItem('userData');
        setIsAuthenticated(false);
        setUsername('');
        setSocket(null);
      }
    });
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUsername('');
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A855F7]"></div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <ChatRoomUI 
          socket={socket} 
          username={username} 
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

export default App; 