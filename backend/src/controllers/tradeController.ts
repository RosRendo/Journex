import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { TradeInput } from '../types';

export const createTrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tradeData: TradeInput = req.body;
    const userId = req.userId;

    const trade = await prisma.trade.create({
      data: {
        userId: userId!,
        date: new Date(tradeData.date),
        pair: tradeData.pair,
        strategy: tradeData.strategy,
        setupType: tradeData.setupType,
        entry: tradeData.entry,
        sl: tradeData.sl,
        tp: tradeData.tp,
        rr: tradeData.rr,
        outcome: tradeData.outcome,
        notes: tradeData.notes,
        imageUrl: tradeData.imageUrl,
        direction: tradeData.direction || 'Unknown',
        profit: tradeData.profit || 0,
        lotSize: tradeData.lotSize || null,
        emotion: tradeData.emotion || null,
        followedPlan: tradeData.followedPlan !== undefined ? tradeData.followedPlan : null,
        planDeviationReason: tradeData.planDeviationReason || null,
        checklistPassed: tradeData.checklistPassed !== undefined ? tradeData.checklistPassed : null,
      },
    });

    res.status(201).json({
      success: true,
      data: trade,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '50',
      strategy,
      outcome,
      pair,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { userId: req.userId };

    if (strategy) where.strategy = strategy;
    if (outcome) where.outcome = outcome;
    if (pair) where.pair = pair;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy as string]: sortOrder,
        },
      }),
      prisma.trade.count({ where }),
    ]);

    res.json({
      success: true,
      data: trades,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const trade = await prisma.trade.findUnique({
      where: { id: parseInt(id) },
      include: { profitLoss: true },
    });

    if (!trade || trade.userId !== req.userId) {
      throw new AppError('Trade not found', 404);
    }

    res.json({
      success: true,
      data: trade,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tradeData: Partial<TradeInput> = req.body;

    const existing = await prisma.trade.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.userId) {
      throw new AppError('Trade not found', 404);
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: parseInt(id) },
      data: {
        ...(tradeData.date && { date: new Date(tradeData.date) }),
        ...(tradeData.pair && { pair: tradeData.pair }),
        ...(tradeData.strategy && { strategy: tradeData.strategy }),
        ...(tradeData.setupType && { setupType: tradeData.setupType }),
        ...(tradeData.entry !== undefined && { entry: tradeData.entry }),
        ...(tradeData.sl !== undefined && { sl: tradeData.sl }),
        ...(tradeData.tp !== undefined && { tp: tradeData.tp }),
        ...(tradeData.rr && { rr: tradeData.rr }),
        ...(tradeData.notes !== undefined && { notes: tradeData.notes }),
        ...(tradeData.imageUrl !== undefined && { imageUrl: tradeData.imageUrl }),
        ...(tradeData.outcome && { outcome: tradeData.outcome }),
        ...(tradeData.direction !== undefined && { direction: tradeData.direction }),
        ...(tradeData.profit !== undefined && { profit: tradeData.profit }),
        ...(tradeData.lotSize !== undefined && { lotSize: tradeData.lotSize }),
        ...(tradeData.emotion !== undefined && { emotion: tradeData.emotion }),
        ...(tradeData.followedPlan !== undefined && { followedPlan: tradeData.followedPlan }),
        ...(tradeData.planDeviationReason !== undefined && { planDeviationReason: tradeData.planDeviationReason }),
        ...(tradeData.checklistPassed !== undefined && { checklistPassed: tradeData.checklistPassed }),
      },
    });

    res.json({
      success: true,
      data: updatedTrade,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.trade.findUnique({ where: { id: parseInt(id) } });
    if (!existing || existing.userId !== req.userId) {
      throw new AppError('Trade not found', 404);
    }

    await prisma.trade.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Trade deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const syncTrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = req.body.days || 30;
    const bridgeUrl = process.env.LOCAL_MT5_URL || 'http://127.0.0.1:5003';
    
    // Fetch from bridge
    console.log(`Fetching from: ${bridgeUrl}/api/history?days=${days}`);
    const response = await fetch(`${bridgeUrl}/api/history?days=${days}`);
    const data = await response.json() as any;
    console.log(`Bridge response:`, data);
    
    if (!data.success) {
      return res.status(500).json({ success: false, error: data.error || 'Failed to fetch from MT5' });
    }
    
    const mt5Trades = data.trades || [];
    let synced = 0;
    
    // Upsert trades
    for (const t of mt5Trades) {
      if (!t.ticket) continue;
      
      const outcome = t.profit >= 0 ? 'Win' : 'Loss';
      
      const existing = await prisma.trade.findFirst({
        where: { ticket: String(t.ticket), userId: req.userId }
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
            userId: req.userId!,
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
    console.log('SENDING SUCCESS RESPONSE'); res.json({ success: true, synced });
  } catch (error) {
    next(error);
  }
};
