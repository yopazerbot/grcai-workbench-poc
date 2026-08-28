"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { llmHeaders } from "@/lib/api-key-store";
import { formatDateTime } from "@/lib/format";
import {
  ORG_CATEGORY_LABELS,
  type DocumentDetail as DocumentDetailData,
  type KnowledgeRecordView,
  type OrgCategory,
} from "@/lib/types";
import { openKeyPanel } from "@/components/api-key-panel";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import { DocumentCategoryBadge, DocumentStatusPill, formatBytes } from "./status";

const CATEGORY_ORDER: OrgCategory[] = [
  "profile",
  "certification",
  "control",
  "policy",
  "qa_pair",
  "asset",
  "system_snapshot",
];

function RecordRow({ r }: { r: KnowledgeRecordView }) {
  const d = (r.data ?? {}) as Record<string, unknown>;
  const meta: string[] = [];
  if (r.category === "control") {
    if (d.owner) meta.push(`owner: ${String(d.owner)}`);
    if (d.status) meta.push(`status: ${String(d.status)}`);
  }
  if (r.category === "policy") {
    if (d.owner) meta.push(`owner: ${String(d.owner)}`);
    if (d.approvedAt) meta.push(`approved: ${String(d.approvedAt).slice(0, 10)}`);
  }
  if (r.category === "certification") {
    if (d.issuer) meta.push(`issuer: ${String(d.issuer)}`);
    if (d.validUntil) meta.push(`valid until: ${String(d.validUntil).slice(0, 10)}`);
  }
  if (r.category === "asset") {
    if (d.category) meta.push(String(d.category));
    if (d.inUse === false) meta.push("not in use");
  }
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium leading-snug text-slate-900">{r.title}</p>
        {r.anchor && (
          <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
            {r.anchor}
          </span>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{r.body}</p>
      {meta.length > 0 && <p className="mt-1 text-xs text-slate-400">{meta.join(" · ")}</p>}
    </li>
  );
}

export function DocumentDetail({ initial, serverKey: _serverKey }: { initial: DocumentDetailData; serverKey: boolean }) {
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showText, setShowText] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/documents/${initial.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { document: DocumentDetailData };
    setDoc(body.document);
  }, [initial.id]);

  const analysing = doc.status === "analysing" || doc.status === "extracting";
  useEffect(() => {
    if (!analysing) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [analysing, refresh]);

  const analyse = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/analyse`, { method: "POST", headers: llmHeaders() });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (body.code === "no_api_key") {
          showToast("Add your Claude API key to analyse documents");
          openKeyPanel();
        } else showToast(body.error ?? "Could not start the analysis");
        return;
      }
      showToast("Analysis started");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${doc.title}” and its ${doc.records.length} knowledge records?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        showToast(body.error ?? "Could not delete");
        return;
      }
      router.push("/knowledge");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    records: doc.records.filter((r) => r.category === cat),
  })).filter((g) => g.records.length > 0);

  const excerpt = doc.text.length > 20_000 ? `${doc.text.slice(0, 20_000)}\n\n… (${doc.text.length.toLocaleString()} characters in total)` : doc.text;

  return (
    <div className="animate-fade-up space-y-6">
      <Link href="/knowledge" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="size-4" />
        Knowledge base
      </Link>

      <header>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <DocumentCategoryBadge category={doc.category} />
          <DocumentStatusPill status={doc.status} />
          {doc.seeded && <Badge tone="slate">Demo document</Badge>}
          {doc.model && doc.model !== "seeded" && <Badge tone="teal">Claude · {doc.model}</Badge>}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{doc.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {doc.filename} · {formatBytes(doc.sizeBytes)}
              {doc.pageCount ? ` · ${doc.pageCount} pages` : ""} · uploaded by {doc.uploadedByName} ·{" "}
              {formatDateTime(doc.uploadedAt)}
              {doc.analysedAt && ` · analysed ${formatDateTime(doc.analysedAt)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={analyse} disabled={busy || analysing || doc.textLength === 0}>
              {busy || analysing ? <Spinner /> : <Sparkles className="size-3.5" />}
              {doc.status === "analysed" ? "Re-analyse" : "Analyse"}
            </Button>
            <Button variant="danger" size="sm" onClick={remove} disabled={busy || analysing}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      {doc.status === "failed" && doc.error && (
        <Card className="border-red-200 bg-red-50/60 p-4 text-sm text-red-700">{doc.error}</Card>
      )}
      {doc.status === "awaiting_analysis" && (
        <Card className="border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-800">
          Text extracted ({doc.textLength.toLocaleString()} characters). The document has not been analysed yet
          — add a Claude API key and run the analysis to turn it into anchored knowledge records.
        </Card>
      )}

      {doc.summary && (
        <Card className="p-5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Summary</p>
          <p className="text-sm leading-relaxed text-slate-700">{doc.summary}</p>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Extracted knowledge records{" "}
          <span className="font-normal text-slate-400">· {doc.records.length}</span>
        </h2>
        {grouped.length === 0 ? (
          <Card className="p-5 text-sm text-slate-500">
            {analysing ? "Analysis in progress…" : "No records yet."}
          </Card>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <Card key={g.cat} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {ORG_CATEGORY_LABELS[g.cat]}
                  </p>
                  <span className="text-xs text-slate-400">{g.records.length}</span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {g.records.map((r) => (
                    <RecordRow key={r.id} r={r} />
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <button
          type="button"
          onClick={() => setShowText((v) => !v)}
          className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          {showText ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          Extracted text{" "}
          <span className="font-normal text-slate-400">· {doc.textLength.toLocaleString()} characters</span>
        </button>
        {showText && (
          <Card className="p-5">
            <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
              {excerpt}
            </pre>
          </Card>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-20 -translate-x-1/2 animate-fade-up rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
