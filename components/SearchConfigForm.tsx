"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  POLISH_VOIVODESHIPS,
  PKD_SECTIONS,
  POPULAR_PKD_DIVISIONS,
  type SearchCriteria,
  type SearchConfig,
} from "@/types/search";

interface SearchConfigFormProps {
  initialData?: SearchConfig;
  isEditing?: boolean;
}

export function SearchConfigForm({ initialData, isEditing = false }: SearchConfigFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [pkdInput, setPkdInput] = useState("");

  const [criteria, setCriteria] = useState<SearchCriteria>(
    initialData?.criteria || {
      onlyActive: true,
      excludeKRZ: true,
      excludeMSiG: true,
      voivodeships: [],
      pkdCodes: [],
    }
  );

  // Quick preset helper functions
  const updateCriteria = <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => {
    setCriteria((prev) => ({ ...prev, [key]: value }));
  };

  const toggleVoivodeship = (v: string) => {
    const current = criteria.voivodeships || [];
    if (current.includes(v)) {
      updateCriteria(
        "voivodeships",
        current.filter((item) => item !== v)
      );
    } else {
      updateCriteria("voivodeships", [...current, v]);
    }
  };

  const addPkdCode = () => {
    if (!pkdInput.trim()) return;
    const code = pkdInput.trim().toUpperCase();
    const current = criteria.pkdCodes || [];
    if (!current.includes(code)) {
      updateCriteria("pkdCodes", [...current, code]);
    }
    setPkdInput("");
  };

  const removePkdCode = (code: string) => {
    updateCriteria(
      "pkdCodes",
      (criteria.pkdCodes || []).filter((c) => c !== code)
    );
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Proszę podać nazwę wyszukiwania.");
      return;
    }

    setLoading(true);

    try {
      const url = isEditing && initialData?.id ? `/api/searches/${initialData.id}` : "/api/searches";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, criteria }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Wystąpił błąd podczas zapisywania wyszukiwania.");
      }

      router.push("/searches");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate active filter count
  const activeFiltersCount = [
    criteria.query,
    criteria.pkdSection,
    criteria.pkdDivision,
    (criteria.pkdCodes?.length || 0) > 0,
    (criteria.voivodeships?.length || 0) > 0,
    criteria.city,
    criteria.revenueMin !== undefined,
    criteria.revenueMax !== undefined,
    criteria.netProfitMin !== undefined,
    criteria.ebitdaMin !== undefined,
    criteria.employeesMin !== undefined,
    criteria.employeesMax !== undefined,
    criteria.cagrRevenueMin !== undefined,
    criteria.onlyActive,
    criteria.excludeKRZ,
    criteria.excludeMSiG,
  ].filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Main Configuration Columns (8 cols) */}
      <div className="space-y-6 lg:col-span-8">
        {error && (
          <div
            className="flex items-center gap-2 rounded-xl border p-4 text-sm"
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "#f87171",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm-1-4a1 1 0 112 0 1 1 0 01-2 0zm0-7a1 1 0 012 0v4a1 1 0 11-2 0V4z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Basic Info & Keywords */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              1
            </span>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Nazwa i Ogólne Kryteria
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Nazwa Wyszukiwania <span className="text-emerald-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="np. Software House > 5M PLN Mazowieckie"
                className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Fraza w nazwie / słowo kluczowe
              </label>
              <input
                type="text"
                value={criteria.query || ""}
                onChange={(e) => updateCriteria("query", e.target.value || undefined)}
                placeholder="np. Logistyka, Cloud, Budownictwo"
                className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        </section>

        {/* 2. Branża & PKD */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              2
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Branża i Klasyfikacja PKD
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Filtruj spółki według głównych sekcji lub dokładnych kodów działalności PKD.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Główna Sekcja PKD
                </label>
                <select
                  value={criteria.pkdSection || ""}
                  onChange={(e) => updateCriteria("pkdSection", e.target.value || undefined)}
                  className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">-- Wszystkie sekcje PKD --</option>
                  {PKD_SECTIONS.map((sec) => (
                    <option key={sec.code} value={sec.code}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Popularny Dział PKD
                </label>
                <select
                  value={criteria.pkdDivision || ""}
                  onChange={(e) => updateCriteria("pkdDivision", e.target.value || undefined)}
                  className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">-- Wybierz opcjonalnie --</option>
                  {POPULAR_PKD_DIVISIONS.map((div) => (
                    <option key={div.code} value={div.code}>
                      {div.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom PKD codes chip input */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Konkretne Kody PKD (np. 62.01.Z)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pkdInput}
                  onChange={(e) => setPkdInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addPkdCode();
                    }
                  }}
                  placeholder="Wpisz kod PKD (np. 62.01.Z) i naciśnij Dodaj"
                  className="flex-1 rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  type="button"
                  onClick={addPkdCode}
                  className="rounded-lg px-4 py-2 text-xs font-semibold"
                  style={{ background: "var(--surface-3)", color: "var(--text-primary)" }}
                >
                  + Dodaj
                </button>
              </div>

              {(criteria.pkdCodes || []).length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {criteria.pkdCodes?.map((code) => (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
                      style={{
                        background: "var(--brand-glow)",
                        color: "var(--brand)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    >
                      {code}
                      <button
                        type="button"
                        onClick={() => removePkdCode(code)}
                        className="hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3. Minimalny Obrót & Finanse */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              3
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Minimalny Obrót i Kryteria Finansowe
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Dane sprawozdawcze z KRS i BizRaport w PLN.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Quick revenue presets */}
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Szybki Wybór Minimalnego Obrótu (PLN)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Wszystkie", val: undefined },
                  { label: "> 1 mln PLN", val: 1_000_000 },
                  { label: "> 5 mln PLN", val: 5_000_000 },
                  { label: "> 10 mln PLN", val: 10_000_000 },
                  { label: "> 50 mln PLN", val: 50_000_000 },
                ].map((preset) => {
                  const active = criteria.revenueMin === preset.val;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateCriteria("revenueMin", preset.val)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        background: active ? "var(--brand)" : "var(--surface-2)",
                        borderColor: active ? "var(--brand)" : "var(--border)",
                        color: active ? "#051e0d" : "var(--text-secondary)",
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Obrót Min (PLN)
                </label>
                <input
                  type="number"
                  step="100000"
                  value={criteria.revenueMin ?? ""}
                  onChange={(e) =>
                    updateCriteria("revenueMin", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 2000000"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Obrót Max (PLN)
                </label>
                <input
                  type="number"
                  step="100000"
                  value={criteria.revenueMax ?? ""}
                  onChange={(e) =>
                    updateCriteria("revenueMax", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 50000000"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Min Zysk Netto (PLN)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={criteria.netProfitMin ?? ""}
                  onChange={(e) =>
                    updateCriteria("netProfitMin", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 500000"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Min EBITDA (PLN)
                </label>
                <input
                  type="number"
                  step="50000"
                  value={criteria.ebitdaMin ?? ""}
                  onChange={(e) =>
                    updateCriteria("ebitdaMin", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 300000"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 4. Liczba Pracowników */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              4
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Liczba Pracowników
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Określ wielkość zespołu firmy.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Wszyscy", min: undefined, max: undefined },
                { label: "Mikro (1 - 9)", min: 1, max: 9 },
                { label: "Małe (10 - 49)", min: 10, max: 49 },
                { label: "Średnie (50 - 249)", min: 50, max: 249 },
                { label: "Duże (250+)", min: 250, max: undefined },
              ].map((preset) => {
                const active =
                  criteria.employeesMin === preset.min && criteria.employeesMax === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      updateCriteria("employeesMin", preset.min);
                      updateCriteria("employeesMax", preset.max);
                    }}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      background: active ? "var(--brand)" : "var(--surface-2)",
                      borderColor: active ? "var(--brand)" : "var(--border)",
                      color: active ? "#051e0d" : "var(--text-secondary)",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Minimalna liczba osób
                </label>
                <input
                  type="number"
                  value={criteria.employeesMin ?? ""}
                  onChange={(e) =>
                    updateCriteria("employeesMin", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 10"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  Maksymalna liczba osób
                </label>
                <input
                  type="number"
                  value={criteria.employeesMax ?? ""}
                  onChange={(e) =>
                    updateCriteria("employeesMax", e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="np. 200"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Lokalizacja */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              5
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Lokalizacja
              </h2>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Wybierz województwa lub konkretne miasto w Polsce.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Województwa (kliknij aby wybrać jedno lub więcej)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {POLISH_VOIVODESHIPS.map((v) => {
                  const selected = (criteria.voivodeships || []).includes(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => toggleVoivodeship(v)}
                      className="rounded-md border px-2.5 py-1 text-xs font-medium transition-all"
                      style={{
                        background: selected ? "var(--brand-glow)" : "var(--surface-2)",
                        borderColor: selected ? "var(--brand)" : "var(--border)",
                        color: selected ? "var(--brand)" : "var(--text-secondary)",
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Miasto
              </label>
              <input
                type="text"
                value={criteria.city || ""}
                onChange={(e) => updateCriteria("city", e.target.value || undefined)}
                placeholder="np. Warszawa, Kraków, Poznań"
                className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        </section>

        {/* 6. Wskaźniki Wzrostu & Bezpieczeństwo / Ryzyko */}
        <section
          className="rounded-xl border p-5 shadow-sm"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex items-center gap-2 border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              6
            </span>
            <div>
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Wskaźniki Wzrostu i Filtry Ryzyka
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Min CAGR Przychodów (%)
              </label>
              <input
                type="number"
                value={criteria.cagrRevenueMin ?? ""}
                onChange={(e) =>
                  updateCriteria("cagrRevenueMin", e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="np. 15 (%)"
                className="w-full rounded-lg border px-3.5 py-2 text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div className="flex flex-col justify-center space-y-2 pt-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={criteria.onlyActive ?? true}
                  onChange={(e) => updateCriteria("onlyActive", e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Tylko aktywne spółki (nie wykreślone z KRS)
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={criteria.excludeKRZ ?? true}
                  onChange={(e) => updateCriteria("excludeKRZ", e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Wyklucz wpisy w Krajowym Rejestrze Zadłużonych (KRZ)
              </label>

              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={criteria.excludeMSiG ?? true}
                  onChange={(e) => updateCriteria("excludeMSiG", e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Wyklucz ogłoszenia o upadłości (MSiG)
              </label>
            </div>
          </div>
        </section>
      </div>

      {/* Right Column: Live Summary & Action Box (4 cols) */}
      <div className="space-y-6 lg:col-span-4">
        <div
          className="sticky top-6 rounded-xl border p-5 shadow-lg"
          style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Podsumowanie Kryteriów
            </h3>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
            >
              {activeFiltersCount} aktywne filtry
            </span>
          </div>

          <div className="my-4 space-y-3 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div>
              <span className="font-semibold text-zinc-400 block">Nazwa:</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {name || "Bez nazwy"}
              </span>
            </div>

            <div>
              <span className="font-semibold text-zinc-400 block">Branża / PKD:</span>
              <span>
                {criteria.pkdSection
                  ? `Sekcja ${criteria.pkdSection}`
                  : criteria.pkdDivision
                  ? `Dział ${criteria.pkdDivision}`
                  : (criteria.pkdCodes?.length || 0) > 0
                  ? `Kody: ${criteria.pkdCodes?.join(", ")}`
                  : "Wszystkie branże"}
              </span>
            </div>

            <div>
              <span className="font-semibold text-zinc-400 block">Minimalny Obrót:</span>
              <span>
                {criteria.revenueMin
                  ? `> ${(criteria.revenueMin / 1_000_000).toFixed(1)} mln PLN`
                  : "Brak progu min."}
              </span>
            </div>

            <div>
              <span className="font-semibold text-zinc-400 block">Pracownicy:</span>
              <span>
                {criteria.employeesMin || criteria.employeesMax
                  ? `${criteria.employeesMin || 0} - ${criteria.employeesMax || "∞"} os.`
                  : "Wszyscy"}
              </span>
            </div>

            <div>
              <span className="font-semibold text-zinc-400 block">Lokalizacja:</span>
              <span>
                {(criteria.voivodeships?.length || 0) > 0
                  ? `${criteria.voivodeships?.length} województw`
                  : criteria.city
                  ? criteria.city
                  : "Cała Polska"}
              </span>
            </div>
          </div>

          <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all shadow-md"
              style={{
                background: "var(--brand)",
                color: "#051e0d",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span>Zapisywanie...</span>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13.333 4.667l-7.333 7.333L2.667 8.667"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{isEditing ? "Zapisz Zmiany" : "Zapisz Konfigurację"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
