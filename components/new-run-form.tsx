"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { getAgent } from "@/lib/agents";
import { Button, Card, Spinner } from "@/components/ui";

export function NewRunForm({ agentId }: { agentId: string }) {
  const router = useRouter();
  const agent = useMemo(() => getAgent(agentId), [agentId]);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of agent?.inputFields ?? []) {
      init[f.name] = f.type === "select" ? f.options?.[0]?.value ?? "" : "";
    }
    return init;
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!agent) return null;

  const set = (name: string, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));

  const fillSample = () => {
    setValues((v) => ({ ...v, ...agent.sampleInput }));
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: agent.id, input: values }),
      });
      const body = (await res.json()) as { runId?: string; error?: string };
      if (!res.ok || !body.runId) {
        setError(body.error ?? "Could not start the run.");
        setPending(false);
        return;
      }
      router.push(`/runs/${body.runId}`);
    } catch {
      setError("Could not start the run — check your connection.");
      setPending(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-inner outline-none transition-colors placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        {agent.inputFields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
              {field.label}
              {field === agent.inputFields[0] &&
                Object.keys(agent.sampleInput).length > 0 && (
                  <button
                    type="button"
                    onClick={fillSample}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
                  >
                    <Wand2 className="size-3.5" />
                    Use sample input
                  </button>
                )}
            </span>
            {field.type === "textarea" && (
              <textarea
                value={values[field.name] ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                rows={field.rows ?? 6}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
            {field.type === "text" && (
              <input
                value={values[field.name] ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
            {field.type === "select" && (
              <select
                value={values[field.name] ?? ""}
                onChange={(e) => set(field.name, e.target.value)}
                className={inputClass}
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        ))}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner className="border-white/40 border-t-white" /> : <Sparkles className="size-4" />}
            {pending ? "Starting…" : "Draft"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
