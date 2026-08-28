import { cx } from "@/components/ui";

// Horizontal part-to-whole bar following the dataviz mark specs: ≤ 24px thick,
// 2px surface gaps between segments, rounded data-ends, text in ink tokens,
// legend always present with counts (so identity never rests on colour alone).

export interface BarSegment {
  key: string;
  label: string;
  value: number;
  /** Validated status hex (see dashboard palette). */
  color: string;
}

// Status palette validated with the dataviz six-checks script (light surface):
// emerald-700 / amber-500 / red-600 pass; amber's contrast warning is relieved
// by the count labels + legend. Slate-500 marks "no source" (absence, not a series).
export const STATUS_COLORS = {
  good: "#047857",
  warning: "#f59e0b",
  serious: "#dc2626",
  none: "#64748b",
} as const;

export function StackedBar({
  segments,
  total,
  className,
  emptyLabel = "No data",
}: {
  segments: BarSegment[];
  total: number;
  className?: string;
  emptyLabel?: string;
}) {
  const visible = segments.filter((s) => s.value > 0);
  return (
    <div className={cx("space-y-2", className)}>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={segments.map((s) => `${s.label} ${s.value}`).join(", ")}>
        {total === 0 || visible.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-400">
            {emptyLabel}
          </div>
        ) : (
          visible.map((s, i) => (
            <div
              key={s.key}
              title={`${s.label}: ${s.value}`}
              style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
              className={cx(
                "h-full min-w-[3px]",
                i === 0 && "rounded-l-full",
                i === visible.length - 1 && "rounded-r-full"
              )}
            />
          ))
        )}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
            <span>{s.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
