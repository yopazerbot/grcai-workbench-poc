import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { demoLoginEnabled, entraConfigured, env } from "@/lib/env";

// Edge-safe by design: this module is bundled into the middleware, so it must
// never import the database or any Node-native dependency.

const providers: Provider[] = [];

if (entraConfigured) {
  providers.push(
    MicrosoftEntraID({
      clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    })
  );
}

if (demoLoginEnabled) {
  providers.push(
    Credentials({
      id: "demo",
      name: "Demo Analyst",
      credentials: {},
      authorize: async () => ({
        id: "demo-analyst",
        name: "Demo Analyst",
        email: "analyst@demo.grcai.app",
      }),
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/signin" },
  callbacks: {
    // Gating happens in middleware.ts (public-path aware); never auto-redirect
    // here — otherwise /api/auth/* itself gets bounced to the sign-in page.
    authorized: () => true,
  },
});
