import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface WebSocketHook {
  isConnected: boolean;
  socket: Socket | null;
  subscribe: (event: string, handler: (data: any) => void) => void;
  unsubscribe: (event: string) => void;
  emit: (event: string, data?: any) => void;
}

export const useWebSocket = (): WebSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const { token } = useSelector((state: RootState) => state.auth);
  const eventHandlers = useRef<Map<string, (data: any) => void>>(new Map());

  useEffect(() => {
    if (!token) {
      // Disconnect if no token
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Handle reconnection
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      setIsConnected(false);
    });

    // Set up event handlers that were registered before connection
    eventHandlers.current.forEach((handler, event) => {
      newSocket.on(event, handler);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    eventHandlers.current.set(event, handler);
    
    if (socket) {
      socket.on(event, handler);
    }
  }, [socket]);

  const unsubscribe = useCallback((event: string) => {
    eventHandlers.current.delete(event);
    
    if (socket) {
      socket.off(event);
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  return {
    isConnected,
    socket,
    subscribe,
    unsubscribe,
    emit
  };
};