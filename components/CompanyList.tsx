"use client";

import { useState } from "react";
import { GoogleSheetsExportModal } from "./GoogleSheetsExportModal";

export interface TriggerItem {
  id?: string;
  category: "INWESTYCJE" | "MASZYNY" | "EKSPANSJA" | "REKRUTACJE" | "LOKALIZACJE" | "NEWS" | "LINKEDIN";
  title: string;
  snippet: string;
  source?: string | null;
  sourceUrl?: string | null;
  publishedAt?: string | null;
  hookSuggestion: string;
  confidence?: number;
}

export interface ContactItem {
  id?: string;
  name: string;
  role: string;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  isPrimary?: boolean;
  notes?: string | null;
}

export interface CompanyItem {
  id: string;
  krs: string;
  name: string;
  nip: string | null;
  regon: string | null;
  legalForm: string | null;
  revenue: number | null;
  netProfit: number | null;
  ebitda: number | null;
  equity: number | null;
  companyValue: number | null;
  creditLimit: number | null;
  employees: number | null;
  reliabilityScore: number | null;
  riskProbability: number | null;
  score: number | null;
  scoreReason: string | null;
  pkd: string | null;
  pkdName: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  voivodeship: string | null;
  website: string | null;
  email: string | null;
  description: string | null;
  keyPoints?: any;
  shareholders?: any;
  management?: any;
  researchStatus?: string;
  researchedAt?: string | null;
  primaryHook?: string | null;
  triggers?: TriggerItem[];
  contacts?: ContactItem[];
  createdAt: string;
}

interface CompanyListProps {
  companies: CompanyItem[];
  searchId?: string;
}

