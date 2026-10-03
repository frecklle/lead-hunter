import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CompanyList, type CompanyItem } from "@/components/CompanyList";

export const revalidate = 0; // Dynamic server component

export default async function CompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { score: "desc" },
    include: {
      triggers: {
        orderBy: { createdAt: "desc" },
      },
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      search: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const mappedCompanies: CompanyItem[] = companies.map((c) => ({
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Baza Odkrytych Firm i Leadów
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Wszystkie podmioty pobrane z KRS i BizRaport ze wszystkich zapisanych wyszukiwań.
          </p>
        </div>

        <Link
          href="/searches/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--brand)", color: "#051e0d" }}
        >
          + Nowe Wyszukiwanie
        </Link>
      </div>

      {/* Companies List */}
      <CompanyList companies={mappedCompanies} />
    </div>
  );
}
