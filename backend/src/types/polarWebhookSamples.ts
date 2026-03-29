/**
 * Polar Webhook Event Samples
 *
 * Use these samples to test your webhook handlers locally or for documentation.
 * These represent real webhook payloads from Polar.sh
 *
 * Reference: https://docs.polar.sh/webhooks/overview
 */

// ─── Checkout Events ────────────────────────────────────────────────────────

export const CHECKOUT_CREATED_EVENT = {
  type: "checkout.created",
  data: {
    checkout_id: "checkout_12345",
    created_at: "2024-03-28T10:00:00Z",
    customer_email: "user@example.com",
    customer_id: "customer_abc123",
    metadata: {
      plan: "Pro",
      userEmail: "user@example.com",
    },
  },
};

export const CHECKOUT_COMPLETED_EVENT = {
  type: "checkout.completed",
  data: {
    checkout_id: "checkout_12345",
    completed_at: "2024-03-28T10:05:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    order_id: "order_xyz789",
    subscription_id: "sub_def456",
    metadata: {
      plan: "Pro",
      userEmail: "user@example.com",
    },
  },
};

// ─── Order Events ───────────────────────────────────────────────────────────

export const ORDER_CREATED_EVENT = {
  type: "order.created",
  data: {
    id: "order_xyz789",
    created_at: "2024-03-28T10:05:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    amount: 99900, // in cents: $999.00
    total_amount: 99900,
    currency: "USD",
    product_id: "prod_123",
    product_price_id: "price_456",
    metadata: {
      plan: "Pro",
    },
  },
};

// ─── Subscription Events ─────────────────────────────────────────────────────

export const SUBSCRIPTION_CREATED_EVENT = {
  type: "subscription.created",
  data: {
    id: "sub_def456",
    created_at: "2024-03-28T10:05:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    product_id: "prod_123",
    product_price_id: "price_456",
    status: "active",
    current_period_start: "2024-03-28T10:05:00Z",
    current_period_end: "2024-04-28T10:05:00Z",
    ended_at: null,
    revoked_at: null,
    metadata: {
      plan: "Pro",
    },
  },
};

export const SUBSCRIPTION_UPDATED_EVENT = {
  type: "subscription.updated",
  data: {
    id: "sub_def456",
    updated_at: "2024-03-28T10:10:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    status: "active",
    current_period_end: "2024-04-28T10:05:00Z",
    metadata: {
      plan: "Pro",
    },
  },
};

export const SUBSCRIPTION_ACTIVE_EVENT = {
  type: "subscription.active",
  data: {
    id: "sub_def456",
    activated_at: "2024-03-28T10:05:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    status: "active",
    current_period_start: "2024-03-28T10:05:00Z",
    current_period_end: "2024-04-28T10:05:00Z",
    metadata: {
      plan: "Pro",
    },
  },
};

export const SUBSCRIPTION_CANCELED_EVENT = {
  type: "subscription.canceled",
  data: {
    id: "sub_def456",
    canceled_at: "2024-03-28T15:00:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    status: "canceled",
    ended_at: "2024-04-28T10:05:00Z",
    metadata: {
      plan: "Pro",
    },
  },
};

export const SUBSCRIPTION_REVOKED_EVENT = {
  type: "subscription.revoked",
  data: {
    id: "sub_def456",
    revoked_at: "2024-03-28T15:00:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    status: "revoked",
    reason: "payment_failed",
    metadata: {
      plan: "Pro",
    },
  },
};

// ─── Invoice Events ──────────────────────────────────────────────────────────

export const INVOICE_PAID_EVENT = {
  type: "invoice.paid",
  data: {
    id: "inv_gh123",
    created_at: "2024-03-28T10:05:00Z",
    paid_at: "2024-03-28T10:06:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    subscription_id: "sub_def456",
    amount: 99900, // in cents: $999.00
    currency: "USD",
    status: "paid",
    metadata: {
      plan: "Pro",
    },
  },
};

