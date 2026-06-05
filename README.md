# TaskFlow

TaskFlow is a Next.js App Router implementation of the PRD in `prd.md`, styled from the Stitch design assets in `stitch_taskflow_management_system/`.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000/login`.

If Supabase env vars are empty, the app runs in demo mode:

- username containing `member` opens the member workspace
- any other username opens the manager workspace
- any password value is accepted

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Create the first manager auth user in Supabase, then insert its profile row into `public.users`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The automated tests cover H-3 deadline logic, overdue handling, dashboard aggregation, and role guards.

## Netlify Deploy

This repo includes `netlify.toml` with the production build command. Netlify supports Next.js App Router, Server Actions, SSR, and Middleware through its automatic OpenNext adapter, so no pinned plugin is required.

Set these environment variables in Netlify:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-netlify-site.netlify.app
```

Keep `SUPABASE_SERVICE_ROLE_KEY` secret. In Supabase Auth, add the Netlify site URL to allowed redirect/site URLs before testing production login.
