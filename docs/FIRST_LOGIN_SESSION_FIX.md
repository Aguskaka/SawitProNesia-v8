# v8.0.0.4 — First Login Session Fix

Symptom
- First login occasionally showed a server error.
- Reload immediately opened the authenticated dashboard correctly.

Fix
1. `login()` now calls `revalidatePath("/", "layout")` after successful `signInWithPassword()` and before redirect.
2. `logout()` also invalidates the authenticated layout before redirect.
3. Dashboard layout and page are explicitly `force-dynamic` with `revalidate = 0`.
4. Login page is also dynamic.
5. No middleware/proxy is reintroduced, so Cloudflare OpenNext compatibility remains intact.

No Supabase schema/RLS changes are required.

Acceptance
- Open a private/incognito browser.
- Visit `/login`.
- Login once.
- Expected: dashboard opens directly on first attempt without pressing Reload.
- Logout.
- Login again.
- Expected: same result.
