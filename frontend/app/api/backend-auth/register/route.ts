import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "rousrendo@gmail.com";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Master Admin bypass
    if (cleanEmail === ADMIN_EMAIL || cleanEmail === "admin@journex.io") {
      return NextResponse.json({
        success: true,
        user: {
          id: "admin-master-id",
          email: cleanEmail,
          name: name || "Rendo (Admin)",
          role: "admin",
        },
      }, { status: 201 });
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (existingUser) {
        return NextResponse.json({ error: "User already exists with that email" }, { status: 400 });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const role = cleanEmail === ADMIN_EMAIL ? "admin" : "user";

      const user = await prisma.user.create({
        data: {
          email: cleanEmail,
          password: hashedPassword,
          name: name || "",
          role,
        },
      });

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      }, { status: 201 });
    } catch (dbErr) {
      console.warn("[REGISTER] Database offline fallback:", dbErr);
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          success: true,
          user: {
            id: "dev-user-" + Date.now(),
            email: cleanEmail,
            name: name || cleanEmail.split("@")[0],
            role: cleanEmail === ADMIN_EMAIL ? "admin" : "user",
          },
        }, { status: 201 });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error("[REGISTER ROUTE ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
