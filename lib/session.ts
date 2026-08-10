import { auth } from "@/auth";
import type { Actor } from "./types";

/** Resolve the signed-in analyst for API handlers; null when unauthenticated. */
export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) return null;
  return { name: user.name ?? user.email, email: user.email };
}
