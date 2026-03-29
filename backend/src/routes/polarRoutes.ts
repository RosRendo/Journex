import { Router } from "express";
import * as polarController from "../controllers/polarController";

const router = Router();

/**
 * POST /api/polar/checkout
 * Create a Polar checkout session
 */
router.post("/checkout", polarController.createCheckoutSession);

/**
 * POST /api/polar/webhook
 * Handle Polar webhook events
 */
router.post("/webhook", polarController.handleWebhook);

export default router;
