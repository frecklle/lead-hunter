"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
      </svg>
    ),
  },
  {
    label: "Searches",
    href: "/searches",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Companies",
    href: "/companies",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 5V3.5a3 3 0 016 0V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Leads",
    href: "/leads",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 1l2 4h4l-3 3 1 4-4-2.5L4 12l1-4L2 5h4l2-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    comingSoon: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex h-full w-56 shrink-0 flex-col border-r"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b px-4" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
          style={{ background: "var(--brand-glow)", color: "var(--brand)" }}
        >
          LH
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Lead Hunter
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.comingSoon ? "#" : item.href}
              aria-current={isActive ? "page" : undefined}
              aria-disabled={item.comingSoon}
              className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors"
              style={{
                background: isActive ? "var(--surface-3)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
              onClick={(e) => item.comingSoon && e.preventDefault()}
            >
              <span
                className="shrink-0 transition-colors"
                style={{ color: isActive ? "var(--brand)" : "currentColor" }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && (
                <span
                  className="rounded px-1 py-0.5 text-[10px] font-medium"
                  style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                >
                  Soon
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-3" style={{ borderColor: "var(--border)" }}>
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-2"
          style={{ color: "var(--text-muted)" }}
        >
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}
          >
            A
          </div>
          <span className="text-xs">Workspace</span>
        </div>
      </div>
    </aside>
  );
}
