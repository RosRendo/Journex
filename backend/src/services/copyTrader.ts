import { buildAdapter } from "./terminalBrokerAdapter";

// Mock configuration of linked prop firm accounts
// In a real scenario, this would come from the database / settings page
const LINKED_ACCOUNTS = [
  { id: "master", name: "Personal Real", balance: 50000, riskMultiplier: 1.0, active: true },
  { id: "prop1", name: "FTMO Challenge 1", balance: 100000, riskMultiplier: 2.0, active: true }, // 2x balance
  { id: "prop2", name: "FundedNext", balance: 25000, riskMultiplier: 0.5, active: true }, // 0.5x balance
];

/**
 * Given an order, fans it out to all active linked accounts.
 * Mathematically scales the lot size based on account balance ratios.
 */
export async function executeCopyTrade(
  symbol: string,
  side: "BUY" | "SELL",
  volume: number, // Base volume on master account
  sl: number,
  tp: number
) {
  const masterAccount = LINKED_ACCOUNTS.find(a => a.id === "master");
  if (!masterAccount) throw new Error("Master account not configured");

  const results = [];

  for (const account of LINKED_ACCOUNTS) {
    if (!account.active) continue;

    // Calculate scaled volume (e.g., if master is 50k and prop1 is 100k, volume is 2x)
    const ratio = account.balance / masterAccount.balance;
    const scaledVolume = Math.max(0.01, Number((volume * ratio * account.riskMultiplier).toFixed(2)));

    console.log(`[CopyTrader] Preparing execution for ${account.name} (Balance: $${account.balance})`);
    console.log(`[CopyTrader] Scaling: Ratio=${ratio}, BaseVol=${volume} -> ScaledVol=${scaledVolume}`);

    if (account.id === "master") {
      // Execute the master account on the real local MT5 bridge
      try {
        const adapter = buildAdapter({});
        const res = await adapter.submitOrder(symbol, side, scaledVolume, sl, tp);
        results.push({ account: account.name, success: res.success !== false, order_id: res.id || `P-${Date.now()}`, volume: scaledVolume });
      } catch (e: any) {
        console.error(`[CopyTrader] Master execution failed:`, e);
        results.push({ account: account.name, success: false, error: e.message });
      }
    } else {
      // MOCK: Execute on remote prop firm (e.g., via MetaApi cloud)
      // We will mock the delay and success of this remote call
      console.log(`[CopyTrader] Routing order to remote server for ${account.name}...`);
      await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network delay
      
      const mockSuccess = true;
      if (mockSuccess) {
        console.log(`[CopyTrader] ✅ Success: ${account.name} executed ${side} ${scaledVolume} ${symbol}`);
        results.push({ account: account.name, success: true, order_id: `MOCK-${Date.now()}`, volume: scaledVolume });
      } else {
        results.push({ account: account.name, success: false, error: "Mock remote execution failed" });
      }
    }
  }

  return results;
}
