import { auth } from "@/auth";

// Public-path handling lives in code (not only in the matcher regex) so dev
// and production builds behave identically.
//
// The unauthenticated redirect deliberately avoids the HTTP Location header:
// Next.js requires an absolute URL there, and behind a reverse proxy that
// rewrites the Host header (nginx `proxy_pass` without `proxy_set_header
// Host $host`, tunnels, etc.) an absolute URL would leak the internal
// address (e.g. http://localhost:8080). A relative client-side bounce is
// resolved by the browser against the public origin, so it works behind any
// proxy. API requests get a clean 401 JSON instead.
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/signin") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.endsWith(".svg");

  if (isPublic || req.auth?.user) return;

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // encodeURIComponent output contains no `"` or `<`, so the attribute and
  // inline script below are safe.
  const target = `/signin?callbackUrl=${encodeURIComponent(pathname + search)}`;
  return new Response(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${target}"><script>location.replace(${JSON.stringify(target)})</script></head><body></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
