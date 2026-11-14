import * as accountController from '../controllers/accountController';
import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';

const accountRouter = Router();

// Secure all account routes behind requireAuth (User & Admin access isolated by userId)
accountRouter.use(requireAuth);

accountRouter.post('/', accountController.createAccount);
accountRouter.get('/', accountController.getAllAccounts);
accountRouter.put('/:id', accountController.updateAccount);
accountRouter.delete('/:id', accountController.deleteAccount);
accountRouter.post('/:id/sync', accountController.syncAccountTrades);

export default accountRouter;
