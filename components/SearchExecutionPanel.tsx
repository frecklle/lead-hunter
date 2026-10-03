"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GoogleSheetsExportModal } from "./GoogleSheetsExportModal";

interface SearchExecutionPanelProps {
  searchId: string;
  status: string;
  lastRunAt: string | null;
  resultsCount: number;
  companies?: any[];
}

export function SearchExecutionPanel({
  searchId,
  status: initialStatus,
  lastRunAt,
  resultsCount,
  companies = [],
}: SearchExecutionPanelProps) {
  const router = useRouter();
  const [running, setRunning] = useState(initialStatus === "RUNNING");
  const [researchingAll, setResearchingAll] = useState(false);
  const [findingContactsAll, setFindingContactsAll] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [maxCompanies, setMaxCompanies] = useState<number>(10);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiUsage, setApiUsage] = useState<{
    queriesTotal: number;
    pool: number;
    model: string;
  } | null>(null);

  // Fetch API usage
  useEffect(() => {
    fetch("/api/bizraport/usage")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setApiUsage({
            queriesTotal: data.data.odpytania_razem || 0,
            pool: data.data.pula || 100,
            model: data.data.model || "konto testowe",
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/searches/${searchId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxCompanies }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas wyszukiwania w BizRaport.");
      }

      setMessage(data.message || `Pobrano pomyślnie ${data.data?.addedCount || 0} firm.`);
      router.refresh();

      // Refresh API usage
      fetch("/api/bizraport/usage")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            setApiUsage({
              queriesTotal: d.data.odpytania_razem || 0,
              pool: d.data.pula || 100,
              model: d.data.model || "konto testowe",
            });
          }
        });
    } catch (err: any) {
      setError(err.message || "Błąd wykonania zapytania.");
    } finally {
      setRunning(false);
    }
  };

  const handleResearchAll = async () => {
    setResearchingAll(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/searches/${searchId}/research-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthsBack: 12 }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas researchu firm.");
      }

      setMessage(data.message || `Zbadano ${data.researchedCount} firm i wygenerowano punkty zaczepienia.`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Błąd podczas researchu.");
    } finally {
      setResearchingAll(false);
    }
  };

  const handleFindContactsAll = async () => {
    setFindingContactsAll(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/searches/${searchId}/contacts/find-all`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Wystąpił błąd podczas wyszukiwania kontaktów.");
      }

      setMessage(data.message || `Odnaleziono ${data.contactsFound} osób decyzyjnych.`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Błąd podczas wyszukiwania kontaktów.");
    } finally {
      setFindingContactsAll(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-5 shadow-sm"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Action & Limits */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{
                background:
                  running
                    ? "#60a5fa"
                    : initialStatus === "DONE"
                    ? "#22c55e"
                    : initialStatus === "ERROR"
                    ? "#ef4444"
                    : "var(--text-muted)",
              }}
            />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {running
                ? "Pobieranie danych z BizRaport API..."
                : initialStatus === "DONE"
                ? `Wyszukiwanie aktywne (${resultsCount} w bazie)`
                : initialStatus === "ERROR"
                ? "Ostatnie wyszukiwanie zakończone błędem"
                : "Gotowe do uruchomienia"}
            </h3>
          </div>

          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {lastRunAt
              ? `Ostatnie uruchomienie: ${new Date(lastRunAt).toLocaleString("pl-PL")}`
              : "To wyszukiwanie nie było jeszcze uruchamiane."}
          </p>
        </div>

        {/* Right: Controls & Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span>Pobierz:</span>
            <select
              value={maxCompanies}
              disabled={running}
              onChange={(e) => setMaxCompanies(Number(e.target.value))}
              className="rounded-lg border px-2.5 py-1.5 text-xs outline-none"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value={5}>5 firm</option>
              <option value={10}>10 firm</option>
              <option value={20}>20 firm</option>
              <option value={35}>35 firm</option>
            </select>
          </div>

          {/* 1. Fetch from BizRaport */}
          <button
            type="button"
            onClick={handleRun}
            disabled={running || researchingAll || findingContactsAll}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "var(--brand)", color: "#051e0d" }}
          >
            {running ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Pobieranie...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Pobierz z KRS
              </>
            )}
          </button>

          {resultsCount > 0 && (
            <>
              {/* 2. Research All Triggers */}
              <button
                type="button"
                onClick={handleResearchAll}
                disabled={running || researchingAll || findingContactsAll}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:bg-emerald-500/15 active:scale-95 disabled:opacity-50 text-emerald-300 border-emerald-500/30"
                style={{ background: "rgba(16, 185, 129, 0.08)" }}
              >
                {researchingAll ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Research news...
                  </>
                ) : (
                  <>🎯 Research (Hooki)</>
                )}
              </button>

              {/* 3. Find Contacts for All */}
              <button
                type="button"
                onClick={handleFindContactsAll}
                disabled={running || researchingAll || findingContactsAll}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all hover:bg-cyan-500/15 active:scale-95 disabled:opacity-50 text-cyan-300 border-cyan-500/30"
                style={{ background: "rgba(6, 182, 212, 0.08)" }}
              >
                {findingContactsAll ? (
                  <>
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Szukanie CEO / Dyrektorów...
                  </>
                ) : (
                  <>👥 Znajdź kontakty (CEO / Dyrektorzy)</>
                )}
              </button>

              {/* 4. Google Sheets Export */}
              <button
                type="button"
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-slate-950"
              >
                📊 Google Sheets
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quota badge */}
      {apiUsage && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px]"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-300">BizRaport API:</span>
            <span>
              Zużyto <strong className="text-emerald-400">{apiUsage.queriesTotal}</strong> z{" "}
              {apiUsage.model.includes("test") ? "100 testowych odpytań" : `${apiUsage.pool} odpytań`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Klucz aktywny (oracicki@gmail.com)</span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {message && (
        <div
          className="mt-3 rounded-lg border p-3 text-xs"
          style={{
            background: "rgba(34, 197, 94, 0.1)",
            borderColor: "rgba(34, 197, 94, 0.3)",
            color: "#4ade80",
          }}
        >
          ✓ {message}
        </div>
      )}

      {error && (
        <div
          className="mt-3 rounded-lg border p-3 text-xs"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            color: "#f87171",
          }}
        >
          ✕ {error}
        </div>
      )}

      {/* Google Sheets Export Modal */}
      <GoogleSheetsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        companies={companies}
        searchId={searchId}
      />
    </div>
  );
}
