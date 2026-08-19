# v8.0.0.3 — No-Middleware Foundation

Reason:
- OpenNext Cloudflare currently rejects Next.js Node.js middleware/proxy.
- For Foundation, middleware is not required to prove Supabase connectivity and auth.

Changes:
- Removed `src/proxy.ts`.
- Removed `src/middleware.ts` if present.
- Removed unused `src/lib/supabase/proxy.ts`.

Authentication still works through:
- server action `signInWithPassword()` on `/login`
- server-side `supabase.auth.getUser()` in dashboard layout
- server action `signOut()` for logout

This is intentionally conservative. Session refresh middleware can be reintroduced later using a Cloudflare-compatible pattern after the foundation build is green.

Cloudflare settings:
- Build command: `npx @opennextjs/cloudflare build`
- Deploy command: `npx @opennextjs/cloudflare deploy`
- Root directory: `/`

No Supabase SQL/RLS changes are required.
