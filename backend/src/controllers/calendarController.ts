import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { TradeInput, CalendarDay, } from '../types';

export const getCalendarData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year, month } = req.query;

    let startDate: Date;
    let endDate: Date;

    if (year && month) {
      startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const trades = await prisma.trade.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const calendarData: { [key: string]: CalendarDay } = {};

    trades.forEach(trade => {
      const dateKey = trade.date.toISOString().split('T')[0];
      
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = {
          date: dateKey,
          tradesCount: 0,
          netProfitLoss: 0,
          wins: 0,
          losses: 0,
        };
      }

      calendarData[dateKey].tradesCount++;
      
      if (trade.outcome === 'Win') {
        calendarData[dateKey].wins++;
      } else if (trade.outcome === 'Loss') {
        calendarData[dateKey].losses++;
      }
    });

    res.json({
      success: true,
      data: Object.values(calendarData),
    });
  } catch (error) {
    next(error);
  }
};