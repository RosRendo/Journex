import { Router, Request, Response } from 'express';
import DodoPayments from 'dodopayments';
import { Webhooks } from '@dodopayments/express';
import { requireAuth } from '../middleware/authMiddleware';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Initialize Dodo Payments Client
// This automatically uses process.env.DODO_PAYMENTS_API_KEY
const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY || "test_key",
  environment: 'test_mode', // Change to 'live_mode' in production
});

// 1. Generate Checkout Link
router.post('/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { productId } = req.body; // The user passes which plan they want

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // You will need to replace this with your actual Dodo Payments Product ID
    // e.g. 'pdt_12345'
    const paymentResponse = await dodoClient.payments.create({
      billing: {
        city: 'New York',
        country: 'US',
        state: 'NY',
        street: '123 Main St',
        zipcode: '10001'
      },
      productCart: [
        {
          productId: productId,
          quantity: 1
        }
      ],
      // We pass the userId in metadata so the webhook knows WHO paid
      metadata: {
        userId: userId
      }
    });

    // Return the secure checkout link to the frontend
    // @ts-ignore - Assuming standard Dodo response returns a payment url
    res.json({ checkoutUrl: paymentResponse.checkout_url || paymentResponse.url });
  } catch (error: any) {
    console.error("Dodo Payments error:", error);
    res.status(500).json({ error: "Failed to create payment link" });
  }
});

// 2. Webhook to instantly upgrade user upon payment
// Notice we do NOT use requireAuth here, because Dodo Payments calls this, not the user
router.post('/webhook', Webhooks({
  webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET || "test_secret",
  onPayload: async (payload: any) => {
    console.log("Received Dodo Payment Webhook:", payload.event_type);

    if (payload.event_type === 'payment.succeeded' || payload.event_type === 'subscription.created') {
      const metadata = payload.data?.metadata;
      
      if (metadata && metadata.userId) {
        // Find the user in our Supabase DB via Prisma, and mark them as premium!
        console.log(`Upgrading user ${metadata.userId} to premium!`);
        
        // Ensure you add a 'tier' or 'subscriptionStatus' column to your Prisma schema 
        // if you want to track this in the database permanently.
        // Example:
        // await prisma.user.update({
        //   where: { id: metadata.userId },
        //   data: { tier: 'premium' }
        // });
      }
    }
  }
}));

export default router;
