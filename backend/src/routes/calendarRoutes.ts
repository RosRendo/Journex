import * as calendarController from '../controllers/calendarController';
import { Router } from 'express';
const calendarRouter = Router();

calendarRouter.get('/', calendarController.getCalendarData);

export default calendarRouter;