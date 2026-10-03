import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatCompanyForGoogleSheets,
  generateGoogleSheetsCsv,
  generateGoogleSheetsTsv,
  type GoogleSheetsRow,
} from "@/lib/contacts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/searches/[id]/export?format=csv|tsv|json
 * Export companies and contacts tailored for Google Sheets:
 * Columns:
 * - Firma
 * - Kontakt
 * - Stanowisko
 * - Email
 * - LinkedIn
 * - Score
 * - Punkt zaczepienia
 * - Źródło
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: searchId } = await context.params;
    const url = new URL(request.url);
    const format = url.searchParams.get("format") || "csv";

    const companies = await prisma.company.findMany({
      where: { searchId },
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
      const rows = formatCompanyForGoogleSheets(comp);
      allRows.push(...rows);
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

    // Default: CSV with UTF-8 BOM
    const csvContent = generateGoogleSheetsCsv(allRows);
    const filename = `lead-hunter-google-sheets-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Błąd eksportu do Google Sheets:", error);
    return NextResponse.json(
      { error: "Nie udało się wyeksportować danych.", details: error?.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/searches/[id]/export
 * Push directly to a Google Sheets Webhook URL (Google Apps Script).
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: searchId } = await context.params;
    const body = await request.json();
    const webhookUrl = body?.webhookUrl;

    if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("http")) {
      return NextResponse.json(
        { error: "Podaj prawidłowy URL webhooka Google Sheets (Google Apps Script)." },
        { status: 400 }
      );
    }

    const companies = await prisma.company.findMany({
      where: { searchId },
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

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "Lead Hunter",
        exportedAt: new Date().toISOString(),
        rows: allRows,
      }),
    });

    if (!webhookRes.ok) {
      return NextResponse.json(
        { error: `Webhook Google Sheets zwrócił status ${webhookRes.status}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sentRows: allRows.length,
      message: `Pomyślnie wysłano ${allRows.length} wierszy do Arkusza Google.`,
    });
  } catch (error: any) {
    console.error("Błąd wysyłki webhooka Google Sheets:", error);
    return NextResponse.json(
      { error: "Nie udało się przesłać danych do Arkusza Google.", details: error?.message },
      { status: 500 }
    );
  }
}
