import { NextResponse } from "next/server";
import { runBizRaportSearch } from "@/lib/bizraport";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/searches/[id]/run — Execute search against BizRaport API
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let maxCompanies = 15;

    try {
      const body = await request.json();
      if (typeof body.maxCompanies === "number" && body.maxCompanies > 0) {
        maxCompanies = Math.min(body.maxCompanies, 50);
      }
    } catch {
      // Body is optional
    }

    const result = await runBizRaportSearch(id, { maxCompanies });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Pobrano i zapisano ${result.addedCount} firm (znaleziono łącznie w KRS: ${result.totalFound}).`,
    });
  } catch (error: any) {
    console.error("Execution error in /api/searches/[id]/run:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Błąd podczas uruchamiania wyszukiwania w BizRaport.",
      },
      { status: 500 }
    );
  }
}
