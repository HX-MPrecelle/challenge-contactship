# Design system

A small, focused design system built on top of shadcn/ui with Tailwind v4. Dark-mode-first, minimal, operational. Visual reference points are Linear, Vercel, and OpenAI Playground — not HubSpot.

## Primitives

- **shadcn/ui** (new-york style) as the component baseline. We pull components on demand into `apps/web/components/ui/`.
- **Lucide** for icons. Single icon library; no mixing.
- **Motion** (Framer Motion v12+) for state-change animations. Used sparingly — no decorative motion.
- **Tailwind v4** with theme tokens defined in CSS (`app/globals.css` under `@theme inline`). No `tailwind.config.js` — Tailwind v4 reads everything from CSS.

## Color tokens

All colors are OKLCH for predictable contrast across hue shifts. Both light and dark themes are defined; the app is locked to dark mode at the `<html>` element. Semantic tokens:

| Token | Use |
|---|---|
| `background` / `foreground` | Page surface and primary text |
| `card` / `card-foreground` | Elevated surfaces (panels, dialogs) |
| `popover` | Popovers, dropdowns |
| `primary` | Default button surface |
| `secondary` | Subtle button / muted surfaces |
| `muted` / `muted-foreground` | Disabled or secondary text |
| `accent` | Hover backgrounds |
| `destructive` | Errors, destructive actions |
| `success` | Synced badges, healthy states |
| `warning` | Stale / attention-needed states |
| `border` / `input` / `ring` | Structural lines and focus rings |

## App-specific components

These live in `apps/web/components/` (not extracted to `@contactship/ui` — see `decisions/no-shared-ui-package.md`):

- **`AIMessage`** — assistant / user / tool variants. Streaming cursor when active. Tool calls render as embedded `ToolCallCard`.
- **`ToolCallCard`** — collapsible card with a status pill (`pending` · `streaming` · `success` · `error`), the JSON arguments preview, and (on success) a compact result summary.
- **`SyncBadge`** — small dot + label. Variants: `live` (animated green dot), `syncing` (animated amber), `synced` (static green), `failed` (red). Used in the contacts table and contact detail header.
- **`InsightCard`** — title, single metric, one-paragraph context, optional CTA. Used on the dashboard.
- **`ActivityTimeline`** — vertical timeline of sync_logs / notes / property changes. Used on the contact detail page.
- **`CommandBar`** — ⌘K palette using `cmdk`. Used for quick navigation and triggering the copilot with templated prompts.
- **`EmptyState`** — icon + title + description + optional action. Consistent across every list view.

## Layout

Authenticated layout (`app/(app)/layout.tsx`) is a fixed two-column shell:

```
┌────────┬──────────────────────────────────────────────────┐
│        │  TopBar: page title · breadcrumb · CommandBar    │
│Sidebar │                                                  │
│        │  Main content                                    │
│ (fixed)│                                                  │
│  64px  │                                                  │
│        │                                                  │
└────────┴──────────────────────────────────────────────────┘
                                       │ Copilot drawer   │
                                       │ (right, ⌘I)      │
                                       │ ─ persistent ─   │
```

The copilot drawer is mounted at the layout level so its conversation state persists across page navigation. Width: 420px when open, collapsed by default.

## Empty / loading / streaming states

- **Empty.** Always include an icon, a one-sentence explanation, and (where it exists) a primary action.
- **Loading.** Skeletons match the final layout's shape; no spinners on full pages.
- **Streaming.** Pulsing cursor next to the in-progress assistant message. Tool calls render their status pill in real time.

## What we deliberately don't ship

- **Theme switcher.** Dark mode is the product.
- **Customization surfaces** (column reorder, saved views). MVP scope.
- **Marketing motion.** No hero animations beyond the landing page background grid.
