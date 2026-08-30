"use client";

import React, { useState, useRef } from "react";
import { useCsvUpload } from "@/hooks/useCsvUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Upload, TrendingUp } from "lucide-react";

const SUPPORTED_BROKERS = [
  { value: "MetaTrader 5", label: "MetaTrader 5 (MT5)" },
  { value: "MetaTrader 4", label: "MetaTrader 4 (MT4)" },
  { value: "cTrader", label: "cTrader" },
  { value: "IC Markets", label: "IC Markets" },
  { value: "Pepperstone", label: "Pepperstone" },
];

export default function CsvUploadComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading, error, result, uploadCsv, calculateAnalytics } =
    useCsvUpload();

  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedBroker) {
      alert("Please select a CSV file and broker");
      return;
    }

    setUploadProgress(0);
    const simulateProgress = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(simulateProgress);
          return prev;
        }
        return prev + Math.random() * 30;
      });
    }, 200);

    const uploadResult = await uploadCsv(
      selectedFile,
      selectedBroker,
      accountNumber,
    );

    clearInterval(simulateProgress);
    setUploadProgress(100);

    if (uploadResult) {
      setShowResults(true);
      setTimeout(() => {
        setUploadProgress(0);
        setSelectedFile(null);
        setAccountNumber("");
        setSelectedBroker("");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2000);
    }
  };

  const analytics =
    result && result.trades ? calculateAnalytics(result.trades) : null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            CSV Import Workflow
          </CardTitle>
          <CardDescription>
            Export CSV from broker → Upload → Backend parses → Analytics ready
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Select Broker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              1. Select Your Broker
            </label>
            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your broker..." />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_BROKERS.map((broker) => (
                  <SelectItem key={broker.value} value={broker.value}>
                    {broker.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the broker you exported the CSV from
            </p>
          </div>

          {/* Step 2: Account Number (Optional) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              2. Account Number (Optional)
            </label>
            <Input
              placeholder="e.g., 123456789"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              For tracking multiple accounts from the same broker
            </p>
          </div>

          {/* Step 3: File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              3. Upload CSV File
            </label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={loading}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Browse
              </Button>
            </div>
            {selectedFile && (
              <p className="text-xs text-green-600">
                ✓ Selected: {selectedFile.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              CSV files up to 50MB are supported
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading and processing...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedBroker || loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Processing..." : "Upload & Parse CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Results Card */}
      {showResults && result && analytics && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Upload Successful ✓
            </CardTitle>
            <CardDescription>
              {result.fileName} • {result.metrics?.totalTrades || 0} trades imported
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Total Trades</p>
                <p className="text-2xl font-bold">{analytics.totalTrades}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold">
                  {analytics.winRate.toFixed(1)}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Profit Factor</p>
                <p className="text-2xl font-bold">
                  {analytics.profitFactor.toFixed(2)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Total P&L</p>
                <p
                  className={`text-2xl font-bold ${analytics.totalProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                    }`}
                >
                  {analytics.totalProfit >= 0 ? "+" : ""}
                  {analytics.totalProfit.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="bg-white p-4 rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Winning Trades:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    {analytics.winningTrades}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Losing Trades:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    {analytics.losingTrades}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Break Even:</span>
                  <span className="ml-2 font-semibold">
                    {analytics.breakEvenTrades}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Best Trade:</span>
                  <span className="ml-2 font-semibold text-green-600">
                    +{analytics.bestTrade.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Worst Trade:</span>
                  <span className="ml-2 font-semibold text-red-600">
                    {analytics.worstTrade.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Avg Win / Loss:</span>
                  <span className="ml-2 font-semibold">
                    {analytics.avgWin.toFixed(2)} /{" "}
                    {Math.abs(analytics.avgLoss).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Top Pairs */}
            {analytics.pairs && analytics.pairs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Top Trading Pairs
                </h3>
                <div className="grid gap-2">
                  {analytics.pairs.slice(0, 5).map((pair) => (
                    <div
                      key={pair.pair}
                      className="flex items-center justify-between bg-white p-2 rounded text-sm"
                    >
                      <span className="font-medium">{pair.pair}</span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">
                          {pair.wins}W-{pair.losses}L
                        </Badge>
                        <span
                          className={
                            pair.profit >= 0
                              ? "text-green-600 font-semibold"
                              : "text-red-600 font-semibold"
                          }
                        >
                          {pair.profit >= 0 ? "+" : ""}
                          {pair.profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 text-sm text-green-700 bg-white p-3 rounded">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Successfully imported {result.metrics?.successCount} trades from{" "}
                {result.brokerName}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">1.</span>
              <span>
                <strong>Export:</strong> From your broker terminal (MT5, MT4,
                cTrader, etc.), export your closed trades as CSV
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">2.</span>
              <span>
                <strong>Upload:</strong> Select the CSV file and upload via this
                form
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">3.</span>
              <span>
                <strong>Parse:</strong> Our backend automatically detects your
                broker format and parses the data
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">4.</span>
              <span>
                <strong>Save:</strong> All trades are validated and saved to
                your account
              </span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-blue-600">5.</span>
              <span>
                <strong>Analytics:</strong> View detailed performance metrics
                and analyze your trading
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

