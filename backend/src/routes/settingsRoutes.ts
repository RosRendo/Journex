import { Router } from 'express';
import { getUserSettings, updateUserSettings } from '../controllers/settingsController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Routes for /api/settings
router.use(requireAuth);

router.get('/', getUserSettings);
router.put('/', updateUserSettings);

export default router;
