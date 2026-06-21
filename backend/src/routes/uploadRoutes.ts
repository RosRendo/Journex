import { upload } from '../middleware/upload';
import { Router } from 'express';
import * as uploadController from '../controllers/uploadController';
import { adminGuard } from '../middleware/auth';

const uploadRouter = Router();

// Secure upload route behind the adminGuard
uploadRouter.use(adminGuard);

uploadRouter.post('/', upload.single('image'), uploadController.uploadImage);

export default uploadRouter;
