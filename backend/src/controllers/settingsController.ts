import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getUserSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId || 'default-user';
    
    let settings = await (prisma as any).userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await (prisma as any).userSettings.create({
        data: {
          userId,
          strategies: [
            "Breakout", "Retracement", "Reversal", "Trend Following", 
            "Range Bound", "Scalp", "News Event", "Liquidity Sweep"
          ],
          emotions: [
            "Calm", "Confident", "Anxious", "FOMO", 
            "Revenge", "Greedy", "Hesitant", "Frustrated"
          ]
        },
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId || 'default-user';
    const { strategies, emotions } = req.body;

    const settings = await (prisma as any).userSettings.upsert({
      where: { userId },
      update: {
        ...(strategies && { strategies }),
        ...(emotions && { emotions }),
      },
      create: {
        userId,
        strategies: strategies || [],
        emotions: emotions || [],
      },
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};
