import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const initializeSocket = useCallback(() => {
    console.log('[Socket] Initializing socket connection...');
    
    // Get auth token
    const storedAuth = localStorage.getItem('auth');
    const authData = storedAuth ? JSON.parse(storedAuth) : null;
    
    if (!authData?.token) {
      console.log('[Socket] No auth token found, skipping connection');
      return;
    }

    // Clean up existing socket if any
    if (socket) {
      console.log('[Socket] Cleaning up existing socket');
      socket.disconnect();
    }

    const newSocket = io(SOCKET_SERVER_URL, {
      auth: {
        token: authData.token
      },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected successfully with ID:', newSocket.id);
      setIsConnected(true);
      if (authData?.user?.id) {
        console.log('[Socket] Authenticating with user ID:', authData.user.id);
        newSocket.emit('authenticate', { userId: authData.user.id }, (response) => {
          if (response?.success) {
            console.log('[Socket] Authentication successful');
          } else {
            console.error('[Socket] Authentication failed:', response?.error);
            // Retry authentication
            setTimeout(() => {
              newSocket.emit('authenticate', { userId: authData.user.id });
            }, 2000);
          }
        });
      }
    });

    newSocket.on('user_status_update', ({ userId, status }) => {
      console.log(`[Socket] Status update received for user ${userId}: ${status}`);
    });

    newSocket.on('error', (error) => {
      console.error('[Socket] General socket error:', error);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
      setIsConnected(false);
      
      // Try to reconnect if token is still valid
      const currentAuth = localStorage.getItem('auth');
      const currentAuthData = currentAuth ? JSON.parse(currentAuth) : null;
      
      if (currentAuthData?.token) {
        console.log('[Socket] Attempting to reconnect with current token...');
        newSocket.auth = { token: currentAuthData.token };
        setTimeout(() => {
          newSocket.connect();
        }, 2000);
      } else {
        console.log('[Socket] No valid token found, not attempting reconnection');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        const currentAuth = localStorage.getItem('auth');
        const currentAuthData = currentAuth ? JSON.parse(currentAuth) : null;
        
        if (currentAuthData?.token) {
          console.log('[Socket] Attempting to reconnect after disconnect...');
          newSocket.auth = { token: currentAuthData.token };
          setTimeout(() => {
            newSocket.connect();
          }, 2000);
        }
      }
    });

    setSocket(newSocket);
    return newSocket;
  }, [socket]);

  // Initialize socket on mount and token change
  useEffect(() => {
    const newSocket = initializeSocket();
    
    // Cleanup function
    return () => {
      console.log('[Socket] Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // Only run on mount

  // Listen for auth changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth') {
        console.log('[Socket] Auth data changed, reinitializing socket');
        initializeSocket();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [initializeSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 