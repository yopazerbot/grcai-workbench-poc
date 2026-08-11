import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { demoLoginEnabled, entraConfigured } from "@/lib/env";
import { SignInButtons } from "@/components/signin-buttons";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-teal-700 text-white">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                GRC Agent Workbench
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Agents draft. Analysts decide.
              </p>
            </div>
          </div>

          <Suspense>
            <SignInButtons microsoft={entraConfigured} demo={demoLoginEnabled} />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo environment — all organisation data is fictional.
        </p>
      </div>
    </main>
  );
}
