import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";

// Lazy-initialize Stripe to avoid errors at build time
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripe = new Stripe(apiKey);
  }
  return stripe;
}

// Map plan names to Stripe Price IDs (set these in .env.local)
const PRICE_MAP: Record<string, string> = {
  Starter: process.env.STRIPE_PRICE_STARTER ?? "",
  Pro: process.env.STRIPE_PRICE_PRO ?? "",
  Lifetime: process.env.STRIPE_PRICE_LIFETIME ?? "",
};

// Starter & Pro are recurring subscriptions; Lifetime is one-time
const PAYMENT_MODE: Record<string, "subscription" | "payment"> = {
  Starter: "subscription",
  Pro: "subscription",
  Lifetime: "payment",
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();
    const priceId = PRICE_MAP[plan];

    if (!priceId || priceId.startsWith("price_REPLACE")) {
      return NextResponse.json(
        {
          error:
            "Stripe not configured yet. Please set real Price IDs in .env.local and restart the server.",
        },
        { status: 503 },
      );
    }

    const mode = PAYMENT_MODE[plan] ?? "subscription";
    const userEmail = session.user.email ?? undefined;

    // Build checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      mode,
      payment_method_types: ["card"],
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // For subscription plans, offer a 7-day free trial
      ...(mode === "subscription" && plan === "Pro"
        ? {
            subscription_data: {
              trial_period_days: 7,
              metadata: {
                userId: (session.user as any).id ?? userEmail ?? "",
                plan,
              },
            },
          }
        : {}),
      // Redirect URLs
      success_url: `${process.env.NEXTAUTH_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/subscription?cancelled=true`,
      // Store user metadata so we know who paid in webhook
      metadata: {
        userId: (session.user as any).id ?? userEmail ?? "",
        plan,
        userEmail: userEmail ?? "",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("[stripe/checkout] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
