import { NextResponse } from "next/server";
import { discoverContactsForAllCompaniesInSearch } from "@/lib/contacts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/searches/[id]/contacts/find-all
 * Batch decision-maker discovery for all companies in a search.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: searchId } = await context.params;

    if (!searchId) {
      return NextResponse.json(
        { error: "Brak identyfikatora wyszukiwania." },
        { status: 400 }
      );
    }

    const result = await discoverContactsForAllCompaniesInSearch(searchId);

    return NextResponse.json({
      success: true,
      searchId,
      totalCompanies: result.totalCompanies,
      contactsFound: result.contactsFound,
      message: `Pomyślnie zbadano ${result.totalCompanies} firm i odnaleziono ${result.contactsFound} osób decyzyjnych.`,
    });
  } catch (error: any) {
    console.error("Błąd podczas wsadowego wyszukiwania kontaktów:", error);
    return NextResponse.json(
      {
        error: "Nie udało się przeprowadzić wyszukiwania kontaktów.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
