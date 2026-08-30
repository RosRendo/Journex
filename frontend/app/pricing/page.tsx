"use client";

import { useState } from "react";
import { Check, Zap, Shield, Crown } from "lucide-react";
import axios from "axios";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (productId: string) => {
    setLoading(true);
    try {
      // Call our new backend route
      const response = await axios.post("/api/payments/checkout", { productId });
      if (response.data.checkoutUrl) {
        // Redirect to Dodo Payments Checkout
        window.location.href = response.data.checkoutUrl;
      }
    } catch (error) {
      console.error("Failed to initiate checkout", error);
      alert("Failed to connect to payment gateway. Ensure you are logged in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-20 px-6">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
          Level Up Your Trading
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16">
          Connect directly to MetaApi, journal your trades automatically, and get advanced sentiment insights.
        </p>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="relative p-8 rounded-lg border border-border bg-card shadow-sm flex flex-col items-start text-left">
            <h3 className="text-2xl font-semibold mb-2">Hobbyist</h3>
            <p className="text-muted-foreground mb-6">Perfect for testing the waters with mock data.</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-violet-500" />
                <span>Basic Trade Journaling</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-violet-500" />
                <span>Mock Broker Integration</span>
              </li>
              <li className="flex items-center gap-3 text-muted-foreground">
                <Check className="w-5 h-5 opacity-50" />
                <span>Manual Entry Only</span>
              </li>
            </ul>

            <button className="w-full h-12 rounded-xl bg-muted text-foreground font-semibold hover:bg-accent transition" disabled>
              Current Plan
            </button>
          </div>

          {/* Pro Tier */}
          <div className="relative p-8 rounded-lg border-2 border-[rgba(32,224,178,0.3)] bg-[#20e0b2]/5 flex flex-col items-start text-left transform scale-105">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
              <Crown className="w-4 h-4" />
              MOST POPULAR
            </div>
            
            <h3 className="text-2xl font-semibold mb-2">Professional</h3>
            <p className="text-muted-foreground mb-6">Live market data, automated syncs, and MetaApi support.</p>
            <div className="mb-6">
              <span className="text-4xl font-bold">$49</span>
              <span className="text-muted-foreground">/mo</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-center gap-3 font-medium">
                <Zap className="w-5 h-5 text-violet-500" />
                <span>Cloud MetaApi Support (MT4/MT5)</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-violet-500" />
                <span>OANDA Live Support</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-violet-500" />
                <span>Advanced AI Sentiment Tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-violet-500" />
                <span>Priority Discord Alerts</span>
              </li>
            </ul>

            <button 
              onClick={() => handleSubscribe("pdt_YOUR_DODO_PRODUCT_ID")} // Replace with Dodo Product ID
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition shadow-lg shadow-violet-500/25 flex items-center justify-center"
            >
              {loading ? "Processing..." : "Upgrade to Pro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

