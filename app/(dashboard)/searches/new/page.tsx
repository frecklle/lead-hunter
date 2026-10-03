import Link from "next/link";
import { SearchConfigForm } from "@/components/SearchConfigForm";

export default function NewSearchPage() {
  return (
    <div className="space-y-6">
      {/* Header breadcrumb & title */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/searches" className="hover:text-zinc-200 transition-colors">
            Wyszukiwania
          </Link>
          <span>/</span>
          <span style={{ color: "var(--brand)" }}>Nowe Kryteria</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Nowa Konfiguracja Wyszukiwania
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          Określ kryteria wyszukiwania firm w BizRaport (PKD, minimalny obrót, lokalizacja, liczba pracowników).
        </p>
      </div>

      {/* Form */}
      <SearchConfigForm />
    </div>
  );
}
