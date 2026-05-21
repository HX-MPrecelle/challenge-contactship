# ContactShip — Design System v2 · Migration Spec

> **Reemplazo drop-in del design system v1**, manteniendo nombres de token 1:1 para minimizar el blast radius. Sólo cambian VALORES, plus la dirección general (light-first, Geist, cobalt accent).

---

## 1. Resumen ejecutivo del cambio

| Aspecto | v1 (actual) | v2 (nuevo) |
|---|---|---|
| Modo por defecto | Dark | **Light** (dark sigue disponible via `.dark`) |
| Accent | Indigo neón `#6366F1` | **Cobalt** `#2348C9` |
| Fondo base | `#0A0A0F` | `#FBFBFA` (warm-cool neutral) |
| Borders | `#2A2A3D` (oscuros) | `#E6E6E4` (hairline) |
| Font headings | Syne | **Geist** (mismo sans, sin display alt) |
| Font body | DM Sans | **Geist** |
| Font mono | JetBrains Mono | **Geist Mono** |
| Shadows | None (sólo border) | Sombras casi imperceptibles (tonal) |
| Density | Mid | Mid (sin cambios — sigue siendo info-first) |

**Filosofía**: quiet defaults, hairlines en lugar de cajas, accent contenido (sólo se usa donde importa: CTA primarios, links activos, lead score badges). Cero gradientes decorativos.

---

## 2. Archivos a tocar — checklist

### 2.1 Reemplazos directos (copiar y pegar)

- [ ] **`app/globals.css`** → reemplazar entero por `migration/globals.css`
- [ ] **`app/layout.tsx`** → cambios:
  - Reemplazar `next/font/google` imports: sacar `DM_Sans`, `JetBrains_Mono`, `Syne` → agregar `Geist` y `Geist_Mono` (paquetes oficiales `geist/font/sans` y `geist/font/mono`).
  - Cambiar `<html lang="es" className={\`dark ${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable}\`}>` por `<html lang="es" className={\`${GeistSans.variable} ${GeistMono.variable}\`}>` (sin `dark` por default).

### 2.2 Componentes shadcn — sin cambios

Los componentes en `components/ui/` consumen los CSS variables, así que **no hay que tocarlos**. El cambio se propaga automáticamente.

### 2.3 Componentes propios — revisión de clases

Estos archivos hardcodean clases que dependen del nuevo sistema. La mayoría sigue funcionando porque los nombres de token no cambiaron, pero algunos detalles necesitan ajuste:

#### `components/layout/Sidebar.tsx`
- `active` state: en lugar de `bg-brand-subtle text-brand`, usar `bg-bg-subtle text-text-primary` (más quieto, alineado con sidebar pattern del nuevo sistema).
- Logo: cambiar el icono Sparkles por un wordmark + mark cuadrado (ver Brand artboard).

#### `components/contacts/ContactList.tsx`
- Header row: bajar font-weight a 600, color a `text-text-muted`, padding a `px-4 py-2.5` (ya está ok).
- AI search banner: el actual `border-brand/40 bg-brand-subtle` funciona — sólo verificar contraste en light mode (debería estar bien con los nuevos `--brand-subtle` y `--brand-on-subtle`).
- Avatares: agregar `<Avatar>` component (ver §3 abajo) en columna nombre — actualmente sólo hay texto.
- Email column: aplicar `font-mono text-xs` para densidad y alineación.
- Selected row: hoy es `bg-accent-subtle border-left: 2px solid --accent`. Nuevo: `bg-brand-subtle/30` sin border-left (más quieto).

#### `components/contacts/SyncStatusBadge.tsx`
- Sin cambios — el componente consume los tokens semánticos. Sólo verificar que el dot del `conflict` mantenga la animación `animate-pulse-dot`.

#### `components/contacts/AiInsightsPanel.tsx`
- Eliminar el bg gradient si hay alguno (no veo en el código pero por las dudas).
- LeadScoreCard: el número debería usar `font-display text-3xl` (Geist tiene buenos tabular nums).
- Cards highlight: `border-brand/40 bg-brand-subtle` está bien.

