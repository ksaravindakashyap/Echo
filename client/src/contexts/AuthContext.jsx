import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    // Check for stored auth data
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        console.log('[Auth] Restoring auth from storage:', authData);
        if (authData.user && authData.user.id) {
          setUser(authData.user);
          // Authenticate socket connection
          if (socket) {
            console.log('[Auth] Authenticating socket with user:', authData.user.id);
            socket.emit('authenticate', { userId: authData.user.id });
          }
        } else {
          console.log('[Auth] Invalid user data in storage');
          localStorage.removeItem('auth');
        }
      } catch (error) {
        console.error('[Auth] Error restoring auth:', error);
        localStorage.removeItem('auth');
      }
    }
    setLoading(false);
  }, [socket]);

  const login = async (email, password) => {
    try {
      console.log('[Auth] Attempting login...');
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (!data.user || !data.user.id) {
        throw new Error('Invalid user data received from server');
      }

      console.log('[Auth] Login successful, user:', data.user);
      // Store auth data
      localStorage.setItem('auth', JSON.stringify(data));
      setUser(data.user);

      // Authenticate socket connection
      if (socket) {
        console.log('[Auth] Authenticating socket after login:', data.user.id);
        socket.emit('authenticate', { userId: data.user.id });
      }

      navigate('/chat');
      return { success: true };
    } catch (error) {
      console.error('[Auth] Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, username, password) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
        credentials: 'include'
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store auth data
      localStorage.setItem('auth', JSON.stringify(data));
      setUser(data.user);

      // Authenticate socket connection
      if (socket) {
        socket.emit('authenticate', { userId: data.user.id });
      }

      navigate('/chat');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log('[Auth] Logging out...');
    if (socket) {
      socket.emit('user_logout');
    }
    localStorage.removeItem('auth');
    setUser(null);
    navigate('/login');
  };

  const value = {
    user,
    login,
    logout,
    register,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 