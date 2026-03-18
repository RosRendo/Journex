import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";

// Ensure this runs in a Node.js environment (required for Stripe server SDK)
export const runtime = "nodejs";

let stripeClient: Stripe | null = null;

function getStripeClient() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

interface CheckoutPayload {
  plan: "Basic" | "Pro" | "Lifetime";
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = (await req.json()) as CheckoutPayload;

    if (!plan) {
      return NextResponse.json(
        { error: "Missing plan in request body" },
        { status: 400 },
      );
    }

    const stripe = getStripeClient();

    const session = await auth();
    const email = session?.user?.email ?? undefined;

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const priceMap: Record<CheckoutPayload["plan"], string | undefined> = {
      Basic: process.env.STRIPE_PRICE_ID_BASIC,
      Pro: process.env.STRIPE_PRICE_ID_PRO,
      Lifetime: process.env.STRIPE_PRICE_ID_LIFETIME,
    };

    const priceId = priceMap[plan];

    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan ${plan}` },
        { status: 500 },
      );
    }

    const isLifetime = plan === "Lifetime";

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: isLifetime ? "payment" : "subscription",
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/subscription?canceled=1`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        customer_email: email,
        metadata: {
          plan,
        },
      });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: "Unable to start checkout process" },
      { status: 500 },
    );
  }
}