export const INVOICE_FAILED_EVENT = {
  type: "invoice.failed",
  data: {
    id: "inv_gh456",
    created_at: "2024-03-28T10:05:00Z",
    failed_at: "2024-03-28T10:06:00Z",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    subscription_id: "sub_def456",
    amount: 99900, // in cents: $999.00
    currency: "USD",
    status: "failed",
    failure_reason: "card_declined",
    metadata: {
      plan: "Pro",
    },
  },
};

// ─── Usage Events (for metered billing) ──────────────────────────────────────

export const USAGE_CREATED_EVENT = {
  type: "usage.created",
  data: {
    id: "usage_jkl789",
    created_at: "2024-03-28T10:05:00Z",
    subscription_id: "sub_def456",
    customer_id: "customer_abc123",
    metric_type: "api_calls",
    quantity: 1000,
    period_start: "2024-03-28T00:00:00Z",
    period_end: "2024-03-28T23:59:59Z",
    metadata: {},
  },
};

// ─── Refund Events ──────────────────────────────────────────────────────────

export const REFUND_CREATED_EVENT = {
  type: "refund.created",
  data: {
    id: "ref_mno456",
    created_at: "2024-03-28T15:00:00Z",
    order_id: "order_xyz789",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    amount: 99900, // in cents: $999.00
    currency: "USD",
    status: "pending",
    reason: "user_request",
    metadata: {},
  },
};

export const REFUND_SUCCEEDED_EVENT = {
  type: "refund.succeeded",
  data: {
    id: "ref_mno456",
    succeeded_at: "2024-03-28T15:30:00Z",
    order_id: "order_xyz789",
    customer_id: "customer_abc123",
    customer_email: "user@example.com",
    amount: 99900,
    currency: "USD",
    status: "succeeded",
    metadata: {},
  },
};

// ─── Discount Events ────────────────────────────────────────────────────────

export const DISCOUNT_CREATED_EVENT = {
  type: "discount.created",
  data: {
    id: "disc_pqr789",
    created_at: "2024-03-28T10:00:00Z",
    code: "SAVE20",
    percent_off: 20,
    is_active: true,
    metadata: {},
  },
};

// ─── Product Events ──────────────────────────────────────────────────────────

export const PRODUCT_UPDATED_EVENT = {
  type: "product.updated",
  data: {
    id: "prod_123",
    updated_at: "2024-03-28T10:00:00Z",
    name: "Pro Plan",
    description: "Everything you need",
    prices: [
      {
        id: "price_456",
        amount: 99900, // in cents
        currency: "USD",
        billing_model: "fixed",
        recurring_interval: "month",
      },
    ],
    metadata: {},
  },
};

// ─── Testing Guide ──────────────────────────────────────────────────────────
/**
 * How to test webhooks locally:
 *
 * 1. Use ngrok to tunnel your local endpoint:
 *    ngrok http 5000
 *
 * 2. Configure webhook URL in Polar Dashboard:
 *    https://dashboard.polar.sh → Settings → Webhooks
 *    URL: https://<your-ngrok-url>.ngrok.io/api/polar/webhook
 *
 * 3. Test webhook delivery with curl:
 *    curl -X POST http://localhost:5000/api/polar/webhook \
 *      -H "Content-Type: application/json" \
 *      -H "Polar-Signature: <signature>" \
 *      -d @checkout_completed.json
 *
 * 4. Send samples programmatically (Node.js):
 *    import { CHECKOUT_COMPLETED_EVENT } from './polarWebhookSamples';
 *    fetch('http://localhost:5000/api/polar/webhook', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify(CHECKOUT_COMPLETED_EVENT)
 *    });
 */

/**
 * Production Webhook Verification:
 *
 * Always verify webhook signatures in production:
 *
 * import crypto from 'crypto';
 *
 * function verifyWebhookSignature(
 *   payload: string,
 *   signature: string,
 *   secret: string
 * ): boolean {
 *   const hash = crypto
 *     .createHmac('sha256', secret)
 *     .update(payload)
 *     .digest('hex');
 *   return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
 * }
 *
 * See: https://docs.polar.sh/webhooks/security
 */
