import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, cx } from "@/components/ui";

export function StatTile({
  label,
  value,
  note,
  icon: Icon,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: "default" | "attention";
}) {
  const body = (
    <Card
      className={cx(
        "h-full p-4 transition-all",
        href && "hover:border-teal-600/40 hover:shadow-md",
        tone === "attention" && "border-amber-200 bg-amber-50/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && <Icon className="size-4 text-slate-300" />}
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {note && <p className="mt-0.5 truncate text-xs text-slate-400">{note}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
