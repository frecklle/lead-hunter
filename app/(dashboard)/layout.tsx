import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-14 shrink-0 items-center justify-between border-b px-6"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              Lead Intelligence Workspace
            </span>
          </div>

          <Link
            href="/searches/new"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{
              background: "var(--brand)",
              color: "#051e0d",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 1v10M1 6h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Nowe Wyszukiwanie
          </Link>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: "var(--surface-0)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
