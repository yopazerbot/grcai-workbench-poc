import { auth } from "@/auth";

// Public-path handling lives in code (not only in the matcher regex) so dev
// and production builds behave identically.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg");

  if (isPublic || req.auth?.user) return;

  const signin = new URL("/signin", req.nextUrl.origin);
  signin.searchParams.set("callbackUrl", req.nextUrl.href);
  return Response.redirect(signin);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
