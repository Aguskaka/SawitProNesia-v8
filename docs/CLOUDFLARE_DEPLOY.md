# Cloudflare Workers deployment — SawitProNesia v8

Required Build Variables and Secrets:

- NEXT_PUBLIC_SUPABASE_URL
  - Value must be ONLY the URL, e.g. `https://xxxxx.supabase.co`
  - Do not include `NEXT_PUBLIC_SUPABASE_URL=`

- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  - Value must be ONLY `sb_publishable_...`
  - Do not include `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`

Cloudflare Workers / OpenNext:
- Deploy command: `npm run deploy`
- Root directory: `/`
- nodejs_compat: enabled in wrangler.jsonc
- No Supabase secret/service-role key is required.
