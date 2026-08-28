import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { envKeyConfigured } from "@/lib/env";
import { ApiKeyPanel } from "@/components/api-key-panel";
import { EngineStatus } from "@/components/engine-status";
import { NavLinks } from "@/components/nav-links";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) redirect("/signin");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-teal-700 text-white">
                <ShieldCheck className="size-4" />
              </span>
              <span className="hidden text-sm font-semibold tracking-tight lg:block">
                GRC Agent Workbench
              </span>
            </Link>
            <NavLinks />
          </div>
          <div className="flex items-center gap-3">
            <EngineStatus serverKey={envKeyConfigured} compact />
            <UserMenu name={user.name ?? user.email} email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <ApiKeyPanel serverKey={envKeyConfigured} />
    </div>
  );
}
