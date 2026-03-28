import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error("[stripe/webhook] Signature verification failed:", err.message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log("[stripe/webhook] Event received:", event.type);

    switch (event.type) {
        // Subscription / one-time payment completed
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const meta = session.metadata ?? {};
            console.log(
                `[stripe] Checkout completed — user: ${meta.userEmail}, plan: ${meta.plan}`
            );
            // TODO: update your database here, e.g.:
            // await db.user.update({ where: { email: meta.userEmail }, data: { isPro: true, plan: meta.plan } });
            break;
        }

        // Recurring charge succeeded — keep user active
        case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`[stripe] Payment succeeded, customer: ${invoice.customer}`);
            // TODO: ensure isPro = true in DB for this customer
            break;
        }

        // Payment failed — user should lose access on next session refresh
        case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`[stripe] Payment FAILED, customer: ${invoice.customer}`);
            // TODO: set isPro = false / expired in DB
            break;
        }

        // Subscription cancelled
        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            console.log(`[stripe] Subscription cancelled: ${subscription.id}`);
            // TODO: revoke access
            break;
        }

        // 3-day reminder before trial ends
        case "customer.subscription.trial_will_end": {
            const subscription = event.data.object as Stripe.Subscription;
            console.log(`[stripe] Trial ending soon: ${subscription.id}`);
            // TODO: send reminder email
            break;
        }

        default:
            console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
}
