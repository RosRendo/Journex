import * as accountController from '../controllers/accountController';
import { Router } from 'express';

const accountRouter = Router();

accountRouter.post('/', accountController.createAccount);
accountRouter.get('/', accountController.getAllAccounts);
accountRouter.put('/:id', accountController.updateAccount);
accountRouter.delete('/:id', accountController.deleteAccount);

export default accountRouter;