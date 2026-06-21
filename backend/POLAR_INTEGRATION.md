# Polar Payment Integration Guide

This document covers the complete Polar payment integration for Journex.

## Overview

**Polar** is a modern payment platform optimized for digital products, subscriptions, and open source. We use it for subscription billing and one-time purchases.

- 📚 **Documentation**: https://docs.polar.sh
- 🧪 **Test Mode**: Available in Polar Dashboard
- 🔑 **API Reference**: https://api.polar.sh/docs

## Setup

### 1. Get Polar Credentials

1. Create account at [https://polar.sh](https://polar.sh)
2. Go to **Settings → API Tokens**
3. Create an **Access Token** (for server-side)
4. Create a **Secret** for webhook verification
5. Create your **Products** and **Product Prices**

### 2. Configure Environment Variables

**Backend (.env)**

```env
# Polar Payment Gateway
POLAR_API_KEY=your_access_token_here
POLAR_PRICE_STARTER=price_xyz_starter
POLAR_PRICE_PRO=price_xyz_pro
POLAR_PRICE_LIFETIME=price_xyz_lifetime
POLAR_WEBHOOK_SECRET=your_webhook_secret_here
FRONTEND_URL=http://localhost:3000 # Production: your-domain.com
```

### 3. Configure Webhook

1. Go to **Polar Dashboard → Settings → Webhooks**
2. Add webhook endpoint:
   - **URL**: `https://yourdomain.com/api/polar/webhook`
   - **Events**: Select all relevant events
3. Copy and set `POLAR_WEBHOOK_SECRET` in .env

For **local testing**, use ngrok:

```bash
ngrok http 5000
# Set webhook URL to: https://<your-ngrok-id>.ngrok.io/api/polar/webhook
```

## API Endpoints

### Create Checkout Session

```http
POST /api/polar/checkout
Content-Type: application/json

{
  "plan": "Pro",
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "url": "https://checkout.polar.sh/..."
}
```

### Handle Webhooks

```http
POST /api/polar/webhook
Content-Type: application/json
Polar-Signature: v1=<signature>

{
  "type": "checkout.completed",
  "data": { ... }
}
```

## Webhook Events

### Lifecycle Events

| Event                   | When                      | Action              |
| ----------------------- | ------------------------- | ------------------- |
| `checkout.created`      | User starts checkout      | Track funnel        |
| `checkout.completed`    | User completes checkout   | Create order record |
| `order.created`         | Order is created          | Send email          |
| `subscription.created`  | Subscription starts       | Activate user       |
| `subscription.active`   | Subscription is active    | Grant access        |
| `subscription.canceled` | User cancels              | Update status       |
| `subscription.revoked`  | Payment failed repeatedly | Revoke access       |

### Payment Events

| Event              | When               | Action          |
| ------------------ | ------------------ | --------------- |
| `invoice.paid`     | Payment successful | Log transaction |
| `invoice.failed`   | Payment declined   | Notify user     |
| `refund.created`   | Refund requested   | Update order    |
| `refund.succeeded` | Refund processed   | Refund handling |

## Implementation Examples

### Frontend: Initiate Checkout

```typescript
// app/subscription/page.tsx

async function handleCheckout(plan: string) {
  const res = await fetch("/api/polar/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      email: session.user.email,
    }),
  });

  const data = await res.json();
  window.location.href = data.url; // Redirect to Polar checkout
}
```

### Backend: Handle Subscription Activated

```typescript
// src/controllers/polarController.ts

async function handleCheckoutCompleted(data: any) {
  // Update user in database
  await db.user.update({
    where: { email: data.customer_email },
    data: {
      isPro: true,
      polarCustomerId: data.customer_id,
      plan: data.metadata?.plan,
      subscriptionStatus: "active",
    },
  });

  // Send welcome email
  await sendEmail({
    to: data.customer_email,
    subject: "Welcome to Pro Plan!",
    template: "pro-welcome",
  });
}
```

### Backend: Handle Failed Payment

```typescript
async function handleInvoiceFailed(data: any) {
  // Update user status
  await db.user.update({
    where: { polarCustomerId: data.customer_id },
    data: {
      isPro: false,
      subscriptionStatus: "payment_failed",
    },
  });

  // Send retry email
  await sendEmail({
    to: data.customer_email,
    subject: "Payment failed - action needed",
    template: "payment-failed",
  });
}
```

## Testing

### Test Mode Cards

Use these in Polar's test mode:

| Card                | Result   |
| ------------------- | -------- |
| 4242 4242 4242 4242 | Succeeds |
| 4000 0000 0000 0002 | Declines |
| 4000 0000 0000 0069 | Expired  |

### Test Webhook Events

```bash
# Using curl
curl -X POST http://localhost:5000/api/polar/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.completed",
    "data": {
      "checkout_id": "test_123",
      "customer_email": "test@example.com",
      "customer_id": "cust_test",
      "order_id": "order_test",
      "metadata": { "plan": "Pro" }
    }
  }'
```

### Using Sample Events

```typescript
import { CHECKOUT_COMPLETED_EVENT } from "@/types/polarWebhookSamples";

// Simulate webhook
fetch("/api/polar/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(CHECKOUT_COMPLETED_EVENT),
});
```

## Database Integration

Add these fields to your `User` model:

```prisma
model User {
  id                String    @id @default(cuid())
  email             String    @unique

  // Polar subscription fields
  isPro             Boolean   @default(false)
  plan              String?   @default("free") // free, starter, pro, lifetime
  polarCustomerId   String?   @unique
  subscriptionId    String?
  subscriptionStatus String?  @default("inactive") // active, canceled, payment_failed

  // Billing dates
  subscriptionStartedAt DateTime?
  subscriptionEndsAt    DateTime?

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

## Security Checklist

- ✅ Always verify webhook signatures in production
- ✅ Use HTTPS (never HTTP for production)
- ✅ Store `POLAR_API_KEY` and `POLAR_WEBHOOK_SECRET` in .env (never commit)
- ✅ Implement rate limiting on subscription check endpoint
- ✅ Log all webhook events for audit trail
- ✅ Use database transactions for webhook handlers
- ✅ Implement idempotency (handle duplicate webhooks)

## Troubleshooting

### "Polar not configured" Error

**Problem**: Getting 503 error from checkout endpoint
**Solution**:

1. Check `POLAR_API_KEY` is set in .env
2. Check `POLAR_PRICE_*` values are real price IDs
3. Restart backend: `npm run dev`

### Webhooks Not Arriving

**Problem**: Webhook handlers not being called
**Solution**:

1. Check webhook URL in Polar Dashboard
2. Use ngrok for local testing: `ngrok http 5000`
3. Check webhook secret matches `POLAR_WEBHOOK_SECRET`
4. Check backend logs for errors

### Signature Verification Failed

**Problem**: 403 Unauthorized on webhook
**Solution**:

1. Ensure `POLAR_WEBHOOK_SECRET` is correct (not API key)
2. Verify webhook payload format
3. Check Polar SDK version matches API

## API Rate Limits

- 100 requests per minute per API key
- 1000 websocket connections per account

## Next Steps

1. ✅ Create Polar account and API credentials
2. ✅ Set environment variables
3. ✅ Configure webhooks in Polar Dashboard
4. ✅ Test checkout flow locally
5. ✅ Deploy to production
6. ✅ Monitor webhook delivery in Polar Dashboard
7. ✅ Set up alerts for failed payments

## Resources

- [Polar Docs](https://docs.polar.sh)
- [Polar API Reference](https://api.polar.sh/docs)
- [Polar SDK (Node.js)](https://github.com/polarsource/polar)
- [Sample Webhook Events](./src/types/polarWebhookSamples.ts)
