"use client";

import { useState } from "react";
import { Check, FileSearch, Flag, Pencil, X } from "lucide-react";
import type { AgentDefinition, DisplayRow } from "@/lib/agents/types";
import type { ItemView } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { Badge, Button, Card, ItemStatusPill, cx } from "@/components/ui";

function DisplayRowView({ row }: { row: DisplayRow }) {
  const label = row.label && (
    <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
      {row.label}
    </span>
  );
  switch (row.kind) {
    case "title":
      return (
        <p className="text-[15px] font-medium leading-snug text-slate-900">
          {row.value}
        </p>
      );
    case "body":
      return (
        <div>
          {label}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {row.value}
          </p>
        </div>
      );
    case "mono":
      return (
        <div>
          {label}
          <p className="rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-relaxed text-slate-700">
            {row.value}
          </p>
        </div>
      );
    case "badge":
      return (
        <div className="flex items-center gap-2">
          {row.label && <span className="text-xs text-slate-500">{row.label}</span>}
          <Badge tone={row.tone ?? "slate"}>{row.value}</Badge>
        </div>
      );
    case "diff-old":
      return (
        <div>
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-red-400">
            {row.label ?? "Current"}
          </span>
          <p className="whitespace-pre-wrap rounded-lg border-l-2 border-red-300 bg-red-50/70 px-3 py-2 text-sm leading-relaxed text-slate-700">
            {row.value}
          </p>
        </div>
      );
    case "diff-new":
      return (
        <div>
          <span className="mb-0.5 block text-[11px] font-semibold uppercase tracking-wide text-emerald-500">
            {row.label ?? "Proposed"}
          </span>
          <p className="whitespace-pre-wrap rounded-lg border-l-2 border-emerald-400 bg-emerald-50/70 px-3 py-2 text-sm leading-relaxed text-slate-700">
            {row.value}
          </p>
        </div>
      );
    case "list":
      return (
        <div>
          {label}
          <ul className="space-y-1 text-sm text-slate-700">
            {(Array.isArray(row.value) ? row.value : [row.value]).map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-slate-400" />
                <span className="leading-relaxed">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "note":
      return (
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
          <FileSearch className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {row.label && <span className="font-medium">{row.label}: </span>}
            {row.value}
          </span>
        </p>
      );
  }
}

export function ItemCard({
  item,
  agent,
  onAction,
}: {
  item: ItemView;
  agent: AgentDefinition;
  onAction: (itemId: string, body: Record<string, unknown>) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDraft = item.status === "draft";

  const startEdit = () => {
    const init: Record<string, string> = {};
    for (const f of agent.editableFields(item.data)) {
      init[f.name] = String(item.data[f.name] ?? "");
    }
    setFields(init);
    setEditing(true);
    setError(null);
  };

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    const err = await onAction(item.id, body);
    if (err) setError(err);
    setBusy(false);
    return err;
  };

  const saveEdit = async () => {
    const err = await act({ action: "edit", fields });
    if (!err) setEditing(false);
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

  return (
    <Card
      className={cx(
        "overflow-hidden transition-opacity",
        item.flagged && isDraft && "border-l-[3px] border-l-amber-400",
        item.status === "rejected" && "opacity-60"
      )}
    >
      {item.flagged && isDraft && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/80 px-4 py-2 text-xs font-medium text-amber-700">
          <Flag className="size-3.5" />
          {item.flagReason ?? "Needs analyst review"}
        </div>
      )}

      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            {editing ? (
              <div className="space-y-3">
                <p className="text-[15px] font-medium leading-snug text-slate-900">
                  {agent.itemTitle(item.data)}
                </p>
                {agent.editableFields(item.data).map((f) => (
                  <label key={f.name} className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500">
                      {f.label}
                    </span>
                    {f.kind === "select" ? (
                      <select
                        value={fields[f.name] ?? ""}
                        onChange={(e) =>
                          setFields((v) => ({ ...v, [f.name]: e.target.value }))
                        }
                        className={inputClass}
                      >
                        {f.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <textarea
                        value={fields[f.name] ?? ""}
                        onChange={(e) =>
                          setFields((v) => ({ ...v, [f.name]: e.target.value }))
                        }
                        rows={f.rows ?? 4}
                        className={inputClass}
                      />
                    )}
                  </label>
                ))}
              </div>
            ) : (
              agent.display(item.data).map((row, i) => <DisplayRowView key={i} row={row} />)
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <ItemStatusPill status={item.status} edited={item.edited} />
            {isDraft && item.edited && <Badge tone="slate">edited</Badge>}
            {item.flagged && !isDraft && (
              <Badge tone="amber">
                <Flag className="size-3" />
                was flagged
              </Badge>
            )}
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        {isDraft ? (
          <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
            {editing ? (
              <>
                <Button size="sm" onClick={saveEdit} disabled={busy}>
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="approve"
                  size="sm"
                  onClick={() => act({ action: "approve" })}
                  disabled={busy}
                >
                  <Check className="size-3.5" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => act({ action: "reject" })}
                  disabled={busy}
                >
                  <X className="size-3.5" />
                  Reject
                </Button>
                {agent.editableFields(item.data).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={startEdit} disabled={busy}>
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                )}
              </>
            )}
          </div>
        ) : (
          item.decidedByName &&
          item.decidedAt && (
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
              {item.status === "approved" ? "Approved" : "Rejected"} by{" "}
              {item.decidedByName} · {formatDateTime(item.decidedAt)}
            </p>
          )
        )}
      </div>
    </Card>
  );
}
