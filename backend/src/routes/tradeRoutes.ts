import { Router } from 'express';
import * as tradeController from '../controllers/tradeController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Secure all trade operations per user
router.use(requireAuth);

router.post('/sync', tradeController.syncTrades);
router.post('/', tradeController.createTrade);
router.get('/', tradeController.getAllTrades);
router.get('/:id', tradeController.getTrade);
router.put('/:id', tradeController.updateTrade);
router.delete('/:id', tradeController.deleteTrade);

export default router;
