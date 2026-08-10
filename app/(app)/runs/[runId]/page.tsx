import { notFound } from "next/navigation";
import { applyStaleDraftingFailsafe, getItemsForRun, getRunDetail } from "@/lib/data";
import { RunReview } from "@/components/run-review";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = getRunDetail(runId);
  if (!run) notFound();

  const checked = applyStaleDraftingFailsafe(run);
  const items = checked.status === "drafting" ? [] : getItemsForRun(runId);

  return <RunReview initialRun={{ ...run, ...checked }} initialItems={items} />;
}
