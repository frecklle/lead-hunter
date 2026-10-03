import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchCriteria } from "@/types/search";

export const revalidate = 0; // Dynamic server page

export default async function SearchesPage() {
  const searches = await prisma.search.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { companies: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Konfiguracje Wyszukiwań
          </h1>
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Zarządzaj kryteriami targetowania firm z BizRaport API i KRS.
          </p>
        </div>

        <Link
          href="/searches/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--brand)", color: "#051e0d" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Nowe Wyszukiwanie
        </Link>
      </div>

      {/* List of Searches */}
      {searches.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border p-12 text-center"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Brak zapisanych wyszukiwań
          </h3>
          <p className="mt-1 max-w-sm text-xs" style={{ color: "var(--text-muted)" }}>
            Skonfiguruj swoje pierwsze kryteria (branża, minimalny obrót, lokalizacja, liczba pracowników), aby zacząć wyszukiwać firmy.
          </p>
          <Link
            href="/searches/new"
            className="mt-5 rounded-lg px-4 py-2 text-xs font-semibold transition-all hover:opacity-90"
            style={{ background: "var(--surface-3)", color: "var(--text-primary)" }}
          >
            Stwórz pierwsze wyszukiwanie
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {searches.map((search) => {
            const criteria = (search.criteria as unknown as SearchCriteria) || {};
            const count = search._count.companies;

            return (
              <div
                key={search.id}
                className="flex flex-col justify-between rounded-xl border p-5 shadow-sm transition-all hover:border-emerald-500/30"
                style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
              >
                <div>
                  {/* Status & Title */}
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/searches/${search.id}`}
                      className="text-base font-semibold leading-tight hover:text-emerald-400 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {search.name}
                    </Link>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
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

                  {/* Filter chips overview */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {criteria.revenueMin && (
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        Obrót: &gt;{(criteria.revenueMin / 1_000_000).toFixed(1)}M PLN
                      </span>
                    )}
                    {criteria.pkdSection && (
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        PKD: Sekcja {criteria.pkdSection}
                      </span>
                    )}
                    {(criteria.voivodeships?.length || 0) > 0 && (
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        Lokalizacja: {criteria.voivodeships?.length === 16 ? "Cała Polska" : `${criteria.voivodeships?.length} woj.`}
                      </span>
                    )}
                    {criteria.employeesMin && (
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                      >
                        Pracownicy: &gt;{criteria.employeesMin} os.
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer metadata & actions */}
                <div className="mt-6 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-emerald-400">
                      {count}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                      pobranych firm
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/searches/${search.id}/edit`}
                      className="text-xs transition-colors hover:text-white"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Edytuj ⚙
                    </Link>
                    <Link
                      href={`/searches/${search.id}`}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: "var(--brand)" }}
                    >
                      {count > 0 ? "Zobacz wyniki →" : "Uruchom →"}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
