// hooks/useWebSocket.ts

import { useEffect, useRef, useCallback, useState } from 'react';
import { WebSocketMessage, ConnectionStatus } from '../types/trading';

interface UseWebSocketProps {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  onOpen,
  onClose,
  onError,
  reconnectAttempts = 5,
  reconnectInterval = 3000
}: UseWebSocketProps) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      setConnectionStatus('connecting');
      setError(null);

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        if (!mountedRef.current) return;
        
        setConnectionStatus('connected');
        setError(null);
        reconnectCountRef.current = 0;
        console.log('WebSocket connected successfully');
        
        if (onOpen) {
          onOpen();
        }
      };

      wsRef.current.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastUpdate(new Date());
          
          if (onMessage) {
            onMessage(message);
          }
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError);
          setError('Failed to parse incoming data');
        }
      };

      wsRef.current.onclose = (event) => {
        if (!mountedRef.current) return;
        
        setConnectionStatus('disconnected');
        console.log('WebSocket disconnected:', event.reason);

        if (onClose) {
          onClose();
        }

        // Attempt to reconnect if not a manual close and we haven't exceeded attempts
        if (event.code !== 1000 && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`Attempting to reconnect... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval * reconnectCountRef.current); // Exponential backoff
        } else if (reconnectCountRef.current >= reconnectAttempts) {
          setError(`Failed to reconnect after ${reconnectAttempts} attempts`);
        }
      };

      wsRef.current.onerror = (errorEvent) => {
        if (!mountedRef.current) return;
        
        console.error('WebSocket error:', errorEvent);
        setError('WebSocket connection error');
        
        if (onError) {
          onError(errorEvent);
        }
      };

    } catch (connectionError) {
      console.error('Failed to create WebSocket connection:', connectionError);
      setConnectionStatus('disconnected');
      setError('Failed to establish WebSocket connection');
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Manual disconnect');
    }

    reconnectCountRef.current = 0;
    setConnectionStatus('disconnected');
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (sendError) {
        console.error('Failed to send WebSocket message:', sendError);
        setError('Failed to send message');
        return false;
      }
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
      return false;
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Heartbeat to detect disconnections
  useEffect(() => {
    if (connectionStatus === 'connected') {
      const heartbeatInterval = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'ping', timestamp: Date.now() });
        }
      }, 30000); // Send heartbeat every 30 seconds

      return () => clearInterval(heartbeatInterval);
    }
  }, [connectionStatus, sendMessage]);

  // Monitor connection health
  useEffect(() => {
    if (connectionStatus === 'connected' && lastUpdate) {
      const staleTimeout = setTimeout(() => {
        if (Date.now() - lastUpdate.getTime() > 60000) { // No data for 1 minute
          console.warn('No data received for 1 minute, connection may be stale');
          setError('Connection appears stale - no recent data');
        }
      }, 65000);

      return () => clearTimeout(staleTimeout);
    }
  }, [connectionStatus, lastUpdate]);

  return {
    connectionStatus,
    lastUpdate,
    error,
    connect,
    disconnect,
    sendMessage,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
    reconnectCount: reconnectCountRef.current
  };
};