import { upload } from '../middleware/upload';
import { Router } from 'express';
import * as uploadController from '../controllers/uploadController';

const uploadRouter = Router();

uploadRouter.post('/', upload.single('image'), uploadController.uploadImage);

export default uploadRouter;
