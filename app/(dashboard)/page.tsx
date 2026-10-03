import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export default async function DashboardPage() {
  const [searchesCount, companiesCount, qualifiedLeadsCount, recentSearches] = await Promise.all([
    prisma.search.count(),
    prisma.company.count(),
    prisma.company.count({ where: { score: { gte: 70 } } }),
    prisma.search.findMany({
      take: 4,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { companies: true } },
      },
    }),
  ]);

  const stats = [
    {
      id: "searches",
      label: "Zapisane Wyszukiwania",
      value: searchesCount,
      description: "Skonfigurowane filtry KRS i BizRaport",
      href: "/searches",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.5 12.5l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "companies",
      label: "Odkryte Firmy",
      value: companiesCount,
      description: "Pobrane podmioty z bazy KRS",
      href: "/companies",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2.5" y="6" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 6V4.5a3 3 0 016 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 10v3M7.5 11.5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "leads",
      label: "Zakwalifikowane Leady",
      value: qualifiedLeadsCount,
      description: "Firmy z Lead Score ≥ 70",
      href: "/companies",
      icon: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 1.5l2.25 4.5 5 .75-3.62 3.5.86 4.97L9 12.75l-4.49 2.47.86-4.97L1.75 6.75l5-.75L9 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Sales Intelligence Workspace
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Wyszukuj, oceniaj wiarygodność i generuj leady B2B w oparciu o BizRaport API i KRS.
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

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.id}
            href={stat.href}
            className="group relative overflow-hidden rounded-xl border p-5 transition-all hover:border-emerald-500/40"
            style={{
              background: "var(--surface-2)",
              borderColor: "var(--border)",
            }}
          >
            {/* Subtle brand glow on top edge */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, var(--brand) 50%, transparent)",
                opacity: 0.3,
              }}
            />

            <div className="flex items-start justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  background: "var(--brand-glow)",
                  color: "var(--brand)",
                }}
              >
                {stat.icon}
              </div>
            </div>

            <p
              className="mt-4 text-4xl font-bold tracking-tight group-hover:text-emerald-400 transition-colors"
              style={{ color: "var(--text-primary)" }}
            >
              {stat.value}
            </p>
            <p
              className="mt-0.5 text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {stat.label}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {stat.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent Searches */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Ostatnie Wyszukiwania
          </h2>

          <Link href="/searches" className="text-xs font-semibold text-emerald-400 hover:underline">
            Zobacz wszystkie →
          </Link>
        </div>

        {recentSearches.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Brak zapisanych wyszukiwań. Kliknij przycisk powyżej, aby stworzyć pierwsze.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {recentSearches.map((s) => (
              <Link
                key={s.id}
                href={`/searches/${s.id}`}
                className="group flex items-center justify-between rounded-xl border p-4 transition-all hover:border-emerald-500/40"
                style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
              >
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold group-hover:text-emerald-400 transition-colors" style={{ color: "var(--text-primary)" }}>
                    {s.name}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s._count.companies} pobranych firm z KRS
                  </p>
                </div>

                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background:
                      s.status === "DONE"
                        ? "rgba(34, 197, 94, 0.15)"
                        : s.status === "RUNNING"
                        ? "rgba(59, 130, 246, 0.15)"
                        : "var(--surface-3)",
                    color:
                      s.status === "DONE"
                        ? "#4ade80"
                        : s.status === "RUNNING"
                        ? "#60a5fa"
                        : "var(--text-muted)",
                  }}
                >
                  {s.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Integration Status info */}
      <section
        className="rounded-xl border p-5"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            BizRaport REST API Aktywne
          </h3>
        </div>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Połączono z oficjalnym API BizRaport (<code>api.bizraport.pl</code>) dla konta <code>oracicki@gmail.com</code>.
          Wyszukiwanie pobiera dane rejestrowe KRS, finanse spółek (przychody, zysk, EBITDA), wskaźniki wiarygodności płatniczej (1-5), szacowaną wycenę, sugerowany limit kredytu kupieckiego oraz strukturę wspólników i zarządu.
        </p>
      </section>
    </div>
  );
}
