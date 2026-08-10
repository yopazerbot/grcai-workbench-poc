import type { ReactNode } from "react";
import type { ItemStatus, RunStatus } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------

const buttonVariants = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-teal-700/50 shadow-sm",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50",
  ghost: "text-slate-600 hover:bg-slate-100 disabled:opacity-50",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50",
  approve:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-600/50 shadow-sm",
} as const;

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: "sm" | "md";
}) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        buttonVariants[variant],
        className
      )}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04)]",
        className
      )}
    >
      {children}
    </div>
  );
}

const badgeTones = {
  slate: "bg-slate-100 text-slate-600",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
} as const;

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-block size-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700",
        className
      )}
      aria-label="Loading"
    />
  );
}

// ---------------------------------------------------------------------------

const runStatusStyles: Record<RunStatus, { label: string; tone: keyof typeof badgeTones }> = {
  drafting: { label: "Drafting", tone: "blue" },
  review: { label: "In review", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
  failed: { label: "Failed", tone: "red" },
};

export function RunStatusPill({ status }: { status: RunStatus }) {
  const s = runStatusStyles[status];
  return (
    <Badge tone={s.tone}>
      {status === "drafting" && (
        <span className="size-1.5 animate-pulse rounded-full bg-sky-500" />
      )}
      {s.label}
    </Badge>
  );
}

export function ItemStatusPill({
  status,
  edited,
}: {
  status: ItemStatus;
  edited: boolean;
}) {
  if (status === "approved")
    return <Badge tone="green">{edited ? "Approved · edited" : "Approved"}</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="slate">Draft</Badge>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
