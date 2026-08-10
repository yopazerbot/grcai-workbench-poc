"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FlaskConical, TriangleAlert } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { formatRelative } from "@/lib/format";
import type { ItemView, RunDetail, RunSummary } from "@/lib/types";
import { AgentIcon } from "@/components/agent-icon";
import { ItemCard } from "@/components/item-card";
import { Badge, Button, Card, RunStatusPill, Spinner } from "@/components/ui";

interface Props {
  initialRun: RunDetail;
  initialItems: ItemView[];
}

export function RunReview({ initialRun, initialItems }: Props) {
  const [run, setRun] = useState<RunDetail | RunSummary>(initialRun);
  const [items, setItems] = useState<ItemView[]>(initialItems);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agent = useMemo(() => getAgent(initialRun.agentId), [initialRun.agentId]);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/runs/${initialRun.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { run: RunDetail; items: ItemView[] };
    setRun(body.run);
    setItems(body.items);
  }, [initialRun.id]);

  useEffect(() => {
    if (run.status !== "drafting") return;
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [run.status, refresh]);

  const itemAction = useCallback(
    async (itemId: string, body: Record<string, unknown>): Promise<string | null> => {
      const res = await fetch(`/api/runs/${initialRun.id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        item?: ItemView;
        run?: RunSummary;
        error?: string;
      };
      if (!res.ok || !data.item || !data.run) return data.error ?? "Action failed.";
      const updated = data.item;
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setRun((prev) => ({ ...prev, ...data.run }));
      if (body.action === "edit") showToast("Saved");
      return null;
    },
    [initialRun.id, showToast]
  );

  const bulkApprove = useCallback(
    async (ids: string[], scope: "all" | "unflagged") => {
      if (ids.length === 0) return;
      const label = scope === "all" ? "all remaining drafts" : "all unflagged drafts";
      if (!window.confirm(`Approve ${label} (${ids.length})?`)) return;
      const res = await fetch(`/api/runs/${initialRun.id}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", itemIds: ids, scope }),
      });
      if (res.ok) {
        await refresh();
        showToast(`Approved ${ids.length} item${ids.length === 1 ? "" : "s"}`);
      }
    },
    [initialRun.id, refresh, showToast]
  );

  const copyMarkdown = useCallback(async () => {
    const res = await fetch(`/api/runs/${initialRun.id}/export?format=markdown`);
    if (!res.ok) return;
    await navigator.clipboard.writeText(await res.text());
    showToast("Copied as Markdown");
  }, [initialRun.id, showToast]);

  if (!agent) return null;

  // --- Drafting -----------------------------------------------------------
  if (run.status === "drafting") {
    return (
      <div className="mx-auto mt-24 max-w-sm animate-fade-up text-center">
        <Card className="flex flex-col items-center gap-4 p-10">
          <Spinner className="size-8 border-[3px]" />
          <div>
            <p className="font-medium">Drafting…</p>
            <p className="mt-1 text-sm text-slate-500">{agent.name}</p>
          </div>
        </Card>
      </div>
    );
  }

  // --- Failed -------------------------------------------------------------
  if (run.status === "failed") {
    return (
      <div className="mx-auto mt-16 max-w-md animate-fade-up">
        <Card className="border-red-200 p-8 text-center">
          <TriangleAlert className="mx-auto mb-3 size-8 text-red-500" />
          <p className="font-medium">Drafting failed</p>
          <p className="mt-2 text-sm text-slate-500">{run.error}</p>
          <Link href={`/agents/${agent.id}/new`} className="mt-6 inline-block">
            <Button variant="secondary">New run</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // --- Review / completed -------------------------------------------------
  const draftItems = items.filter((i) => i.status === "draft");
  const flaggedDrafts = draftItems.filter((i) => i.flagged);
  const unflaggedDrafts = draftItems.filter((i) => !i.flagged);
  const approvedCount = run.counts.approved;

  return (
    <div className="animate-fade-up pb-24">
      <header className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-teal-50 text-teal-700">
            <AgentIcon icon={agent.icon} className="size-3.5" />
          </span>
          <span className="text-sm font-medium text-slate-600">{agent.name}</span>
          <RunStatusPill status={run.status} />
          {run.model === "simulated" && (
            <Badge tone="slate">
              <FlaskConical className="size-3" />
              Simulated
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">{run.inputSummary}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {run.counts.total} items
              {run.counts.flagged > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-amber-600">
                    {run.counts.flagged} flagged
                  </span>
                </>
              )}
              {" · "}
              {approvedCount} approved · by {run.createdByName} ·{" "}
              {formatRelative(run.createdAt)}
            </p>
          </div>
          {approvedCount > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={copyMarkdown}>
                <Copy className="size-3.5" />
                Copy
              </Button>
              <a href={`/api/runs/${run.id}/export?format=markdown&download=1`}>
                <Button variant="secondary" size="sm">
                  <Download className="size-3.5" />
                  .md
                </Button>
              </a>
              <a href={`/api/runs/${run.id}/export?format=json&download=1`}>
                <Button variant="secondary" size="sm">
                  <Download className="size-3.5" />
                  .json
                </Button>
              </a>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} agent={agent} onAction={itemAction} />
        ))}
      </div>

      {draftItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-5 z-10 px-4">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2.5 pl-5 pr-2.5 shadow-lg backdrop-blur">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{draftItems.length}</span>{" "}
              draft{draftItems.length === 1 ? "" : "s"}
              {flaggedDrafts.length > 0 && (
                <span className="text-amber-600"> · {flaggedDrafts.length} flagged</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              {flaggedDrafts.length > 0 && unflaggedDrafts.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    bulkApprove(
                      unflaggedDrafts.map((i) => i.id),
                      "unflagged"
                    )
                  }
                >
                  Approve unflagged
                </Button>
              )}
              <Button
                variant="approve"
                size="sm"
                onClick={() =>
                  bulkApprove(
                    draftItems.map((i) => i.id),
                    "all"
                  )
                }
              >
                <Check className="size-3.5" />
                Approve all
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2 animate-fade-up rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
