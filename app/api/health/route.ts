import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Simple connectivity check — if the query succeeds, the DB is reachable
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, database: "connected" });
  } catch {
    return NextResponse.json(
      { success: false, database: "disconnected" },
      { status: 503 },
    );
  }
}
