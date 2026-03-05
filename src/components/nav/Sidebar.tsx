"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/today", label: "Today", shortLabel: "T" },
  { href: "/calendar", label: "Calendar", shortLabel: "C" },
  { href: "/chat", label: "AI Chat", shortLabel: "AI" },
  { href: "/stats", label: "Stats", shortLabel: "S" },
  { href: "/profile", label: "Profile", shortLabel: "P" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-border bg-surface/50 transition-all ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!collapsed && (
          <span
            className="text-lg font-bold"
            style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
          >
            <span className="text-violet-light">CK</span>
            <span className="text-muted ml-1 text-xs font-normal">OS</span>
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-foreground"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            {collapsed ? (
              <polyline points="9 18 15 12 9 6" />
            ) : (
              <polyline points="15 18 9 12 15 6" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-violet/15 text-violet-light"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              <span className="min-w-[20px] text-center">
                {collapsed ? item.shortLabel : ""}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
