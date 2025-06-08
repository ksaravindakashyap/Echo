import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authChangeCounter, setAuthChangeCounter] = useState(0);

  // Listen for auth changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth') {
        console.log('[Socket] Auth data changed, reinitializing socket...');
        setAuthChangeCounter(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    console.log('[Socket] Checking for auth data...');
    const auth = localStorage.getItem('auth');
    if (!auth) {
      console.log('[Socket] No auth data, not connecting');
      setSocket(null);
      setIsConnected(false);
      return;
    }

    let authData;
    try {
      authData = JSON.parse(auth);
      console.log('[Socket] Parsed auth data:', authData);
    } catch (error) {
      console.error('[Socket] Invalid auth data:', error);
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (!authData.token || !authData.user?.id) {
      console.log('[Socket] Missing token or user data');
      setSocket(null);
      setIsConnected(false);
      return;
    }

    console.log('[Socket] Initializing socket connection for user:', authData.user.id);
    
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: {
        token: authData.token
      },
      transports: ['websocket', 'polling'], // Allow fallback to polling
      timeout: 20000,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      forceNew: true // Ensure fresh connection
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected successfully');
      setIsConnected(true);
      
      // Small delay before authenticating to ensure connection is stable
      setTimeout(() => {
        if (authData.user?.id) {
          console.log('[Socket] Sending authentication for user:', authData.user.id);
          newSocket.emit('authenticate', { userId: authData.user.id });
        }
      }, 100);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('reconnect', () => {
      console.log('[Socket] Reconnected');
      setIsConnected(true);
      
      // Re-authenticate on reconnection with delay
      setTimeout(() => {
        if (authData.user?.id) {
          console.log('[Socket] Re-authenticating user:', authData.user.id);
          newSocket.emit('authenticate', { userId: authData.user.id });
        }
      }, 100);
    });

    setSocket(newSocket);

    return () => {
      console.log('[Socket] Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [authChangeCounter]); // Re-run when auth changes

  const value = {
    socket,
    isConnected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 