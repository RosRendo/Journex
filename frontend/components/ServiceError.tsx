"use client";
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ServiceErrorProps {
  serviceName: string;
  port: number;
  errorMessage: string;
  onRetry?: () => void;
  mtConnected?: boolean;
}

export const ServiceError: React.FC<ServiceErrorProps> = ({
  serviceName,
  port,
  errorMessage,
  onRetry,
  mtConnected = false,
}) => {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-red-950/50 border border-red-700 rounded-lg p-8 backdrop-blur">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-900/50 rounded-full p-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-red-200 mb-2">
            Service Not Available
          </h2>

          {/* Service Name */}
          <p className="text-center text-red-100 mb-6">
            <span className="font-semibold">{serviceName}</span>
            <br />
            <span className="text-sm text-red-200/70">(Port {port})</span>
          </p>

          {/* Error Details */}
          <div className="bg-red-950/30 rounded border border-red-800/50 p-4 mb-6">
            <p className="text-red-200 text-sm whitespace-pre-wrap font-mono">
              {errorMessage}
            </p>
          </div>

          {/* MT5 Status */}
          {port !== 5003 && (
            <div className="mb-6 p-3 bg-yellow-950/30 border border-yellow-700/50 rounded">
              <p className="text-yellow-200 text-xs">
                <span className="font-semibold">MT5 Connection:</span>{" "}
                {mtConnected ? "✅ Connected" : "❌ Not Connected"}
              </p>
              {!mtConnected && (
                <p className="text-yellow-100/70 text-xs mt-1">
                  Services need MT5 Bridge to function properly
                </p>
              )}
            </div>
          )}

          {/* Troubleshooting */}
          <div className="bg-slate-800/50 rounded border border-slate-700/50 p-4 mb-6">
            <p className="text-slate-300 text-sm font-semibold mb-2">
              Troubleshooting:
            </p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>✓ Check if the service is running</li>
              <li>✓ Verify MetaTrader5 is logged in</li>
              <li>✓ Check the service terminal for errors</li>
              <li>✓ Try refreshing the page (F5)</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-red-600 hover:bg-red-700 text-foreground font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Connection
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-700 hover:bg-slate-600 text-foreground font-semibold py-3 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-slate-500 text-xs mt-4">
            Make sure Main.py is running all services
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceError;
