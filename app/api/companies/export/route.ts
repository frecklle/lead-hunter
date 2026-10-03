import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatCompanyForGoogleSheets,
  generateGoogleSheetsCsv,
  generateGoogleSheetsTsv,
  type GoogleSheetsRow,
} from "@/lib/contacts";

/**
 * GET /api/companies/export?format=csv|tsv|json
 * Export all companies and contacts tailored for Google Sheets
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "csv";

    const companies = await prisma.company.findMany({
      include: {
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        triggers: {
          orderBy: { confidence: "desc" },
        },
      },
      orderBy: { score: "desc" },
    });

    const allRows: GoogleSheetsRow[] = [];
    for (const comp of companies) {
      allRows.push(...formatCompanyForGoogleSheets(comp));
    }

    if (format === "tsv") {
      const tsvContent = generateGoogleSheetsTsv(allRows);
      return new NextResponse(tsvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/tab-separated-values; charset=utf-8",
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({
        success: true,
        count: allRows.length,
        rows: allRows,
      });
    }

    const csvContent = generateGoogleSheetsCsv(allRows);
    const filename = `wszystkie-firmy-google-sheets-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Błąd eksportu firm do Google Sheets:", error);
    return NextResponse.json(
      { error: "Nie udało się wyeksportować danych.", details: error?.message },
      { status: 500 }
    );
  }
}
