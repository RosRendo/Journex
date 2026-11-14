import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AccountInput } from '../types';
import { syncMT5AccountOnDemand } from '../services/syncService';

const getUserAccountFilter = (userId: string) => {
  const isAdmin =
    userId === "rousrendo@gmail.com" ||
    userId === "admin@journex.io" ||
    userId === "admin-master-id";

  return isAdmin
    ? { in: [userId, "default-user", "admin-master-id", "rousrendo@gmail.com"] }
    : { in: [userId, "default-user"] };
};

export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountData: AccountInput = req.body;
    const userId = req.userId || 'default-user';

    const account = await prisma.account.create({
      data: {
        ...accountData,
        userId,
      },
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllAccounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId || 'default-user';
    const where: any = { userId: getUserAccountFilter(userId) };

    const accounts = await prisma.account.findMany({
      where,
      orderBy: { id: 'asc' },
    });

    res.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const accountData: Partial<AccountInput> = req.body;
    const userId = req.userId || 'default-user';

    const existing = await prisma.account.findFirst({
      where: { id: parseInt(id), userId: getUserAccountFilter(userId) },
    });

    if (!existing) {
      throw new AppError('Account not found or access denied', 404);
    }

    const updatedAccount = await prisma.account.update({
      where: { id: existing.id },
      data: accountData,
    });

    res.json({
      success: true,
      data: updatedAccount,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId || 'default-user';

    const existing = await prisma.account.findFirst({
      where: { id: parseInt(id), userId: getUserAccountFilter(userId) },
    });

    if (!existing) {
      throw new AppError('Account not found or access denied', 404);
    }

    await prisma.account.delete({ where: { id: existing.id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};

export const syncAccountTrades = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.userId || 'default-user';

    const account = await prisma.account.findFirst({
      where: { id: parseInt(id), userId: getUserAccountFilter(userId) },
    });

    if (!account) {
      throw new AppError('Account not found or access denied', 404);
    }

    if (!account.mt5Server || !account.accountNumber) {
      throw new AppError('Account is missing MT5 server or account number', 400);
    }

    const days = req.body?.days ? parseInt(req.body.days, 10) : 90;

    const result = await syncMT5AccountOnDemand({
      userId,
      server: account.mt5Server,
      login: account.accountNumber,
      password: account.mt5Password || '',
      accountDbId: account.id,
      days,
    });

    res.json({
      success: true,
      message: `Successfully synced ${result.insertedCount} new trades from ${account.mt5Server}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
