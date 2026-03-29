import { Request, Response } from "express";
import { Polar } from "@polar-sh/sdk";

// Initialize Polar SDK
let polar: Polar | null = null;

function getPolar(): Polar {
  if (!polar) {
    const apiKey = process.env.POLAR_API_KEY;
    if (!apiKey) {
      throw new Error("POLAR_API_KEY environment variable is not set");
    }
    polar = new Polar({ accessToken: apiKey });
  }
  return polar;
}

const PRICE_MAP: Record<string, string> = {
  Starter: process.env.POLAR_PRICE_STARTER ?? "",
  Pro: process.env.POLAR_PRICE_PRO ?? "",
  Lifetime: process.env.POLAR_PRICE_LIFETIME ?? "",
};

/**
 * POST /api/polar/checkout
 * Create a Polar checkout session
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    const { plan, email } = req.body;

    if (!plan) {
      return res.status(400).json({ error: "Plan is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const priceId = PRICE_MAP[plan];

    if (!priceId || priceId.startsWith("price_")) {
      return res.status(503).json({
        error:
          "Polar not configured yet. Please set Price IDs in .env and restart the server.",
      });
    }

    const polar = getPolar();

    // Create checkout session
    const checkoutSession = await (polar.checkouts.create as any)({
      products: [priceId],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      customer_email: email,
      metadata: {
        plan,
        userEmail: email,
      },
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("[polar/checkout] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/polar/webhook
 * Handle Polar webhook events
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const body = req.body;
    const signature = req.headers["polar-signature"] as string;
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("[polar/webhook] POLAR_WEBHOOK_SECRET not set");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    // Verify webhook signature
    // Note: Polar SDK v0.46 may have built-in verification
    // For now, we'll proceed without verification to get events flowing
    // TODO: Implement proper webhook verification with Polar SDK

    const event = body as any;

    console.log("[polar/webhook] Event received:", event.type);

    switch (event.type) {
      case "checkout.created":
        handleCheckoutCreated(event.data);
        break;

      case "checkout.completed":
        handleCheckoutCompleted(event.data);
        break;

      case "order.created":
        handleOrderCreated(event.data);
        break;

      case "subscription.created":
        handleSubscriptionCreated(event.data);
        break;

      case "subscription.updated":
        handleSubscriptionUpdated(event.data);
        break;

      case "subscription.active":
        handleSubscriptionActive(event.data);
        break;

      case "subscription.canceled":
        handleSubscriptionCanceled(event.data);
        break;

      case "subscription.revoked":
        handleSubscriptionRevoked(event.data);
        break;

      case "invoice.paid":
        handleInvoicePaid(event.data);
        break;

      case "invoice.failed":
        handleInvoiceFailed(event.data);
        break;

      default:
        console.log(`[polar/webhook] Unhandled event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("[polar/webhook] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ─── Event Handlers ──────────────────────────────────────────────────────────

function handleCheckoutCreated(data: any) {
  console.log("[polar/event] Checkout created:", {
    checkoutId: data.checkout_id,
    customer: data.customer_email,
    metadata: data.metadata,
  });
  // TODO: Track checkout in DB
}

function handleCheckoutCompleted(data: any) {
  console.log("[polar/event] Checkout completed:", {
    checkoutId: data.checkout_id,
    orderId: data.order_id,
    customerId: data.customer_id,
    email: data.customer_email,
    metadata: data.metadata,
  });
  // TODO: Update user subscription status in DB
  // await db.user.update({
  //     where: { email: data.customer_email },
  //     data: {
  //         isPro: true,
  //         polarCustomerId: data.customer_id,
  //         plan: data.metadata?.plan || 'Pro',
  //         subscriptionStatus: 'active',
  //     }
  // });
}

function handleOrderCreated(data: any) {
  console.log("[polar/event] Order created:", {
    orderId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
    amount: data.amount,
    totalAmount: data.total_amount,
  });
}

function handleSubscriptionCreated(data: any) {
  console.log("[polar/event] Subscription created:", {
    subscriptionId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  });
  // TODO: Create subscription record in DB
}

function handleSubscriptionUpdated(data: any) {
  console.log("[polar/event] Subscription updated:", {
    subscriptionId: data.id,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
  });
  // TODO: Update subscription in DB
}

function handleSubscriptionActive(data: any) {
  console.log("[polar/event] Subscription activated:", {
    subscriptionId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
  });
  // TODO: Activate subscription in DB
}

function handleSubscriptionCanceled(data: any) {
  console.log("[polar/event] Subscription canceled:", {
    subscriptionId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
    endedAt: data.ended_at,
  });
  // TODO: Mark subscription as canceled in DB
}

function handleSubscriptionRevoked(data: any) {
  console.log("[polar/event] Subscription revoked:", {
    subscriptionId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
    revokedAt: data.revoked_at,
  });
  // TODO: Revoke access in DB
}

function handleInvoicePaid(data: any) {
  console.log("[polar/event] Invoice paid:", {
    invoiceId: data.id,
    customerId: data.customer_id,
    amount: data.amount,
    email: data.customer_email,
  });
  // TODO: Log payment in DB
}

function handleInvoiceFailed(data: any) {
  console.log("[polar/event] Invoice failed:", {
    invoiceId: data.id,
    customerId: data.customer_id,
    email: data.customer_email,
  });
  // TODO: Send payment failure notification
}
