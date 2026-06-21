const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  const days = 30;
  const bridgeUrl = process.env.LOCAL_MT5_URL || 'http://127.0.0.1:5003';
  
  console.log(`Fetching from: ${bridgeUrl}/api/history?days=${days}`);
  const response = await fetch(`${bridgeUrl}/api/history?days=${days}`);
  const data = await response.json();
  
  if (!data.success) {
    console.log("Failed!", data);
    return;
  }
  
  const mt5Trades = data.trades || [];
  let synced = 0;
  
  for (const t of mt5Trades) {
    if (!t.ticket) continue;
    
    const outcome = t.profit >= 0 ? 'Win' : 'Loss';
    
    const existing = await prisma.trade.findFirst({
      where: { ticket: String(t.ticket) }
    });
    
    if (existing) {
      await prisma.trade.update({
        where: { id: existing.id },
        data: {
          closePrice: t.closePrice,
          profit: t.profit,
          outcome: outcome,
          closeTime: t.closeTime ? new Date(t.closeTime) : null,
          commission: t.commission,
          lotSize: t.lotSize,
        }
      });
    } else {
      await prisma.trade.create({
        data: {
          date: t.openTime ? new Date(t.openTime) : new Date(t.closeTime),
          pair: t.pair,
          direction: t.direction,
          entry: t.entry || t.closePrice,
          outcome: outcome,
          ticket: String(t.ticket),
          lotSize: t.lotSize,
          profit: t.profit,
          closePrice: t.closePrice,
          openTime: t.openTime ? new Date(t.openTime) : null,
          closeTime: t.closeTime ? new Date(t.closeTime) : null,
          commission: t.commission,
        }
      });
    }
    synced++;
  }
  console.log("Synced:", synced);
}

sync().finally(() => prisma.$disconnect());
