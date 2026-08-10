import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { demoLoginEnabled, entraConfigured } from "@/lib/env";
import { signInDemoAction, signInMicrosoftAction } from "@/app/actions";

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

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

          <div className="space-y-3">
            {entraConfigured && (
              <form action={signInMicrosoftAction}>
                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <MicrosoftLogo />
                  Sign in with Microsoft
                </button>
              </form>
            )}
            {demoLoginEnabled && (
              <form action={signInDemoAction}>
                <button
                  type="submit"
                  className="w-full cursor-pointer rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800"
                >
                  Continue as demo analyst
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Demo environment — all organisation data is fictional.
        </p>
      </div>
    </main>
  );
}