export function CompanyList({ companies: initialCompanies, searchId }: CompanyListProps) {
  const [companies, setCompanies] = useState<CompanyItem[]>(initialCompanies);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "revenue" | "employees">("score");
  const [researchingId, setResearchingId] = useState<string | null>(null);
  const [findingContactsId, setFindingContactsId] = useState<string | null>(null);
  const [copiedHookId, setCopiedHookId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Sync state if props change
  if (initialCompanies.length !== companies.length && researchingId === null && findingContactsId === null) {
    setCompanies(initialCompanies);
  }

  const handleResearch = async (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResearchingId(companyId);

    try {
      const res = await fetch(`/api/companies/${companyId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthsBack: 12 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Błąd researchu firmy.");
      }

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? {
                ...c,
                researchStatus: "COMPLETED",
                primaryHook: data.data.primaryHook,
                triggers: data.data.triggers,
              }
            : c
        )
      );

      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) =>
          prev
            ? {
                ...prev,
                researchStatus: "COMPLETED",
                primaryHook: data.data.primaryHook,
                triggers: data.data.triggers,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || "Nie udało się pobrać punktów zaczepienia.");
    } finally {
      setResearchingId(null);
    }
  };

  const handleFindContacts = async (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFindingContactsId(companyId);

    try {
      const res = await fetch(`/api/companies/${companyId}/contacts/find`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Błąd wyszukiwania kontaktów.");
      }

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? {
                ...c,
                contacts: data.contacts,
              }
            : c
        )
      );

      if (selectedCompany && selectedCompany.id === companyId) {
        setSelectedCompany((prev) =>
          prev
            ? {
                ...prev,
                contacts: data.contacts,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || "Nie udało się odnaleźć kontaktów.");
    } finally {
      setFindingContactsId(null);
    }
  };

  const copyToClipboard = (text: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedHookId(id);
    setTimeout(() => setCopiedHookId(null), 2500);
  };

  const copyEmail = (email: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2500);
  };

  const filteredCompanies = companies
    .filter((c) => {
      const q = searchFilter.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.nip && c.nip.includes(q)) ||
        c.krs.includes(q) ||
        (c.primaryHook && c.primaryHook.toLowerCase().includes(q)) ||
        c.contacts?.some(
          (ct) =>
            ct.name.toLowerCase().includes(q) ||
            ct.role.toLowerCase().includes(q) ||
            (ct.email && ct.email.toLowerCase().includes(q))
        )
      );
    })
    .sort((a, b) => {
      if (sortBy === "score") return (b.score || 0) - (a.score || 0);
      if (sortBy === "revenue") return (b.revenue || 0) - (a.revenue || 0);
      if (sortBy === "employees") return (b.employees || 0) - (a.employees || 0);
      return 0;
    });

  const formatPLN = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} mld PLN`;
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)} mln PLN`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)} tys. PLN`;
    return `${val.toLocaleString("pl-PL")} PLN`;
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return { bg: "var(--surface-3)", text: "var(--text-muted)" };
    if (score >= 80) return { bg: "rgba(34, 197, 94, 0.15)", text: "#4ade80", border: "#22c55e" };
    if (score >= 60) return { bg: "rgba(234, 179, 8, 0.15)", text: "#facc15", border: "#eab308" };
    return { bg: "rgba(239, 68, 68, 0.15)", text: "#f87171", border: "#ef4444" };
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "INWESTYCJE":
        return { label: "Inwestycje", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "MASZYNY":
        return { label: "Nowe Maszyny", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
      case "EKSPANSJA":
        return { label: "Ekspansja", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
      case "REKRUTACJE":
        return { label: "Rekrutacja", color: "bg-purple-500/15 text-purple-400 border-purple-500/30" };
      case "LOKALIZACJE":
        return { label: "Nowe Lokalizacje", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "LINKEDIN":
        return { label: "LinkedIn", color: "bg-sky-500/15 text-sky-400 border-sky-500/30" };
      default:
        return { label: "News", color: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" };
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Szukaj (firma, osoba, stanowisko, email)..."
            className="w-full rounded-lg border px-3 py-1.5 text-xs outline-none transition-colors"
            style={{
              background: "var(--surface-1)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to Google Sheets Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-slate-950"
          >
            📊 Eksport do Google Sheets
          </button>

          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="hidden sm:inline">Sortuj:</span>
            <button
              onClick={() => setSortBy("score")}
              className="rounded-md border px-2 py-1 text-xs transition-colors"
              style={{
                background: sortBy === "score" ? "var(--brand-glow)" : "var(--surface-1)",
                borderColor: sortBy === "score" ? "var(--brand)" : "var(--border)",
                color: sortBy === "score" ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              Score
            </button>
            <button
              onClick={() => setSortBy("revenue")}
              className="rounded-md border px-2 py-1 text-xs transition-colors"
              style={{
                background: sortBy === "revenue" ? "var(--brand-glow)" : "var(--surface-1)",
                borderColor: sortBy === "revenue" ? "var(--brand)" : "var(--border)",
                color: sortBy === "revenue" ? "var(--brand)" : "var(--text-secondary)",
              }}
            >
              Obrót
            </button>
          </div>
        </div>
      </div>

      {/* Companies count */}
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span>Wyświetlono {filteredCompanies.length} z {companies.length} pobranych firm</span>
        <span className="text-emerald-400">
          Łącznie {companies.reduce((acc, c) => acc + (c.contacts?.length || 0), 0)} znalezionych osób decyzyjnych
        </span>
      </div>

      {/* Company Cards / Table */}
      {filteredCompanies.length === 0 ? (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Brak firm spełniających podane kryteria filtrowania.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCompanies.map((c) => {
            const scoreStyle = getScoreColor(c.score);
            const isResearching = researchingId === c.id;
            const isFindingContacts = findingContactsId === c.id;
            const hasTriggers = Array.isArray(c.triggers) && c.triggers.length > 0;
            const hasContacts = Array.isArray(c.contacts) && c.contacts.length > 0;
            const primaryContact = c.contacts?.find((ct) => ct.isPrimary) || c.contacts?.[0];

            return (
              <div
                key={c.id}
                onClick={() => setSelectedCompany(c)}
                className="group relative cursor-pointer rounded-xl border p-4 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md"
                style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  {/* Left: Company identity */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className="text-sm font-semibold tracking-tight group-hover:text-emerald-400 transition-colors truncate"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {c.name}
                      </h4>
                      {c.legalForm && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                        >
                          {c.legalForm}
                        </span>
                      )}
                    </div>

                    {/* Registry IDs & Location */}
                    <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                      <span>KRS: <strong className="text-zinc-300 font-mono">{c.krs.replace("_", "")}</strong></span>
                      {c.nip && <span>NIP: <strong className="text-zinc-300 font-mono">{c.nip}</strong></span>}
                      {c.city && (
                        <span>
                          📍 {c.city}{c.voivodeship ? `, woj. ${c.voivodeship.toLowerCase()}` : ""}
                        </span>
                      )}
                    </div>

                    {/* CONTACT FINDER: Decydenci & Contacts preview */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      {hasContacts ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                            👤 <strong className="text-white">{primaryContact?.name}</strong> ({primaryContact?.role})
                          </span>
                          {c.contacts!.length > 1 && (
                            <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                              +{c.contacts!.length - 1} innych decydentów
                            </span>
                          )}
                          {primaryContact?.email && (
                            <span className="text-[11px] text-blue-400 hover:underline">
                              ✉ {primaryContact.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isFindingContacts}
                          onClick={(e) => handleFindContacts(c.id, e)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors disabled:opacity-50"
                        >
                          {isFindingContacts ? (
                            <>
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Szukanie CEO / Dyrektorów...
                            </>
                          ) : (
                            <>👥 Znajdź kontakty (CEO / Dyrektor)</>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Trigger badges if researched */}
                    {hasTriggers && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {Array.from(new Set(c.triggers?.map((t) => t.category))).map((cat) => {
                          const badge = getCategoryBadge(cat);
                          return (
                            <span
                              key={cat}
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}
                            >
                              ● {badge.label}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Primary Hook (PUNKT ZACZEPIENIA) Box */}
                    {c.primaryHook ? (
                      <div
                        className="mt-2.5 rounded-lg border p-2.5 text-xs transition-colors"
                        style={{
                          background: "rgba(16, 185, 129, 0.06)",
                          borderColor: "rgba(16, 185, 129, 0.25)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-emerald-400 text-[11px] flex items-center gap-1">
                            🎯 PUNKT ZACZEPIENIA (OUTREACH HOOK):
                          </span>
                          <button
                            type="button"
                            onClick={(e) => copyToClipboard(c.primaryHook!, `card-${c.id}`, e)}
                            className="rounded px-2 py-0.5 text-[10px] font-semibold transition-all hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          >
                            {copiedHookId === `card-${c.id}` ? "✓ Skopiowano!" : "📋 Kopiuj hook"}
                          </button>
                        </div>
                        <p className="italic text-zinc-300 leading-relaxed text-[11.5px]">
                          &ldquo;{c.primaryHook}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isResearching}
                          onClick={(e) => handleResearch(c.id, e)}
                          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 disabled:opacity-50"
                          style={{
                            borderColor: "var(--brand)",
                            color: "var(--brand)",
                            background: "var(--brand-glow)",
                          }}
                        >
                          {isResearching ? (
                            <>
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Researching news, maszyny, inwestycje...
                            </>
                          ) : (
                            <>🔍 Zbadaj firmę & znajdź punkty zaczepienia</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Score & Key Metrics */}
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-right text-xs">
                      <div>
                        <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
                          Przychody
                        </span>
                        <strong className="text-zinc-200">{formatPLN(c.revenue)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>
                          Pracownicy
                        </span>
                        <strong className="text-zinc-200">
                          {c.employees ? `${c.employees} os.` : "—"}
                        </strong>
                      </div>
                    </div>

                    {/* Score badge */}
                    <div
                      className="flex h-12 w-12 flex-col items-center justify-center rounded-xl border text-center shrink-0 shadow-sm"
                      style={{
                        background: scoreStyle.bg,
                        color: scoreStyle.text,
                        borderColor: scoreStyle.border || "transparent",
                      }}
                      title={c.scoreReason || "Lead Score"}
                    >
                      <span className="text-base font-bold leading-none">{c.score || "—"}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wider mt-0.5">SCORE</span>
                    </div>
                  </div>
                </div>

                {/* Footer preview tags */}
                <div
                  className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex flex-wrap gap-2 items-center">
                    {c.website && (
                      <span className="text-emerald-400 hover:underline">
                        🌐 {c.website.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                    {hasTriggers && (
                      <span className="text-zinc-400">
                        🎯 {c.triggers?.length} punktów zaczepienia
                      </span>
                    )}
                    {hasContacts && (
                      <span className="text-cyan-400 font-medium">
                        👥 {c.contacts?.length} decydentów
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-medium text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    Zobacz raport i punkty zaczepienia →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Modal Drawer */}
      {selectedCompany && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelectedCompany(null)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border p-6 shadow-2xl"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedCompany(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>

            {/* Header */}
            <div className="pr-8">
              <div className="flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 text-xs font-bold"
                  style={{
                    background: getScoreColor(selectedCompany.score).bg,
                    color: getScoreColor(selectedCompany.score).text,
                  }}
                >
                  SCORE {selectedCompany.score}/100
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {selectedCompany.legalForm || "Podmiot KRS"}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                {selectedCompany.name}
              </h2>
              <div className="mt-1 flex flex-wrap gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span>KRS: <strong className="text-zinc-200">{selectedCompany.krs}</strong></span>
                {selectedCompany.nip && <span>NIP: <strong className="text-zinc-200">{selectedCompany.nip}</strong></span>}
                {selectedCompany.city && (
                  <span>
                    📍 {selectedCompany.street || ""}, {selectedCompany.city}
                  </span>
                )}
              </div>
            </div>

            {/* CONTACT FINDER: DECISION MAKERS SECTION */}
            <div
              className="mt-6 rounded-xl border p-4.5"
              style={{
                background: "rgba(6, 182, 212, 0.05)",
                borderColor: "rgba(6, 182, 212, 0.3)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 text-xs font-bold">
                    👥
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-400">
                      CONTACT FINDER (CEO, Właściciele, Dyrektorzy, Osoby odpowiedzialne)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Zbadano rejestry KRS, powiązania zarządcze, strukturę strony WWW oraz profil LinkedIn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={findingContactsId === selectedCompany.id}
                  onClick={(e) => handleFindContacts(selectedCompany.id, e)}
                  className="rounded-lg border px-3 py-1 text-xs font-semibold transition-all hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30 active:scale-95 disabled:opacity-50"
                >
                  {findingContactsId === selectedCompany.id ? "Przeszukiwanie kontaktów..." : "🔄 Odśwież kontakty"}
                </button>
              </div>

              {/* Contacts Grid */}
              {Array.isArray(selectedCompany.contacts) && selectedCompany.contacts.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedCompany.contacts.map((contact, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border p-3 text-xs bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100 text-[13px]">{contact.name}</span>
                            {contact.isPrimary && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ⭐ Główny decydent
                              </span>
                            )}
                          </div>
                          <p className="text-cyan-400 font-medium text-xs mt-0.5">
                            {contact.role}
                          </p>
                          {contact.department && (
                            <span className="text-[10px] text-slate-400">
                              Dział: {contact.department}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 whitespace-nowrap">
                          {contact.source}
                        </span>
                      </div>

                      {/* Contact details: email & phone */}
                      <div className="mt-2.5 space-y-1 pt-2 border-t border-slate-800/80">
                        {contact.email && (
                          <div className="flex items-center justify-between gap-2">
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-blue-400 hover:underline truncate text-[11px]"
                            >
                              ✉ {contact.email}
                            </a>
                            <button
                              type="button"
                              onClick={(e) => copyEmail(contact.email!, `ct-email-${idx}`, e)}
                              className="px-1.5 py-0.5 text-[10px] rounded text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                              {copiedEmailId === `ct-email-${idx}` ? "✓ Skopiowano" : "Kopiuj"}
                            </button>
                          </div>
                        )}

                        {contact.phone && (
                          <div className="text-[11px] text-slate-300">
                            📞 {contact.phone}
                          </div>
                        )}
                      </div>

                      {/* LinkedIn button & Notes */}
                      <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400 italic truncate max-w-[200px]" title={contact.notes || ""}>
                          {contact.notes || "Osoba decyzyjna w firmie"}
                        </span>

                        {contact.linkedinUrl && (
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 flex items-center gap-1 transition-colors"
                          >
                            🔗 Profil LinkedIn
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  <p>Brak zapisanych kontaktów. Kliknij &quot;Odśwież kontakty&quot;, aby przeskanować KRS, organy reprezentacji i stronę firmy pod kątem CEO, właścicieli i dyrektorów.</p>
                </div>
              )}
            </div>

            {/* RESEARCH & PUNKTY ZACZEPIENIA SECTION */}
            <div
              className="mt-6 rounded-xl border p-4.5"
              style={{
                background: "rgba(16, 185, 129, 0.05)",
                borderColor: "rgba(16, 185, 129, 0.3)",
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                    🎯
                  </span>
                  <h3 className="text-sm font-bold text-emerald-400">
                    PUNKTY ZACZEPIENIA & RESEARCH (Ostatnie 12 m-cy)
                  </h3>
                </div>

                <button
                  type="button"
                  disabled={researchingId === selectedCompany.id}
                  onClick={(e) => handleResearch(selectedCompany.id, e)}
                  className="rounded-lg border px-3 py-1 text-xs font-semibold transition-all hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 active:scale-95 disabled:opacity-50"
                >
                  {researchingId === selectedCompany.id ? "Analizowanie news & maszyn..." : "🔄 Odśwież research"}
                </button>
              </div>

              {/* Triggers list */}
              {Array.isArray(selectedCompany.triggers) && selectedCompany.triggers.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {selectedCompany.triggers.map((trig, idx) => {
                    const badge = getCategoryBadge(trig.category);
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border p-3 text-xs"
                        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge.color}`}>
                              {badge.label}
                            </span>
                            <span className="font-semibold text-zinc-200">{trig.title}</span>
                          </div>

                          <span className="text-[10px] text-zinc-400">
                            {trig.source}
                          </span>
                        </div>

                        <p className="text-[11.5px] text-zinc-400 mb-2 leading-relaxed">
                          {trig.snippet}
                        </p>

                        {/* Hook Suggestion */}
                        <div
                          className="flex items-start justify-between gap-3 rounded-md p-2"
                          style={{ background: "rgba(16, 185, 129, 0.08)" }}
                        >
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-emerald-400 block uppercase tracking-wider">
                              Proponowany punkt zaczepienia:
                            </span>
                            <p className="italic text-zinc-200 text-xs mt-0.5">
                              &ldquo;{trig.hookSuggestion}&rdquo;
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {trig.sourceUrl && (
                              <a
                                href={trig.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white border border-zinc-700"
                              >
                                Źródło ↗
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(trig.hookSuggestion, `modal-${idx}`)}
                              className="rounded px-2.5 py-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30"
                            >
                              {copiedHookId === `modal-${idx}` ? "✓ Skopiowano" : "Kopiuj"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-400">
                  <p>Brak punktów zaczepienia. Kliknij &quot;Odśwież research&quot;, aby przeskanować Google News, stronę firmy i rejestry pod kątem inwestycji, maszyn, rekrutacji i ekspansji.</p>
                </div>
              )}
            </div>

            {/* Financial Grid */}
            <div className="mt-6 rounded-xl border p-4" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Wskaźniki Finansowe & Wycena (BizRaport)
              </h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Przychody</span>
                  <strong className="text-base text-zinc-100">{formatPLN(selectedCompany.revenue)}</strong>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Zysk Netto</span>
                  <strong className="text-base text-zinc-100">{formatPLN(selectedCompany.netProfit)}</strong>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Wycena Średnia</span>
                  <strong className="text-base text-zinc-100">{formatPLN(selectedCompany.companyValue)}</strong>
                </div>
                <div>
                  <span className="text-[10px] block" style={{ color: "var(--text-muted)" }}>Limit Kupiecki</span>
                  <strong className="text-base text-zinc-100">{formatPLN(selectedCompany.creditLimit)}</strong>
                </div>
              </div>
            </div>

            {/* Contact links & External BizRaport */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <div className="flex gap-2 text-xs">
                {selectedCompany.website && (
                  <a
                    href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border px-3 py-1.5 font-medium transition-colors hover:bg-white/10"
                    style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                  >
                    Strona WWW ↗
                  </a>
                )}
                <a
                  href={`https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(selectedCompany.name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-1.5 font-medium text-sky-400 border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20"
                >
                  LinkedIn ↗
                </a>
              </div>

              <a
                href={`https://www.bizraport.pl/krs/${selectedCompany.krs.replace("_", "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-400 hover:underline"
              >
                Otwórz pełny raport na BizRaport.pl ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheets Export Modal */}
      <GoogleSheetsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        companies={filteredCompanies}
        searchId={searchId}
      />
    </div>
  );
}
