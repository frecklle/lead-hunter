import { NextResponse } from "next/server";
import { discoverCompanyContacts } from "@/lib/contacts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/companies/[id]/contacts/find
 * Trigger Contact Finder & Decision Maker discovery for a company.
 * Discovers:
 * - CEO / Prezes Zarządu
 * - Właściciel / Wspólnicy
 * - Dyrektorzy (Operacyjny, Handlowy, Finansowy)
 * - Osoba odpowiedzialna za dany obszar (Inwestycje, Maszyny, Ekspansja, HR)
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: companyId } = await context.params;

    if (!companyId) {
      return NextResponse.json(
        { error: "Brak identyfikatora firmy." },
        { status: 400 }
      );
    }

    const contacts = await discoverCompanyContacts(companyId);

    return NextResponse.json({
      success: true,
      companyId,
      contactsCount: contacts.length,
      contacts,
      message: `Znaleziono ${contacts.length} osób decyzyjnych i kontaktów.`,
    });
  } catch (error: any) {
    console.error("Błąd podczas wyszukiwania kontaktów:", error);
    return NextResponse.json(
      {
        error: "Nie udało się pobrać kontaktów.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
