import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { TradeInput } from '../types';

export const createTrade = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tradeData: TradeInput = req.body;

    const trade = await prisma.trade.create({
      data: {
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

    const where: any = {};

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

    if (!trade) {
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