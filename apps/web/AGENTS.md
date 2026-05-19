<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## ContactShip — `apps/web` conventions

### Stack on this app

- Next.js 16.2.6 (App Router, Turbopack default, React 19.2.4)
- Tailwind v4 (CSS-based theme via `@theme inline` in `app/globals.css`)
- shadcn/ui components (new-york style, neutral base color, dark-mode-first)
- Lucide icons, Motion (Framer Motion v12+)
- Strict TypeScript with workspace paths configured for `@contactship/*` packages

### Next.js 16 conventions to respect

This is **not** Next 15. Key differences:

- `cookies()`, `headers()`, `draftMode()` — all async. `await` them.
- `params`, `searchParams` in `page.tsx` / `layout.tsx` / `route.ts` — async. Use `await props.params`.
- Middleware filename and export are `proxy` (not `middleware`). Runtime is `nodejs`, not edge.
- `revalidateTag(tag, cacheLife)` — second arg required.
- `next lint` removed. Lint via ESLint or Biome directly.
- Turbopack is the default for both `dev` and `build`. No `--turbopack` flag needed.

When unsure about an API, read the doc at `node_modules/next/dist/docs/01-app/...` — the bundled docs always match the installed version.

### Project conventions

- Dark mode is the default. `<html className="dark">` is fixed in `app/layout.tsx`. Do not toggle.
- Use `@/` for relative imports inside this app, `@contactship/<package>` for workspace packages.
- Server Components by default. Add `"use client"` only when needed for interactivity, hooks, or browser APIs.
- All HubSpot API calls go through `@contactship/hubspot`. Never call HubSpot endpoints directly from `apps/web`.
- All DB access goes through `@contactship/db`. Never instantiate Drizzle clients ad hoc.
- AI tools live in `@contactship/ai`. Route handlers under `app/api/copilot/*` delegate to them.
