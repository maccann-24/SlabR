import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { businessName, ownerName, phone, industry } = await request.json();

    if (!businessName || !phone) {
      return NextResponse.json(
        { error: "Business name and phone are required" },
        { status: 400 }
      );
    }

    const [signup] = await db
      .insert(schema.pilotSignups)
      .values({
        businessName,
        ownerName: ownerName || null,
        phone,
        industry: industry || "plumbing",
      })
      .returning({ id: schema.pilotSignups.id });

    console.log("New pilot signup:", {
      id: signup.id,
      businessName,
      phone,
      industry: industry || "plumbing",
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, id: signup.id });
  } catch (error) {
    console.error("Pilot signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
