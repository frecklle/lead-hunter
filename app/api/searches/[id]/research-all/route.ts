import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { researchCompany } from "@/lib/research";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/searches/[id]/research-all — Run scraping & research for all companies in a search
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

    const companies = await prisma.company.findMany({
      where: { searchId: id },
      select: { id: true, name: true },
    });

    if (companies.length === 0) {
      return NextResponse.json({
        success: true,
        researchedCount: 0,
        message: "Brak firm do zbadania w tym wyszukiwaniu.",
      });
    }

    const results = await Promise.allSettled(
      companies.map((comp) => researchCompany(comp.id, { monthsBack }))
    );

    const researchedCount = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({
      success: true,
      researchedCount,
      totalCount: companies.length,
      message: `Pomyślnie zbadano ${researchedCount} z ${companies.length} firm i wygenerowano punkty zaczepienia.`,
    });
  } catch (error: any) {
    console.error("Error in research-all route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Błąd podczas masowego researchu firm.",
      },
      { status: 500 }
    );
  }
}
