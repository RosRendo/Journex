import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/auth";

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

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { isPro: false, trialEndsAt: null },
        { status: 200 },
      );
    }

    // --- Mock / Lifetime Bypass ---
    // If auth.ts gave them `isPro: true`, respect it without checking Stripe!
    if ((session.user as any).isPro) {
      return NextResponse.json(
        { isPro: true, trialEndsAt: null },
        { status: 200 },
      );
    }

    const email = session.user.email!;
    const stripe = getStripeClient();

    // Look up Stripe customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        { isPro: false, trialEndsAt: null },
        { status: 200 },
      );
    }

    // Check for any active / trialing subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });

    const activeSub = subscriptions.data.find((sub) =>
      ["trialing", "active"].includes(sub.status),
    );

    if (!activeSub) {
      return NextResponse.json(
        { isPro: false, trialEndsAt: null },
        { status: 200 },
      );
    }

    const trialEnd =
      activeSub.trial_end != null
        ? new Date(activeSub.trial_end * 1000).toISOString()
        : null;

    return NextResponse.json(
      {
        isPro: true,
        trialEndsAt: trialEnd,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Stripe subscription status error:", error);
    return NextResponse.json(
      { isPro: false, trialEndsAt: null },
      { status: 200 },
    );
  }
}

