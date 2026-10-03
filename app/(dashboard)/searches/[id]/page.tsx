import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SearchExecutionPanel } from "@/components/SearchExecutionPanel";
import { CompanyList, type CompanyItem } from "@/components/CompanyList";
import type { SearchCriteria } from "@/types/search";

export const revalidate = 0; // Dynamic server component

interface SearchDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default async function SearchDetailsPage({ params }: SearchDetailsPageProps) {
  const { id } = await params;

  const search = await prisma.search.findUnique({
    where: { id },
    include: {
      companies: {
        orderBy: { score: "desc" },
        include: {
          triggers: {
            orderBy: { createdAt: "desc" },
          },
          contacts: {
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      },
    },
  });

  if (!search) {
    notFound();
  }

  const criteria = (search.criteria as unknown as SearchCriteria) || {};

  const mappedCompanies: CompanyItem[] = search.companies.map((c) => ({
    id: c.id,
    krs: c.krs,
    name: c.name,
    nip: c.nip,
    regon: c.regon,
    legalForm: c.legalForm,
    revenue: c.revenue,
    netProfit: c.netProfit,
    ebitda: c.ebitda,
    equity: c.equity,
    companyValue: c.companyValue,
    creditLimit: c.creditLimit,
    employees: c.employees,
    reliabilityScore: c.reliabilityScore,
    riskProbability: c.riskProbability,
    score: c.score,
    scoreReason: c.scoreReason,
    pkd: c.pkd,
    pkdName: c.pkdName,
    street: c.street,
    city: c.city,
    postalCode: c.postalCode,
    voivodeship: c.voivodeship,
    website: c.website,
    email: c.email,
    description: c.description,
    keyPoints: c.keyPoints,
    shareholders: c.shareholders,
    management: c.management,
    researchStatus: c.researchStatus,
    researchedAt: c.researchedAt?.toISOString() || null,
    primaryHook: c.primaryHook,
    triggers: (c.triggers || []).map((t) => ({
      id: t.id,
      category: t.category as any,
      title: t.title,
      snippet: t.snippet,
      source: t.source,
      sourceUrl: t.sourceUrl,
      publishedAt: t.publishedAt?.toISOString() || null,
      hookSuggestion: t.hookSuggestion,
      confidence: t.confidence,
    })),
    contacts: (c.contacts || []).map((ct) => ({
      id: ct.id,
      name: ct.name,
      role: ct.role,
      department: ct.department,
      email: ct.email,
      phone: ct.phone,
      linkedinUrl: ct.linkedinUrl,
      source: ct.source,
      sourceUrl: ct.sourceUrl,
      isPrimary: ct.isPrimary,
      notes: ct.notes,
    })),
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            <Link href="/searches" className="hover:text-zinc-200 transition-colors">
              Wyszukiwania
            </Link>
            <span>/</span>
            <span style={{ color: "var(--brand)" }}>Wyniki</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {search.name}
            </h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background:
                  search.status === "DONE"
                    ? "rgba(34, 197, 94, 0.15)"
                    : search.status === "RUNNING"
                    ? "rgba(59, 130, 246, 0.15)"
                    : "var(--surface-3)",
                color:
                  search.status === "DONE"
                    ? "#4ade80"
                    : search.status === "RUNNING"
                    ? "#60a5fa"
                    : "var(--text-muted)",
              }}
            >
              {search.status}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/searches/${search.id}/edit`}
            className="rounded-lg border px-3.5 py-2 text-xs font-medium transition-all hover:bg-white/5"
            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
          >
            Edytuj Kryteria ⚙
          </Link>
        </div>
      </div>

      {/* Criteria Overview Chips */}
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border p-3 text-xs"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <span className="font-semibold text-zinc-400">Aktywne filtry:</span>
        {criteria.revenueMin && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-emerald-400">
            Obrót &gt; {(criteria.revenueMin / 1_000_000).toFixed(1)}M PLN
          </span>
        )}
        {criteria.pkdSection && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Sekcja PKD: {criteria.pkdSection}
          </span>
        )}
        {criteria.pkdDivision && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Dział PKD: {criteria.pkdDivision}
          </span>
        )}
        {criteria.employeesMin && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Pracownicy: &gt; {criteria.employeesMin} os.
          </span>
        )}
        {(criteria.voivodeships?.length || 0) > 0 && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Województwa: {criteria.voivodeships?.length === 16 ? "Cała Polska" : criteria.voivodeships?.join(", ")}
          </span>
        )}
        {criteria.city && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Miasto: {criteria.city}
          </span>
        )}
        {criteria.query && (
          <span className="rounded bg-black/30 px-2 py-0.5 font-medium text-zinc-300">
            Słowo kluczowe: &quot;{criteria.query}&quot;
          </span>
        )}
      </div>

      {/* Execution Control & API Quota Panel */}
      <SearchExecutionPanel
        searchId={search.id}
        status={search.status}
        lastRunAt={search.lastRunAt ? search.lastRunAt.toISOString() : null}
        resultsCount={search.companies.length}
        companies={mappedCompanies}
      />

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Znalezione Firmy i Leady ({search.companies.length})
          </h2>
        </div>

        <CompanyList companies={mappedCompanies} searchId={search.id} />
      </div>
    </div>
  );
}
