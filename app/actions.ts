"use server";

import { signIn, signOut } from "@/auth";

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}

export async function signInMicrosoftAction(): Promise<void> {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}

export async function signInDemoAction(): Promise<void> {
  await signIn("demo", { redirectTo: "/" });
}
