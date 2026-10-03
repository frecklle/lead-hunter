import { NextResponse } from "next/server";
import { researchCompany } from "@/lib/research";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/companies/[id]/research — Run scraping & trigger research for a specific company
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let monthsBack = 12;

    try {
      const body = await request.json();
      if (typeof body.monthsBack === "number" && body.monthsBack > 0) {
        monthsBack = body.monthsBack;
      }
    } catch {
      // Optional body
    }

    const result = await researchCompany(id, { monthsBack });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Zidentyfikowano ${result.triggers.length} punktów zaczepienia dla tej firmy.`,
    });
  } catch (error: any) {
    console.error("Error in company research route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Błąd podczas przeprowadzania researchu firmy.",
      },
      { status: 500 }
    );
  }
}
