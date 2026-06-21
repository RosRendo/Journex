import * as accountController from '../controllers/accountController';
import { Router } from 'express';
import { adminGuard } from '../middleware/auth';

const accountRouter = Router();

// Secure all account routes behind the adminGuard
accountRouter.use(adminGuard);

accountRouter.post('/', accountController.createAccount);
accountRouter.get('/', accountController.getAllAccounts);
accountRouter.put('/:id', accountController.updateAccount);
accountRouter.delete('/:id', accountController.deleteAccount);

export default accountRouter;