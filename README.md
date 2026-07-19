# quotation-calculator

Aviation-parts quotation calculator, rebuilt from the "OLD DONT USE" sheet of
the original Excel workbook. Recreates the sheet's layout, inputs, and formula
chain (`I = C×F → J = I/2 → K = G+H+I+J → L = K×1.01 → M = L/C`, plus
`E4 = E3×98`) with bit-exact Excel semantics, adds a configurable profit rate
(40/50/60%) that derives the final quoted price, and saves calculations to
Supabase (auth-gated, per-user).

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Vite](https://vite.dev) — dev server and build
- [Tailwind CSS v4](https://tailwindcss.com) — via the `@tailwindcss/vite` plugin, no separate config file needed
- [ESLint](https://eslint.org) — flat config, TypeScript-aware, with React Hooks and React Refresh rules
- [Prettier](https://prettier.io) — formatting, wired so it never fights with ESLint

## Getting started

```bash
npm install
npm run dev
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in your Supabase project's
credentials (Project Settings → API in the Supabase dashboard):

```bash
cp .env.example .env.local
```

| Variable                 | Description                             |
| ------------------------ | --------------------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase project's anon/public key |

`.env.local` is gitignored and never committed. Users are created manually in
the Supabase dashboard (Authentication → Users) — there is no in-app
registration page.

## Database setup (one-time)

Saved calculations need one table. In the Supabase dashboard, open
**SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
and run it. It creates the `calculations` table with row-level security so each
user only sees their own saved calculations. Only raw worksheet inputs are
stored — every calculated value is re-derived by the formula engine on load.

## Deployment

`npm run build` outputs a static site to `dist/` — deploy it to any static
host (Vercel, Netlify, Cloudflare Pages, S3, …). Requirements:

1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build-time
   environment variables on the host (they are baked in at build time).
2. Configure SPA fallback so all paths serve `index.html` (the app uses
   client-side routing). On Netlify: `/* /index.html 200`; Vercel handles
   this automatically for Vite projects.
3. Run the database setup above once per Supabase project.

## Scripts

| Script                 | Does                                     |
| ---------------------- | ---------------------------------------- |
| `npm run dev`          | Start the dev server                     |
| `npm run build`        | Type-check, then build for production    |
| `npm run preview`      | Preview the production build locally     |
| `npm run lint`         | Run ESLint                               |
| `npm run lint:fix`     | Run ESLint and auto-fix what it can      |
| `npm run format`       | Format the project with Prettier         |
| `npm run format:check` | Check formatting without writing changes |

## Folder structure

```
src/
  assets/       static files (images, fonts) imported by components
  components/   reusable, non-page UI components (barrel: index.ts)
  contexts/     React context providers (barrel: index.ts)
  hooks/        custom React hooks (barrel: index.ts)
  layouts/      shared page layouts, shells, wrappers (barrel: index.ts)
  pages/        route-level / page components (barrel: index.ts)
  services/     API clients, external service integrations (barrel: index.ts)
  styles/       global CSS, Tailwind entry point
  types/        shared TypeScript types (barrel: index.ts)
  utils/        general-purpose helper functions (barrel: index.ts)
  App.tsx       root component
  main.tsx      entry point
```

`components/`, `contexts/`, `hooks/`, `layouts/`, `pages/`, `services/`,
`types/`, and `utils/` each hold an empty `index.ts` barrel file ready to
re-export from as code is added — nothing has been built into them yet.
`assets/` has no barrel file since it holds static files, not modules.

## Path alias

`@/` maps to `src/`, so code anywhere in the project can import with
`import { X } from '@/lib/x'` instead of relative paths like `../../lib/x`.
Configured in both `vite.config.ts` (for the bundler) and
`tsconfig.app.json` (for the type checker/editor).
