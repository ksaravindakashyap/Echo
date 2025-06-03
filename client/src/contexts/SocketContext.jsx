import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    console.log('Initializing socket connection...');
    const newSocket = io(SOCKET_SERVER_URL, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      // Re-authenticate if there's a stored auth token
      const storedAuth = localStorage.getItem('auth');
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        console.log('Re-authenticating with stored credentials');
        newSocket.emit('authenticate', { userId: authData.user.id });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 