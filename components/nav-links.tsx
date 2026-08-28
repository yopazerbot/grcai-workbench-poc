"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const LINKS = [
  { href: "/", label: "Dashboard", match: (p: string) => p === "/" },
  {
    href: "/agents",
    label: "Agents",
    match: (p: string) => p.startsWith("/agents") || p.startsWith("/runs"),
  },
  { href: "/knowledge", label: "Knowledge base", match: (p: string) => p.startsWith("/knowledge") },
  { href: "/history", label: "History", match: (p: string) => p.startsWith("/history") },
  { href: "/audit", label: "Audit log", match: (p: string) => p.startsWith("/audit") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cx(
              "rounded-lg px-2 py-1.5 text-sm font-medium transition-colors sm:px-3",
              active
                ? "bg-slate-100 text-slate-900"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
