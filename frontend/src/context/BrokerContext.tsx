"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import {
  apiClient,
  BrokerCredentials,
  BrokerStatus,
} from "../services/apiClient";

interface BrokerContextType {
  brokerStatus: BrokerStatus | null;
  isConnecting: boolean;
  error: string | null;
  connectBroker: (credentials: BrokerCredentials) => Promise<void>;
  disconnectBroker: () => Promise<void>;
  checkBrokerStatus: () => Promise<void>;
  clearError: () => void;
}

const BrokerContext = createContext<BrokerContextType | undefined>(undefined);

export function BrokerProvider({ children }: { children: ReactNode }) {
  const [brokerStatus, setBrokerStatus] = useState<BrokerStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkBrokerStatus = useCallback(async () => {
    try {
      const status = await apiClient.getBrokerStatus();
      setBrokerStatus(status);
      setError(null);
    } catch (err) {
      console.error("Failed to check broker status:", err);
      setBrokerStatus(null);
      // Don't set error for initial check - just means no broker connected
    }
  }, []);

  // Check broker status on mount
  useEffect(() => {
    checkBrokerStatus();
    // Poll broker status every 30 seconds
    const interval = setInterval(checkBrokerStatus, 30000);
    return () => clearInterval(interval);
  }, [checkBrokerStatus]);

  const connectBroker = useCallback(async (credentials: BrokerCredentials) => {
    setIsConnecting(true);
    setError(null);
    try {
      const status = await apiClient.connectBroker(credentials);
      setBrokerStatus(status);
      if (status.error) {
        setError(status.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to connect to broker";
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectBroker = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await apiClient.disconnectBroker();
      setBrokerStatus(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to disconnect from broker";
      setError(errorMessage);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <BrokerContext.Provider
      value={{
        brokerStatus,
        isConnecting,
        error,
        connectBroker,
        disconnectBroker,
        checkBrokerStatus,
        clearError,
      }}
    >
      {children}
    </BrokerContext.Provider>
  );
}

export function useBroker() {
  const context = useContext(BrokerContext);
  if (context === undefined) {
    throw new Error("useBroker must be used within BrokerProvider");
  }
  return context;
}
