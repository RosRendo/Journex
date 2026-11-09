import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/role";

const BRIDGE_INTERNAL = process.env.INTERNAL_BRIDGE_URL || process.env.BRIDGE_URL || process.env.NEXT_PUBLIC_BRIDGE_URL || "http://127.0.0.1:5003";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail || !isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only administrators can dispatch test webhook alerts." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "news";

    const res = await fetch(`${BRIDGE_INTERNAL}/api/alert-config/test?type=${encodeURIComponent(type)}`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ success: false, error: "Bridge test endpoint returned status " + res.status }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

