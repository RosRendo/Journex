const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.account.create({
  data: {
    brokerName: 'Test2',
    accountNumber: '456',
    mt5Password: 'mypassword',
    mt5Server: 'Exness',
    isMaster: false,
    copierEnabled: false,
    copierMultiplier: 1.0,
    balance: 0,
    equity: 0
  }
}).then(console.log).catch(console.error).finally(()=>prisma.$disconnect());