#### `components/onboarding/OnboardingStepper.tsx`
- Stepper dots: cambiar `done` state de `border-brand bg-brand text-white` a mantener — está bien.
- Active state: hoy es `border-brand bg-brand-subtle text-brand` → mantener.
- Idle: ok.

#### `app/page.tsx` (landing)
- Layout actual está centrado en columna chica. Considerar el rediseño del Login artboard: split-pane con brand panel oscuro a la izquierda + form a la derecha. Es opcional pero da mejor primera impresión para una entrevista.

#### `app/(app)/settings/page.tsx` — REDISEÑO MAYOR
- Hoy es una página plana. Adoptar el layout del Settings artboard:
  - **Sub-nav vertical** (220px ancho) con 3 grupos: Personal, Organization, Developer.
  - Items con `active` state (`bg-bg-subtle`), badges contextuales (ej. "3" warning para Sync health).
  - Panel principal con secciones (HubSpot connection card, Sync, AI).
  - Connection card destacada con avatar cuadrado de HubSpot (#FF7A59), status badge, "Re-sync" + "Disconnect" actions.
  - Filas de settings con título + descripción a la izquierda + control a la derecha (Toggle, Select chip, button group).

#### `app/(app)/chat/page.tsx` y `components/chat/ContactsChat.tsx` — REDISEÑO MAYOR
- Hoy es chat plano. Adoptar el layout del Chat artboard:
  - **Layout de 3 columnas**: AppSidebar global + history rail (260px) + conversación.
  - History rail con "Nueva conversación" button al tope, items agrupados por fecha (Hoy / Ayer / Esta semana).
  - Mensajes user: chip a la derecha con `bg-bg-subtle` + border, `border-top-right-radius: 4px` (cola sutil).
  - Mensajes AI: ícono Sparkles (28x28 rounded square, `bg-brand-subtle`) + contenido. Las tablas inline se renderizan con el mismo pattern de la Contact List (header con `bg-bg-subtle`, mono en valores numéricos).
  - Thinking state: 3 dots animados (`cs-pulse` con stagger 0.15s) + texto "Analizando contactos…".
  - Composer: card flotante con `bg-bg-surface`, `border-strong`, `shadow-md`. Acciones a la izquierda (attach, context), Enviar primario a la derecha.
  - Footer con disclaimer "Las respuestas pueden contener errores".

#### NUEVO: `app/(app)/conflicts/page.tsx`
- Esta ruta no existe hoy. Crearla.
- Layout del Conflicts artboard:
  - **2 panes**: lista de conflictos (380px) + detail.
  - Header del list: contador + Badge warning pulsando, descripción corta.
  - List items: avatar + nombre + tiempo + field name como chip mono + diff de 2 líneas (local: / remote:).
  - Active item: `bg-bg-subtle` + `border-left: 2px solid brand`.
  - Detail: avatar grande + Badge conflict + field chip + timeline del conflict (3 entries típicas: HubSpot cambió, usuario cambió, sync detectó) + diff cards side-by-side (ContactShip vs HubSpot) con selección por click y checkmark circular cuando seleccionado.
  - Footer: "Posponer" (ghost) izquierda, "Editar manual" (secondary) + "Aplicar HubSpot" (primary) derecha.
- Server Action nuevo: `resolveConflict({contactId, field, winner: 'local'|'remote'|'manual', manualValue?})`.
- Realtime: suscribir a `sync_events` table con `event_type=conflict` para que la lista se actualice en vivo.

#### NUEVOS: Empty states
- Crear `components/ui/empty-state.tsx` con la prop API:
  ```tsx
  <EmptyState
    glyph={<EmptyGlyph kind="contacts" />}
    title="..."
    description="..."
    primaryAction={{ label, icon, onClick }}
    secondaryAction={{ label, onClick }}
    meta="último check..."
  />
  ```
- Glyphs custom (SVG inline, NO emoji ni Lucide directo): contacts, check (success), search, chat. Cada uno en un cuadrado de 56x56 con `bg-bg-subtle` (o `bg-success-subtle` para success).
- Aplicar en:
  - `ContactList.tsx` cuando `contacts.length === 0` → "Sin contactos importados todavía" + CTA "Conectar HubSpot" / "Importar CSV".
  - `ContactList.tsx` cuando `filtered.length === 0 && contacts.length > 0` → "Ningún contacto coincide" + "Limpiar filtros" / "Probar AI search".
  - `ConflictsScreen` cuando no hay conflicts → "Todo en sync" success state.
  - `ChatScreen` cuando no hay conversaciones → "Empezá una conversación".
- Inline empty (variante reducida) en `AiInsightsPanel.tsx` cuando aún no hay suficiente actividad para generar insights: border dashed, ícono lateral chico, action inline.

---

## 3. Componente nuevo a agregar

**`components/ui/avatar.tsx`** — no existe en el repo y el design system lo usa en todas las tablas y headers de contacto.

```tsx
// components/ui/avatar.tsx
import { cn } from "@/lib/utils";

const HUES = [15, 200, 270, 140, 30, 320, 240];

function hashHue(name: string) {
  const sum = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return HUES[sum % HUES.length];
}

export function Avatar({
  name,
  size = 28,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const hue = hashHue(name);

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        letterSpacing: "-0.01em",
        background: `oklch(0.94 0.03 ${hue})`,
        color: `oklch(0.42 0.10 ${hue})`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
```

Para dark mode los valores oklch cambian — agregar variant `dark:` con `oklch(0.28 0.05 X)` / `oklch(0.82 0.10 X)`.

---

## 4. Type scale — sin cambios

Las variables `--text-xs` a `--text-3xl` mantienen los mismos tamaños del v1. Sólo cambia el font-family (Geist) y un par de line-heights se aprietan en `--text-2xl` (1.2 → 1.15) y `--text-base` (1.6 → 1.55) para mayor densidad.

---

## 5. Setup de Geist

Reemplazar en `app/layout.tsx`:

```tsx
// ANTES
import { DM_Sans, JetBrains_Mono, Syne } from "next/font/google";
const syne = Syne({ variable: "--font-syne", ... });
const dmSans = DM_Sans({ variable: "--font-dm-sans", ... });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", ... });

// DESPUÉS
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
// (no factory call — Geist exporta instancias listas)
```

Instalar el paquete:
```bash
pnpm add geist
```

Si preferís quedarte con `next/font/google` (Geist también está ahí), usar:
```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});
```

---

## 6. Cosas que se VAN

- Variable `--font-syne` y sus utilities.
- Variable `--font-dm-sans` y sus utilities.
- Clase `dark` por default en `<html>`.
- Cualquier color hardcodeado que haga referencia a `#6366F1`, `#0A0A0F`, etc. — buscar y reemplazar por el token correspondiente.

```bash
# Útil para detectar hardcodes a limpiar:
grep -rn "#6366F1\|#0A0A0F\|#111118\|#1A1A24\|#F0F0FF\|#9494B8" \
  app/ components/ --include="*.tsx" --include="*.css"
```

---

## 7. Validación post-migration

Smoke test rápido:

1. `pnpm dev` y navegar a `/login` — fondo debe ser blanco/`#FBFBFA`, no negro.
2. `/contacts` — la tabla debe verse con hairlines `#E6E6E4`, no con borders oscuros.
3. Toggle dark mode (agregar `class="dark"` en `<html>` manualmente para probar) — todo debe seguir legible.
4. `/contacts/[id]` — el AI Insights panel debe leerse calmo, no llamativo.
5. Conflict badge — el dot debe pulsar.
6. Toast de error — borde izquierdo de 3px rojo.

---

## 8. Lo que NO está en este spec (próximo paso)

El design system cubre **15 pantallas/componentes**:

**Foundations** (Color, Typography, Spacing & radius, Iconography & motion)

**Components** (Buttons, Forms, Badges, Cards/tables, Toasts & banners, Dialogs & modals)

**Application**:
- Dashboard (post-login home con stats, breakdowns, AI priorities, quick links)
- Login (split-pane)
- Onboarding (paso 3 de 4)
- Contact List (workspace)
- Contact Detail (con AI Insights panel)
- Similar contacts panel (sub-componente del Contact Detail)
- Conflicts inbox (vista dedicada de 2 paneles)
- Conflict diff dialog (modal alternativo, field-by-field merge)
- Chat (history rail variant)
- Chat v2 (con persona toggle + voice input + citations)
- Email draft dialog (modal con tone picker)
- Filter summary dialog (modal de análisis AI)
- Settings (con sub-nav)
- Empty states (5 variantes)

Lo único que no está cubierto: el flow específico de errores críticos a nivel app (fallo de token HubSpot, sesión expirada). Hereda del Empty State + Toast + inline banner pattern.

---

## 9. Features avanzadas — referencias rápidas

Cada feature mapea a un component existente en el repo. El design system las rediseña pero **conserva el comportamiento y los Server Actions intactos**.

### 9.1 Contactos similares (pgvector)

**Componente**: `components/contacts/SimilarContactsPanel.tsx`
**Artboard**: "Similar contacts panel"

Cambios:
- Reemplazar el icon `Users2` por nuestro icon `users` del set propio (o mantener Lucide si conviene).
- Item rows: usar `<Avatar size={28} />` + nombre + meta (job · company · country) + `<SimilarityBadge pct={...} />`.
- SimilarityBadge: pill mono 11px con border, colores por tier:
  - `>= 85%` → success (`bg-success-subtle text-success border-success/30`)
  - `>= 70%` → brand (`bg-brand-subtle text-brand-on-subtle border-brand/30`)
  - `< 70%`  → neutral (`bg-bg-subtle text-text-secondary border-border-default`)
- Footer caption en mono 10px: "vector similarity · pgvector".
- Skeleton state: 3 rows de 40px de alto con `animate-shimmer`.

### 9.2 Email draft con IA

**Componente**: `components/contacts/EmailDraftDialog.tsx`
**Artboard**: "Email draft (modal)"

Adoptar el Dialog pattern del design system. Cambios clave:
- Dialog chrome: icon `sparkles` con `iconTone="brand"` (cuadrado 32x32 brand-subtle), título "Borrador de email con IA", desc corta.
- Tone picker (3 opciones): `<ToneOption>` como segmented buttons grandes (cada uno con `label` + `hint`), activo con `border-brand bg-brand-subtle`.
- Rationale callout: card destacada con `bg-brand-subtle border-brand/40`, label "Por qué este enfoque:" en bold brand-on-subtle.
- Subject + body como inputs/textarea estándar del DS.
- Footer: `Regenerar` (ghost) + `Copiar` (secondary) + `Abrir en mail` (primary).
- Mantener trigger button "Borrador de email" en la sidebar del Contact Detail.

### 9.3 Conflict diff dialog

**Componente**: `components/contacts/ConflictDiffDialog.tsx`
**Artboard**: "Conflict diff (modal)"

Esta es la variante MODAL del Conflicts inbox. Coexisten: la inbox `/conflicts` es para revisar todos los pending; el diff dialog se abre desde un row específico para resolver rápido.

- Dialog chrome: icon `alert` con `iconTone="error"`, título "Resolver conflicto".
- Meta bar: timestamp del conflict + bulk actions "Todo local" / "Todo HubSpot".
- Diff table: 3 columnas (`80px field · 1fr local · 1fr hubspot`).
  - Field column: caption mono 12px.
  - Cells: click to select; estados visual:
    - Active (chosen): `border-brand bg-brand-subtle text-text-primary`
    - Same (both equal): `bg-bg-subtle text-text-muted` (no clickeable, mostrar valor en italic).
    - Inactive (other side selected): `bg-bg-surface text-text-primary`.
- Header row pequeño antes de las rows: "CAMPO · LOCAL (VOS) · HUBSPOT" con dot indicators (info azul para local, warning naranja para hubspot).
- Footer: `Cancelar` (ghost) + `Guardar merge` (primary).

### 9.4 Chat con citaciones clicables

**Componente**: `components/chat/ContactsChat.tsx` (ya existe, upgrade)
**Tipos**: `types/chat.ts` con `ContactCitation`
**Artboard**: "Chat v2 · persona + voice + citations"

Cambios visuales sobre el chat actual:
- Mensajes AI: ícono cuadrado `sparkles` 28x28 brand-subtle + content. NO usar bubble redondeado de fondo brand; el AI message es texto plano con líneas que respiran.
- Citations debajo del mensaje AI:
  - Label mono 10px: "BASADO EN N CONTACTOS" con icon sparkles 10px.
  - Chips clicables: `<CitationChip>` redondeada 999px, border-default, hover → `border-brand/40 bg-brand-subtle`. Formato: "Nombre · Empresa".
  - Truncate el nombre a 120px max-width, el resto con ellipsis.
- Mensajes user: bubble alineada a la derecha con `bg-bg-subtle` (NO brand bg — el usuario habla, no "ejecuta acciones primarias").
- Thinking state: 3 dots animados (`cs-pulse` con stagger) + texto "Razonando sobre N leads activos…".

### 9.5 Persona toggle

**Componente**: dentro de `ContactsChat.tsx`
**Type**: `lib/ai/persona.ts` exporta `PERSONAS` (concise | analyst | coach)

Ubicación: top-right del chat header, NO en composer.
- Label `PERSONA` mono 10px uppercase con tracking 0.08em, arriba.
- Segmented control: `<div inline-flex border rounded-lg p-0.5>` con 3 buttons.
- Active: `bg-brand text-primary-foreground` (sólido brand, blanco texto).
- Inactive: `bg-transparent text-text-secondary hover:bg-bg-elevated`.
- Persistir en localStorage con key `contactship.chat.persona`.

### 9.6 Voice input

**Hook**: `lib/hooks/useVoiceInput.ts` (Web Speech API)
**Componente**: mic button en composer

- Mic button: `<Button variant="ghost" size="lg">` con icon `mic` (o usar Lucide directo por ahora, no hay mic en el DS icon set — agregar `mic` y `micOff` si se justifica).
- Width fijo 44px (square button), al lado del Enviar.
- Estado listening: `variant="secondary"` con `mic-off` icon.
- Listening indicator: banner ARRIBA del composer (no debajo).
  - `bg-brand-subtle border-brand/40` con left dot pulsante (animate-ping + dot sólido sobre).
  - Texto "Escuchando…" en `text-brand-on-subtle`.
  - Interim transcript en italic `text-text-secondary` a continuación, prefijado con comillas.

### 9.7 Resumir filtro AI

**Componente**: `components/contacts/FilterSummaryDialog.tsx`
**Artboard**: "Filter summary (modal)"

- Dialog pattern: icon `sparkles` iconTone brand, title "Análisis del filtro", desc con la query entre comillas.
- Stats bar: `bg-bg-subtle border` con "Analizados: N de M" en mono, y un status indicator a la derecha.
  - Si `analyzed === total` → success dot + "Muestra completa".
  - Si `total > analyzed` → warning dot + "Muestra parcial — los más recientes".
- Summary body: `<div class="prose-like">` con max-height 400px scrolleable.
  - Estructurar la respuesta del modelo en 3 secciones internas (Patrones, Gaps, Próximos pasos) con headings bold en color brand-on-subtle.
- Footer: solo `Cerrar` (ghost). Es read-only.

### 9.8 Dashboard

**Página**: `app/(app)/dashboard/page.tsx` (Server Component)
**Componente**: `components/dashboard/DashboardPriorities.tsx`
**Artboard**: "Dashboard (post-login home)"

Este reemplaza la landing post-login. Layout:
- AppSidebar + topbar con sync badge + avatar.
- Hero: eyebrow mono con fecha + título "Hola, {orgName}" + subtitle con un insight ("Tu base creció 8.4% este mes y tenés 3 oportunidades que merecen atención").
- 3 stat cards (Contactos · Países · Conflictos) — el de Conflictos usa `tone="warning"` si > 0.
  - StatCard: icon-tile 22x22 + label + número grande `text-3xl font-heading` + delta en mono pequeño.
- 2 breakdown cards (por etapa, top países). Bar 4px alto con tonal fill por tier.
- AI Priorities card destacada con `bg-brand-subtle`:
  - Header con icon tile sólido brand + título + meta mono "regenera cada 30 min" + refresh button.
  - 3 rows con número circular brand-subtle + nombre + reason + arrow.
- 2 quick links al final (Chat + Contactos).

Server Action: `getTopPriorities({ forceRefresh })` ya existe. Cachear 30 min en `ai_insights` con `kind='dashboard_priorities'`.
