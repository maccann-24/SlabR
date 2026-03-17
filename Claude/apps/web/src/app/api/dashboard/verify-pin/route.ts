import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { slug, pin } = await request.json();

    if (!slug || !pin) {
      return NextResponse.json(
        { error: "slug and pin are required" },
        { status: 400 }
      );
    }

    if (pin.length < 4) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits" },
        { status: 400 }
      );
    }

    // Look up client by slug
    const client = await db
      .select({ id: schema.clients.id, name: schema.clients.name })
      .from(schema.clients)
      .where(eq(schema.clients.slug, slug))
      .then((rows) => rows[0]);

    if (!client) {
      return NextResponse.json(
        { error: "Dashboard not found" },
        { status: 404 }
      );
    }

    // Demo mode: accept any 4+ digit PIN
    // In production, compare bcrypt hash:
    // const valid = await bcrypt.compare(pin, client.dashboardPin);
    // if (!valid) return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });

    const response = NextResponse.json({
      success: true,
      clientId: client.id,
      clientName: client.name,
    });

    // Set a simple session cookie (demo mode)
    response.cookies.set("dashboard_session", client.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: `/dashboard/${slug}`,
    });

    return response;
  } catch (error) {
    console.error("Verify PIN error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
