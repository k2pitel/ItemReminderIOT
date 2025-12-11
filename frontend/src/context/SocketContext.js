import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Determine socket URL: prefer env override, otherwise use dev/backend rule or current origin
      const SOCKET_URL =
        process.env.REACT_APP_SOCKET_URL ||
        (window.location.hostname === 'localhost' && window.location.port === '3000'
          ? 'http://localhost:5000'
          : `${window.location.protocol}//${window.location.host}`);
      console.log('Connecting to socket:', SOCKET_URL);

      const newSocket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        secure: SOCKET_URL.startsWith('https:')
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        
        // Authenticate socket connection
        newSocket.emit('authenticate', { userId: user._id });
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [isAuthenticated, user]);

  const value = {
    socket,
    connected
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
