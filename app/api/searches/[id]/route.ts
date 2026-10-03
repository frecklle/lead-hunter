import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SearchCriteria } from "@/types/search";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/searches/[id]
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const search = await prisma.search.findUnique({
      where: { id },
      include: {
        companies: true,
        _count: { select: { companies: true } },
      },
    });

    if (!search) {
      return NextResponse.json(
        { success: false, error: "Nie znaleziono wyszukiwania." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: search });
  } catch (error) {
    console.error("Failed to fetch search:", error);
    return NextResponse.json(
      { success: false, error: "Błąd podczas pobierania wyszukiwania." },
      { status: 500 }
    );
  }
}

// PATCH /api/searches/[id]
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, criteria, status } = body as {
      name?: string;
      criteria?: SearchCriteria;
      status?: "DRAFT" | "RUNNING" | "DONE" | "ERROR";
    };

    const search = await prisma.search.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(criteria && { criteria: criteria as any }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({ success: true, data: search });
  } catch (error) {
    console.error("Failed to update search:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się zaktualizować wyszukiwania." },
      { status: 500 }
    );
  }
}

// DELETE /api/searches/[id]
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await prisma.search.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error("Failed to delete search:", error);
    return NextResponse.json(
      { success: false, error: "Nie udało się usunąć wyszukiwania." },
      { status: 500 }
    );
  }
}
