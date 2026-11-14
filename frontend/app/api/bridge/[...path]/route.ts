import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/role";

const TARGET_BRIDGE =
  process.env.BRIDGE_URL ||
  (process.env.VERCEL ? "https://python.dashboardkiller.online" : "http://127.0.0.1:5003");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleProxy(req, await params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  const u = session?.user as any;
  const isAdmin = isAdminEmail(u?.email) || u?.role === "admin";
  if (!isAdmin && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Forbidden: MT5 execution desk is reserved strictly for administrator." },
      { status: 403 }
    );
  }
  return handleProxy(req, await params);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  const u = session?.user as any;
  const isAdmin = isAdminEmail(u?.email) || u?.role === "admin";
  if (!isAdmin && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Forbidden: MT5 execution desk is reserved strictly for administrator." },
      { status: 403 }
    );
  }
  return handleProxy(req, await params);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth();
  const u = session?.user as any;
  const isAdmin = isAdminEmail(u?.email) || u?.role === "admin";
  if (!isAdmin && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Forbidden: MT5 execution desk is reserved strictly for administrator." },
      { status: 403 }
    );
  }
  return handleProxy(req, await params);
}

async function handleProxy(req: NextRequest, { path }: { path: string[] }) {
  const subPath = (path || []).join("/");
  const searchParams = req.nextUrl.search;
  const targetUrl = `${TARGET_BRIDGE}/${subPath}${searchParams}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const headers: Record<string, string> = {
      "Content-Type": req.headers.get("Content-Type") || "application/json",
      "ngrok-skip-browser-warning": "true",
    };

    const authHeader = req.headers.get("Authorization");
    if (authHeader) headers["Authorization"] = authHeader;

    const accountId = req.headers.get("x-broker-account-id");
    if (accountId) headers["x-broker-account-id"] = accountId;

    let body: any = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      try {
        body = await req.text();
      } catch {}
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    // Graceful offline fallback: Never spam terminal or crash Next.js when MT5 is off
    return NextResponse.json(
      {
        success: false,
        connected: false,
        offline: true,
        message: "MT5 Bridge is currently offline.",
        positions: [],
        news: [],
        trades: [],
      },
      { status: 200 }
    );
  }
}
