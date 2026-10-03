import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SearchCriteria } from "@/types/search";

// GET /api/searches — List all saved search configurations
export async function GET() {
  try {
    const searches = await prisma.search.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: searches,
    });
  } catch (error) {
    console.error("Failed to fetch searches:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się pobrać zapisanych wyszukiwań." },
      { status: 500 }
    );
  }
}

// POST /api/searches — Create a new search configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, criteria } = body as { name: string; criteria?: SearchCriteria };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Nazwa wyszukiwania jest wymagana." },
        { status: 400 }
      );
    }

    const search = await prisma.search.create({
      data: {
        name: name.trim(),
        criteria: (criteria ?? {}) as any,
        status: "DRAFT",
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: search,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create search:", error);
    return NextResponse.json(
      { success: false, error: "Błąd podczas zapisywania konfiguracji wyszukiwania." },
      { status: 500 }
    );
  }
}
