import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { TradeInput , AccountInput} from '../types';
export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountData: AccountInput = req.body;

    const account = await prisma.account.create({
      data: accountData,
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
    const accounts = await prisma.account.findMany();

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

    const updatedAccount = await prisma.account.update({
      where: { id: parseInt(id) },
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
    await prisma.account.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (error) {
    next(error);
  }
};