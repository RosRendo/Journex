import { Router } from 'express';
import { getLessons, createLesson, deleteLesson, updateLesson, reorderLessons } from '../controllers/lessonController';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', getLessons);
router.post('/', createLesson);
router.put('/reorder', reorderLessons);
router.put('/:id', updateLesson);
router.delete('/:id', deleteLesson);

export default router;
