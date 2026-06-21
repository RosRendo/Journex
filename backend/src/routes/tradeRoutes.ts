import { Router } from 'express';
import * as tradeController from '../controllers/tradeController';
const router = Router();

router.post('/sync', tradeController.syncTrades);
router.post('/', tradeController.createTrade);
router.get('/', tradeController.getAllTrades);
router.get('/:id', tradeController.getTrade);
router.put('/:id', tradeController.updateTrade);
router.delete('/:id', tradeController.deleteTrade);

export default router;