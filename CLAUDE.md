# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

T3Chat is an open-source AI chat application built with the T3 stack. It supports multiple LLM providers (OpenAI, Google, Anthropic) routed through a TypeGPT API proxy, with Stripe subscriptions (FREE/PRO tiers), Google OAuth, and real-time streaming responses.

## Commands

```bash
bun install          # Install dependencies
bun dev              # Start dev server (Next.js with Turbopack)
bun run build        # Production build
bun run check        # Lint + typecheck combined
bun run lint         # ESLint only
bun run lint:fix     # ESLint with autofix
bun run typecheck    # TypeScript type checking (tsc --noEmit)
bun run format:check # Prettier check
bun run format:write # Prettier fix

# Database (Prisma)
bun run db:push      # Push schema to DB without migration
bun run db:generate  # Generate migration (prisma migrate dev)
bun run db:migrate   # Deploy migrations (prisma migrate deploy)
bun run db:studio    # Open Prisma Studio GUI
```

## Architecture

**Framework:** Next.js 15 (App Router) with React 19, TypeScript, TailwindCSS v4, Shadcn/ui (new-york style).

**Path alias:** `@/*` maps to `./src/*`.

### Key directories under `src/`

- **`app/`** — Next.js App Router pages and API routes
  - `(app)/` — Protected app routes: `/ask` (chat), `/pricing`, `/settings`
  - `(auth)/` — Auth routes: `/auth`
  - `api/ask/` — Streaming chat completion endpoint (SSE)
  - `api/trpc/[trpc]/` — tRPC HTTP handler
  - `api/webhooks/stripe/` — Stripe webhook
  - `api/checkout-sessions/` — Stripe checkout session creation
- **`server/`** — Backend logic
  - `auth/` — NextAuth v5 config (Google OAuth, Prisma adapter)
  - `api/trpc.ts` — tRPC init, context, `publicProcedure` and `protectedProcedure`
  - `api/root.ts` — Root router merging `chat`, `user`, `feedback` routers
  - `api/routers/` — Individual tRPC routers
  - `db.ts` — Prisma client singleton
- **`models/`** — LLM model definitions, provider enum (`OPENAI`, `GOOGLE`, `ANTHROPIC`), availability flags
- **`actions/`** — Server actions (fetchUser, getChat, saveChat)
- **`components/`** — React components; `ui/` contains Shadcn primitives
- **`contexts/`** — React context providers (FontProvider, BlurProvider)
- **`hooks/`** — Custom hooks (e.g., `use-model` persists model selection to localStorage)
- **`config/`** — App configuration
- **`lib/`** — Utilities (mail via Nodemailer, Redis via Upstash)
- **`env.js`** — Runtime env validation via `@t3-oss/env-nextjs` + Zod

### Data flow

- **tRPC** (v11 with SuperJSON) handles type-safe CRUD via `chat`, `user`, and `feedback` routers. Protected procedures check `ctx.session.user`.
- **Streaming chat** uses the AI SDK (`@ai-sdk/openai`, `@ai-sdk/google`) at `POST /api/ask`, which streams responses as SSE and saves messages to the DB.
- **React Query** (TanStack Query v5) manages client-side data fetching/caching via the tRPC-React integration.

### Database

**Prisma** with PostgreSQL. Schema at `prisma/schema.prisma`.

Key models: `User`, `Account`, `Session`, `Chat`, `Message` (role: `USER`/`ASSISTANT`), `Subscription` (plan: `FREE`/`PRO`), `Transaction`.

### Auth

NextAuth v5 (beta) with Prisma adapter. Google OAuth only. Middleware at `src/middleware.ts` protects `/ask/*` routes by checking session cookies.

### Payments

Stripe integration with webhook at `/api/webhooks/stripe`. Two-tier plan system (FREE/PRO) tracked in `Subscription` model.

### Environment

All env vars are validated at build time in `src/env.js` (can skip with `SKIP_ENV_VALIDATION=true` for Docker builds). See `.env.example` for required variables. Key groups: Google OAuth, Prisma/PostgreSQL, Stripe, Upstash Redis, TypeGPT API, Turnstile CAPTCHA, Nodemailer.

## Deployment

- **Vercel** (primary) — standalone output mode
- **Docker** — Multi-stage Dockerfile using `oven/bun:1-alpine`; `docker-compose.yml` includes PostgreSQL
- **CI/CD** — GitHub Actions builds Docker image on push to `master`
