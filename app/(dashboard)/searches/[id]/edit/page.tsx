import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SearchConfigForm } from "@/components/SearchConfigForm";
import type { SearchCriteria, SearchConfig } from "@/types/search";

interface EditSearchPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSearchPage({ params }: EditSearchPageProps) {
  const { id } = await params;

  const search = await prisma.search.findUnique({
    where: { id },
  });

  if (!search) {
    notFound();
  }

  const searchConfig: SearchConfig = {
    id: search.id,
    name: search.name,
    status: search.status,
    criteria: (search.criteria as unknown as SearchCriteria) || {},
    createdAt: search.createdAt.toISOString(),
    updatedAt: search.updatedAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Header breadcrumb & title */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/searches" className="hover:text-zinc-200 transition-colors">
            Wyszukiwania
          </Link>
          <span>/</span>
          <span style={{ color: "var(--brand)" }}>Edycja</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Edytuj Kryteria: {search.name}
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Zaktualizuj filtry wyszukiwania firm dla tej konfiguracji.
        </p>
      </div>

      {/* Form with initialData */}
      <SearchConfigForm initialData={searchConfig} isEditing={true} />
    </div>
  );
}
