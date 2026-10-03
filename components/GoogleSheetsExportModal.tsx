"use client";

import { useState } from "react";
import { formatCompanyForGoogleSheets, generateGoogleSheetsCsv, generateGoogleSheetsTsv, type GoogleSheetsRow } from "@/lib/contacts";

interface GoogleSheetsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: any[];
  searchId?: string;
}

export function GoogleSheetsExportModal({
  isOpen,
  onClose,
  companies,
  searchId,
}: GoogleSheetsExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isPushing, setIsPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Flatten all rows for export preview
  const allRows: GoogleSheetsRow[] = [];
  for (const c of companies) {
    allRows.push(...formatCompanyForGoogleSheets(c));
  }

  const handleCopyTsv = async () => {
    try {
      const tsv = generateGoogleSheetsTsv(allRows);
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Błąd kopiowania:", err);
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateGoogleSheetsCsv(allRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-hunter-google-sheets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePushWebhook = async () => {
    if (!webhookUrl.trim() || !webhookUrl.startsWith("http")) {
      setPushStatus("Podaj prawidłowy adres URL webhooka (np. https://script.google.com/...)");
      return;
    }

    setIsPushing(true);
    setPushStatus(null);

    try {
      const endpoint = searchId ? `/api/searches/${searchId}/export` : `/api/companies/export`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Błąd wysyłki danych.");
      }

      setPushStatus(`✅ Wysłano pomyślnie ${data.sentRows} wierszy do Twojego Arkusza Google!`);
    } catch (err: any) {
      setPushStatus(`❌ Błąd: ${err.message || String(err)}`);
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              📊
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Eksport do Google Sheets
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {allRows.length} wierszy
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Format 1:1 zgodny ze strukturą tabeli Google Sheets: Firma, Kontakt, Stanowisko, Email, LinkedIn, Score, Punkt zaczepienia, Źródło.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyTsv}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              }`}
            >
              {copied ? "✅ Skopiowano do schowka!" : "📋 Kopiuj dla Google Sheets (Ctrl+V)"}
            </button>

            <button
              onClick={handleDownloadCsv}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors"
            >
              📥 Pobierz plik CSV (UTF-8 z BOM)
            </button>
          </div>

          <div className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
            💡 <strong className="text-slate-300">Wskazówka:</strong> Kliknij <span className="text-emerald-400">Kopiuj</span>, otwórz pusty arkusz w Google Sheets i wciśnij <span className="text-white font-mono bg-slate-950 px-1 py-0.5 rounded">Ctrl + V</span>.
          </div>
        </div>

        {/* Table Preview */}
        <div className="flex-1 overflow-auto p-6">
          <div className="rounded-xl border border-slate-800 overflow-hidden shadow-inner bg-slate-950/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700/80">
                  <th className="py-2.5 px-3 whitespace-nowrap">#</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-emerald-400">Firma</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-cyan-400">Kontakt</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Stanowisko</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Email</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">LinkedIn</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-amber-400">Score</th>
                  <th className="py-2.5 px-3 whitespace-nowrap text-yellow-300">Punkt zaczepienia</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Źródło</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {allRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-100 max-w-[200px] truncate" title={row.firma}>
                      {row.firma}
                    </td>
                    <td className="py-2 px-3 font-medium text-cyan-300 whitespace-nowrap">
                      {row.kontakt}
                    </td>
                    <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[11px]">
                        {row.stanowisko}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.email ? (
                        <a href={`mailto:${row.email}`} className="text-blue-400 hover:underline">
                          {row.email}
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {row.linkedIn ? (
                        <a
                          href={row.linkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                        >
                          🔗 Profil
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        {row.score}
                      </span>
                    </td>
                    <td className="py-2 px-3 max-w-[280px] truncate text-yellow-200/90 text-[11px]" title={row.punktZaczepienia}>
                      {row.punktZaczepienia}
                    </td>
                    <td className="py-2 px-3 max-w-[140px] truncate text-slate-400 text-[11px]">
                      {row.zrodlo.startsWith("http") ? (
                        <a
                          href={row.zrodlo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-200 underline"
                          title={row.zrodlo}
                        >
                          Link
                        </a>
                      ) : (
                        <span title={row.zrodlo}>{row.zrodlo}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Optional Webhook Section */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-auto flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Automatyczna wysyłka do Google Sheets (Webhook / Apps Script):</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handlePushWebhook}
                disabled={isPushing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {isPushing ? "Wysyłanie..." : "Wyślij"}
              </button>
            </div>
            {pushStatus && (
              <p className="mt-1 text-xs text-slate-300">{pushStatus}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Zamknij
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
