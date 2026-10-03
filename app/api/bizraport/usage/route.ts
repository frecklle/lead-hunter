import { NextResponse } from "next/server";
import { getApiUsage } from "@/lib/bizraport";

// GET /api/bizraport/usage — Check API query count and plan status
export async function GET() {
  try {
    const usage = await getApiUsage();
    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error: any) {
    console.error("Error fetching BizRaport usage:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Nie udało się sprawdzić limitów BizRaport.",
      },
      { status: 500 }
    );
  }
}
