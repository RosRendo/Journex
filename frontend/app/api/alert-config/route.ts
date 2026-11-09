import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/role";
import fs from "fs";
import path from "path";

const BRIDGE_INTERNAL = process.env.INTERNAL_BRIDGE_URL || process.env.BRIDGE_URL || process.env.NEXT_PUBLIC_BRIDGE_URL || "http://127.0.0.1:5003";

export async function GET() {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail || !isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Broadcaster credentials and webhooks are restricted to system administrators." },
        { status: 403 }
      );
    }

    try {
      const res = await fetch(`${BRIDGE_INTERNAL}/api/alert-config`, {
        headers: { "ngrok-skip-browser-warning": "true" },
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Bridge not reachable, fallback to disk file if present
      const filePath = path.resolve(process.cwd(), "..", "alert_config.json");
      if (fs.existsSync(filePath)) {
        try {
          const diskConfig = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          return NextResponse.json(diskConfig);
        } catch {}
      }
    }

    return NextResponse.json({
      alerts_paused: false,
      discord_news_webhook: "",
      discord_calendar_webhook: "",
      discord_signals_webhook: "",
      discord_alerts_webhook: "",
      telegram_bot_token: "",
      telegram_chat_id: "",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email;

    if (!userEmail || !isAdminEmail(userEmail)) {
      return NextResponse.json(
        { success: false, error: "Access Denied: Only administrators can modify global alert dispatch channels." },
        { status: 403 }
      );
    }

    const body = await req.json();

    try {
      const res = await fetch(`${BRIDGE_INTERNAL}/api/alert-config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // If bridge offline, persist to local alert_config.json
      const filePath = path.resolve(process.cwd(), "..", "alert_config.json");
      try {
        let existing = {};
        if (fs.existsSync(filePath)) {
          existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
        const updated = { ...existing, ...body };
        fs.writeFileSync(filePath, JSON.stringify(updated, null, 2));
        return NextResponse.json({ success: true, message: "Persisted alert configuration locally." });
      } catch (err: any) {
        return NextResponse.json({ error: "Failed to persist alert configuration: " + err.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

