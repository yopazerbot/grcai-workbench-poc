"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, FlaskConical, RotateCcw, Sparkles, Trash2, Upload } from "lucide-react";
import { llmHeaders, useSessionKey } from "@/lib/api-key-store";
import { formatRelative } from "@/lib/format";
import { DOCUMENT_CATEGORY_LABELS, type DocumentCategory, type DocumentView } from "@/lib/types";
import { openKeyPanel } from "@/components/api-key-panel";
import { Button, Card, EmptyState, Spinner, cx } from "@/components/ui";
import { DocumentCategoryBadge, DocumentStatusPill, formatBytes } from "./status";

const ACCEPT = ".pdf,.docx,.md,.txt,.csv";
const BUSY_STATUSES = new Set(["analysing", "extracting"]);

interface Props {
  initialDocuments: DocumentView[];
  serverKey: boolean;
}

export function KnowledgeWorkspace({ initialDocuments, serverKey }: Props) {
  const router = useRouter();
  const [sessionKey] = useSessionKey();
  const live = Boolean(sessionKey) || serverKey;

  const [documents, setDocuments] = useState<DocumentView[]>(initialDocuments);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Upload state
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<DocumentCategory>("policy");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/documents", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { documents: DocumentView[] };
    setDocuments(body.documents);
  }, []);

  const anyBusy = documents.some((d) => BUSY_STATUSES.has(d.status));
  useEffect(() => {
    if (!anyBusy) return;
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, [anyBusy, refresh]);

  // When a background analysis finishes, server-rendered stats need a refresh too.
  const prevBusy = useRef(anyBusy);
  useEffect(() => {
    if (prevBusy.current && !anyBusy) router.refresh();
    prevBusy.current = anyBusy;
  }, [anyBusy, router]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setUploadError(null);
    setFiles((prev) => {
      const next = [...prev];
      for (const f of Array.from(list)) {
        if (!next.some((p) => p.name === f.name && p.size === f.size)) next.push(f);
      }
      return next.slice(0, 10);
    });
  };

  const upload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      for (const f of files) form.append("files", f);
      form.append("category", category);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: llmHeaders(),
        body: form,
      });
      const body = (await res.json()) as {
        documents?: DocumentView[];
        rejected?: Array<{ filename: string; error: string }>;
        error?: string;
      };
      if (!res.ok && !body.documents?.length) {
        setUploadError(body.error ?? body.rejected?.[0]?.error ?? "Upload failed.");
        return;
      }
      const n = body.documents?.length ?? 0;
      const failed = body.documents?.filter((d) => d.status === "failed").length ?? 0;
      if (body.rejected?.length) {
        setUploadError(body.rejected.map((r) => `${r.filename}: ${r.error}`).join(" · "));
      }
      showToast(
        n === 0
          ? "Nothing uploaded"
          : live
            ? `${n} document${n === 1 ? "" : "s"} uploaded — analysis started`
            : `${n} document${n === 1 ? "" : "s"} uploaded — awaiting analysis (add a Claude key)`
      );
      if (failed > 0) setUploadError(`${failed} file${failed === 1 ? "" : "s"} could not be read — see the table.`);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
      router.refresh();
    } catch {
      setUploadError("Upload failed — check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const analyse = async (doc: DocumentView) => {
    setBusyId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/analyse`, {
        method: "POST",
        headers: llmHeaders(),
      });
      const body = (await res.json()) as { error?: string; code?: string };
      if (!res.ok) {
        if (body.code === "no_api_key") {
          showToast("Add your Claude API key to analyse documents");
          openKeyPanel();
        } else {
          showToast(body.error ?? "Could not start the analysis");
        }
        return;
      }
      showToast(`Analysing “${doc.title}”…`);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (doc: DocumentView) => {
    if (
      !window.confirm(
        `Delete “${doc.title}” and its ${doc.recordCount} knowledge record${doc.recordCount === 1 ? "" : "s"}?`
      )
    )
      return;
    setBusyId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        showToast(body.error ?? "Could not delete");
        return;
      }
      showToast("Document deleted");
      await refresh();
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const reset = async () => {
    if (
      !window.confirm(
        "Restore the demo knowledge base? All uploaded documents and their records are removed and Lumeo's demo documents are re-seeded."
      )
    )
      return;
    setBusyId("reset");
    try {
      const res = await fetch("/api/knowledge/reset", { method: "POST" });
      if (res.ok) {
        showToast("Demo documents restored");
        await refresh();
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const inputClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

  return (
    <div className="space-y-6">
      {/* Upload -------------------------------------------------------- */}
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Add documents</h2>
            <p className="text-xs text-slate-500">
              Policies, procedures, registers, inventories, certificates, past questionnaire responses — PDF,
              DOCX, Markdown or text, up to 15 MB each.
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            {live ? (
              <>
                <Sparkles className="size-3.5 text-teal-600" />
                Uploads are analysed by Claude ({sessionKey ? "session key" : "server key"})
              </>
            ) : (
              <>
                <FlaskConical className="size-3.5" />
                No Claude key —{" "}
                <button type="button" onClick={openKeyPanel} className="font-medium text-teal-700 hover:text-teal-800">
                  add one
                </button>{" "}
                to analyse uploads
              </>
            )}
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={cx(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragging ? "border-teal-500 bg-teal-50/60" : "border-slate-300 hover:border-teal-400 hover:bg-slate-50"
          )}
        >
          <Upload className="size-6 text-slate-400" />
          <p className="text-sm text-slate-600">
            <span className="font-medium text-teal-700">Choose files</span> or drag them here
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-slate-400" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatBytes(f.size)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((p) => p !== f))}
                    className="text-xs text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Document type
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className={inputClass}
                >
                  {(Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {DOCUMENT_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">(the analysis may refine it)</span>
              </label>
              <Button onClick={upload} disabled={uploading}>
                {uploading ? <Spinner className="border-white/40 border-t-white" /> : <Upload className="size-4" />}
                {uploading ? "Uploading…" : `Upload ${files.length} file${files.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </div>
        )}
        {uploadError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{uploadError}</p>
        )}
      </Card>

      {/* Documents ----------------------------------------------------- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Documents <span className="font-normal text-slate-400">· {documents.length}</span>
          </h2>
          <Button variant="ghost" size="sm" onClick={reset} disabled={busyId === "reset"}>
            <RotateCcw className="size-3.5" />
            Restore demo documents
          </Button>
        </div>
        {documents.length === 0 ? (
          <EmptyState>No documents yet — upload a policy or restore the demo set.</EmptyState>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Records</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const busy = busyId === doc.id || BUSY_STATUSES.has(doc.status);
                  return (
                    <tr key={doc.id} className="align-top transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/knowledge/${doc.id}`} className="group block min-w-0">
                          <span className="block max-w-[360px] truncate font-medium text-slate-900 group-hover:text-teal-700">
                            {doc.title}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {doc.filename} · {formatBytes(doc.sizeBytes)}
                            {doc.pageCount ? ` · ${doc.pageCount} p.` : ""}
                            {doc.seeded ? " · demo" : ""}
                          </span>
                          {doc.status === "failed" && doc.error && (
                            <span className="mt-1 block text-xs text-red-600">{doc.error}</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <DocumentCategoryBadge category={doc.category} />
                      </td>
                      <td className="px-4 py-3">
                        <DocumentStatusPill status={doc.status} />
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{doc.recordCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        <span className="block">{formatRelative(doc.uploadedAt)}</span>
                        <span className="block text-xs text-slate-400">{doc.uploadedByName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => analyse(doc)}
                            disabled={busy || doc.textLength === 0}
                            title={doc.status === "analysed" ? "Re-run the AI analysis" : "Run the AI analysis"}
                          >
                            {busyId === doc.id ? <Spinner /> : <Sparkles className="size-3.5" />}
                            {doc.status === "analysed" ? "Re-analyse" : "Analyse"}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => remove(doc)}
                            disabled={busy}
                            title="Delete document and its records"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-8 left-1/2 z-20 -translate-x-1/2 animate-fade-up rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
