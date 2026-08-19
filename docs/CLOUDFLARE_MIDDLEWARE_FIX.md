# v8.0.0.2 — Cloudflare Middleware Fix

Cause:
- Next.js 16 `proxy.ts` always runs on the Node.js middleware runtime.
- Cloudflare OpenNext currently supports Middleware, but not Node.js Middleware.

Fix:
- Removed `src/proxy.ts`.
- Added `src/middleware.ts`.
- The middleware keeps the same Supabase SSR cookie refresh logic via `src/lib/supabase/proxy.ts`.
- No Supabase schema or RLS changes.

Cloudflare settings remain:
- Build command: `npx @opennextjs/cloudflare build`
- Deploy command: `npx @opennextjs/cloudflare deploy`
- Root directory: `/`

After uploading this patch to GitHub, retry the deployment.
