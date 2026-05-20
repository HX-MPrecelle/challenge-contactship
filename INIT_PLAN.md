# ContactShip — HubSpot Contact Manager
## Master Plan para Claude Code

---

## 🔴 INSTRUCCIONES DE TRABAJO — LEER ANTES DE HACER CUALQUIER COSA

Este documento es el plan maestro de arquitectura y producto. Antes de escribir una sola
línea de código, configurar archivos, instalar dependencias o tomar cualquier decisión
técnica, seguí estas reglas sin excepción:

### Regla 1 — Preguntar antes de asumir

Si algo en este documento es ambiguo, incompleto, contradictorio, o si tenés dudas sobre
cómo implementar algo, **hacé la pregunta primero**. No asumas. No improvises.
No avances con "la interpretación más razonable" sin validarla.

Esto aplica a:
- Decisiones de arquitectura no cubiertas en el plan
- Comportamiento esperado de un feature en un edge case
- Orden de prioridad entre dos tareas
- Cualquier tradeoff que no esté explícitamente resuelto
- Nombres de variables, rutas, componentes o tablas que no estén especificados
- Dudas sobre si algo entra o no en el scope del MVP

### Regla 2 — Agrupar preguntas, no hacer una por una

Si tenés múltiples dudas, **juntálas todas en un solo mensaje** antes de arrancar.
No hagas una pregunta, esperás respuesta, hacés otra, etc.
Listá todas las ambiguedades que encontraste y esperá respuesta a todas juntas.

### Regla 3 — Proponer, no solo preguntar

Cuando hagas una pregunta, incluí tu propuesta de solución.
Formato esperado:

> **Duda**: [descripción del problema o ambigüedad]
> **Mi propuesta**: [cómo lo resolverías vos]
> **¿Lo hacemos así?**

Esto acelera la decisión y muestra razonamiento técnico.

### Regla 4 — No avanzar en paralelo mientras esperás respuesta

Si estás esperando respuesta a una pregunta que bloquea una decisión de arquitectura,
no avances en otras partes del código que dependan de esa decisión.
Avanzá solo en partes que sean completamente independientes, y aclaralo explícitamente.

### Regla 5 — Confirmar el plan completo antes de escribir código

Antes de empezar a codear, presentá un resumen de lo que vas a implementar:
- Qué archivos vas a crear o modificar
- En qué orden
- Qué decisiones tomaste que no estaban explícitas en el plan

Esperá confirmación antes de arrancar.

---

> **Contexto**: Prueba técnica para Lead Engineer @ ContactShip AI.
> Plataforma SaaS/B2B multi-tenant para gestionar contactos de HubSpot desde una app propia,
> con sincronización bidireccional en tiempo real e inteligencia artificial accionable.
> Tiempo disponible: 3 días. Deploy: Vercel. Sin backend separado.

---

## 🎨 Design System

Esta sección es **obligatoria**. Antes de crear cualquier componente, página o elemento
visual, seguir estas definiciones sin excepción. El objetivo es que cualquier pantalla
de la app se vea como si hubiera salido de la misma mano.

La dirección estética es: **SaaS B2B refinado y de alta densidad de información**.
Oscuro por defecto. Tipografía con carácter. Sin gradientes genéricos de IA.
Cada elemento tiene un propósito — nada es decorativo sin razón.

---

### Paleta de colores

Usar exclusivamente estas variables CSS. Nunca hardcodear valores de color.

```css
:root {
  /* ── Backgrounds ───────────────────────────────────────── */
  --bg-base:        #0A0A0F;   /* fondo principal de la app */
  --bg-surface:     #111118;   /* cards, paneles, sidebars */
  --bg-elevated:    #1A1A24;   /* dropdowns, tooltips, modals */
  --bg-subtle:      #1F1F2E;   /* hover states, filas de tabla */

  /* ── Borders ───────────────────────────────────────────── */
  --border-default: #2A2A3D;   /* bordes estándar */
  --border-strong:  #3D3D5C;   /* bordes con énfasis */
  --border-focus:   #6366F1;   /* focus ring */

  /* ── Brand / Accent ────────────────────────────────────── */
  --accent:         #6366F1;   /* indigo — acción principal, links activos */
  --accent-hover:   #4F46E5;   /* hover del accent */
  --accent-subtle:  #1E1E3A;   /* fondos con tinte de accent */

  /* ── Texto ─────────────────────────────────────────────── */
  --text-primary:   #F0F0FF;   /* títulos, contenido principal */
  --text-secondary: #9494B8;   /* labels, metadata, placeholders */
  --text-muted:     #5C5C7A;   /* texto deshabilitado, hints */
  --text-inverse:   #0A0A0F;   /* texto sobre fondos claros */

  /* ── Estados semánticos ────────────────────────────────── */
  --success:        #22C55E;
  --success-subtle: #0F2A1A;
  --warning:        #F59E0B;
  --warning-subtle: #2A1F0A;
  --error:          #EF4444;
  --error-subtle:   #2A0F0F;
  --info:           #3B82F6;
  --info-subtle:    #0F1A2A;

  /* ── Sync status colors ────────────────────────────────── */
  --sync-synced:    #22C55E;   /* verde — sincronizado */
  --sync-pending:   #F59E0B;   /* amarillo — pendiente */
  --sync-conflict:  #EF4444;   /* rojo — conflicto */
  --sync-error:     #EF4444;   /* rojo — error */
}
```

---

### Tipografía

```css
/* Importar en app/layout.tsx via next/font */

/* Display / Headings: Syne — geométrica, tiene carácter sin ser extravagante */
font-family: 'Syne', sans-serif;
/* Pesos disponibles: 400, 500, 600, 700, 800 */

/* Body / UI: DM Sans — legible, moderna, no es Inter */
font-family: 'DM Sans', sans-serif;
/* Pesos disponibles: 300, 400, 500, 600 */

/* Monospace / código / IDs: JetBrains Mono */
font-family: 'JetBrains Mono', monospace;
/* Pesos disponibles: 400, 500 */
```

**Escala tipográfica:**

```
--text-xs:   11px / line-height: 1.4  — badges, labels pequeños
--text-sm:   13px / line-height: 1.5  — metadata, secondary text
--text-base: 14px / line-height: 1.6  — body text estándar de la app
--text-md:   15px / line-height: 1.5  — texto destacado
--text-lg:   18px / line-height: 1.4  — subtítulos de sección
--text-xl:   22px / line-height: 1.3  — títulos de página
--text-2xl:  28px / line-height: 1.2  — headings principales
--text-3xl:  36px / line-height: 1.1  — display / hero text
```

---

### Espaciado

Sistema de 4px base. Usar siempre múltiplos de 4.

```
4px   — gap mínimo entre elementos inline
8px   — padding de badges, gap entre ícono y label
12px  — padding interno de inputs, gap entre elementos relacionados
16px  — padding de cards pequeñas, gap entre secciones inline
20px  — padding estándar de panels y sidebars
24px  — gap entre cards, padding de contenido principal
32px  — separación entre secciones
48px  — separación entre bloques mayores
64px  — separación de hero sections, márgenes de página
```

---

### Componentes base — especificaciones

#### Button

```
Variantes:
  primary   → bg: --accent          text: white          hover: --accent-hover
  secondary → bg: --bg-elevated     text: --text-primary  hover: --bg-subtle    border: --border-default
  ghost     → bg: transparent       text: --text-secondary hover: --bg-subtle
  danger    → bg: --error-subtle    text: --error         hover: bg un tono más oscuro

Tamaños:
  sm  → height: 28px  padding: 0 10px  text: --text-xs  border-radius: 6px
  md  → height: 34px  padding: 0 14px  text: --text-sm  border-radius: 7px  (default)
  lg  → height: 40px  padding: 0 18px  text: --text-base border-radius: 8px

Estados:
  disabled → opacity: 0.4, cursor: not-allowed
  loading  → mostrar spinner de 14px, texto oculto, width fija para no hacer layout shift
  focus    → outline: 2px solid --border-focus, outline-offset: 2px

Nunca usar border-radius mayor a 8px en botones de una app B2B.
```

#### Input / Textarea

```
height: 34px (inputs de una línea)
padding: 0 12px
background: --bg-surface
border: 1px solid --border-default
border-radius: 7px
color: --text-primary
font: --text-sm / DM Sans

focus:
  border-color: --border-focus
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12)
  outline: none

error:
  border-color: --error
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.10)

placeholder: --text-muted

Label: --text-sm / --text-secondary / font-weight: 500
       margin-bottom: 6px
       
Error message: --text-xs / --error / margin-top: 4px
```

#### Card / Panel

```
background: --bg-surface
border: 1px solid --border-default
border-radius: 10px
padding: 20px

Card con hover (clickeable):
  transition: border-color 150ms ease, background 150ms ease
  hover: border-color: --border-strong, background: --bg-elevated

Header de card:
  padding-bottom: 16px
  border-bottom: 1px solid --border-default
  margin-bottom: 16px
```

#### Badge de sync status

```
Estructura: dot de 6px + label
border-radius: 100px (pill)
padding: 2px 8px 2px 6px
font: --text-xs / font-weight: 500

synced:   bg: --success-subtle  color: --success   dot: --success
pending:  bg: --warning-subtle  color: --warning   dot: --warning
conflict: bg: --error-subtle    color: --error     dot: --error  (dot pulsa con CSS animation)
error:    bg: --error-subtle    color: --error     dot: --error
```

#### Tabla de contactos

```
header row:
  background: --bg-elevated
  color: --text-secondary
  font: --text-xs / font-weight: 600 / letter-spacing: 0.05em / uppercase
  height: 36px
  padding: 0 16px
  border-bottom: 1px solid --border-default

data row:
  height: 52px
  padding: 0 16px
  border-bottom: 1px solid --border-default
  color: --text-primary
  font: --text-sm

  hover: background: --bg-subtle, cursor: pointer

  selected: background: --accent-subtle, border-left: 2px solid --accent

columna nombre:
  font-weight: 500
  color: --text-primary

columna metadata (empresa, país, etc.):
  color: --text-secondary

columna sync status:
  Badge component (ver arriba)
```

#### Sidebar

```
width: 220px (desktop), colapsado en mobile
background: --bg-surface
border-right: 1px solid --border-default
padding: 16px 12px

nav item:
  height: 34px
  padding: 0 10px
  border-radius: 7px
  color: --text-secondary
  font: --text-sm / font-weight: 500
  display: flex / align-items: center / gap: 8px

  hover: background: --bg-elevated, color: --text-primary
  active: background: --accent-subtle, color: --accent

ícono: 16px, Lucide icons
```

#### Toast / Notificación inline

```
Usar Sonner (shadcn/ui lo incluye) con estilos customizados:
  success → border-left: 3px solid --success
  error   → border-left: 3px solid --error
  warning → border-left: 3px solid --warning
  info    → border-left: 3px solid --info

background: --bg-elevated
border: 1px solid --border-default
border-radius: 8px
```

---

### Estados visuales obligatorios

Todo componente que cargue datos o ejecute acciones **debe** implementar estos cuatro estados:

```
Loading:  Skeleton con shimmer animation (no spinner global que bloquea la pantalla)
          Skeleton color: --bg-elevated → --bg-subtle (animación de izquierda a derecha)

Empty:    Ilustración SVG simple (no emoji) + título + descripción + CTA si aplica
          Ejemplo: lista de contactos vacía → "Sin contactos importados" + botón "Importar"

Error:    Mensaje específico (no "algo salió mal") + acción de retry si es posible
          Color: --error  Fondo: --error-subtle  border-radius: 8px  padding: 12px 16px

Success:  Toast de Sonner (no modal) + actualización optimista del estado en UI
```

---

### Íconos

Usar exclusivamente **Lucide React** (`lucide-react`). Ya viene incluido con shadcn/ui.
Tamaño estándar: `size={16}` para UI inline, `size={18}` para acciones, `size={20}` para
features prominentes. Nunca mezclar con otros icon sets.

```
Íconos específicos a usar por concepto:
  sync/refresh    → RefreshCw
  conflict        → AlertTriangle
  archived        → Archive
  connected       → Plug
  disconnected    → PlugZap (con color --error)
  AI / insights   → Sparkles
  chat            → MessageSquare
  search          → Search
  edit            → Pencil
  delete/archive  → Trash2
  settings        → Settings2
  user            → User
  org/company     → Building2
  success/check   → CheckCircle2
  error           → XCircle
  warning         → AlertCircle
  hubspot         → usar logo SVG custom (no hay en Lucide)
```

---

### Animaciones y transiciones

```css
/* Transición estándar para hovers, cambios de estado */
transition: all 150ms ease;

/* Para modals, drawers, panels que aparecen */
transition: opacity 200ms ease, transform 200ms ease;
transform inicial: translateY(4px) o translateX(-4px) según dirección

/* Skeleton shimmer */
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
background: linear-gradient(90deg, --bg-elevated 25%, --bg-subtle 50%, --bg-elevated 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;

/* Dot de sync conflict pulsando */
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
animation: pulse-dot 1.5s ease-in-out infinite;

/* NUNCA usar: */
— transition: all 0ms (sin transición)
— animations pesadas que bloqueen interacción
— transform: scale() en elementos que cambian tamaño de layout
```

---

### shadcn/ui — configuración y uso

shadcn/ui es la base del sistema de componentes. Se customiza para que use los tokens
del design system definidos arriba.

```bash
# Inicializar shadcn (una sola vez al crear el proyecto)
npx shadcn@latest init

# Seleccionar en el wizard:
# Style: Default
# Base color: Slate (lo vamos a sobreescribir con nuestros tokens)
# CSS variables: Yes

# Componentes a instalar al inicio del proyecto:
npx shadcn@latest add button input label badge card separator
npx shadcn@latest add dropdown-menu tooltip popover
npx shadcn@latest add dialog sheet  # para modals y drawers
npx shadcn@latest add progress      # para sync progress bar
npx shadcn@latest add sonner        # para toasts
```

**Customización del `globals.css`**: sobreescribir las variables CSS de shadcn con
los tokens del design system definidos arriba. Nunca modificar los archivos internos
de shadcn en `components/ui/` — solo los CSS variables en `globals.css`.

**Cuándo usar shadcn vs componente propio:**
- shadcn: Button, Input, Badge, Card, Dialog, Sheet, Dropdown, Tooltip, Progress, Sonner
- Propio: ContactCard, ContactTimeline, AiInsightsPanel, ConflictBanner, SyncHealthPanel,
          OnboardingStepper, ContactsChat, NaturalLanguageSearch

---

## 📐 Convenciones de código

Estas convenciones aplican a **todos** los archivos del proyecto sin excepción.
Si hay ambigüedad sobre cómo nombrar o estructurar algo, consultar esta sección primero.

---

### Naming conventions

```
Archivos y carpetas:
  kebab-case para todo: contact-detail.tsx, sync-health-panel.tsx
  Excepción: componentes React → PascalCase: ContactDetail.tsx

Componentes React:
  PascalCase: ContactCard, AiInsightsPanel, OnboardingStepper

Server Actions:
  camelCase, verbo + sustantivo: updateContact, importContacts, generateInsights
  Archivo: actions/contacts.ts, actions/ai.ts, etc.

API Routes (Route Handlers):
  El nombre del archivo siempre es route.ts
  La carpeta describe el recurso: /api/webhooks/hubspot/route.ts

Funciones de lib/:
  camelCase, descriptivas: buildContactText, calculateSyncHash, verifyWebhookSignature

Tipos e interfaces:
  PascalCase: Contact, SyncEvent, AiInsight, HubSpotConnection
  Sin prefijo 'I' para interfaces — solo el nombre del concepto

Variables:
  camelCase: orgId, hubspotId, syncStatus
  Constantes de módulo: SCREAMING_SNAKE_CASE: MAX_CONTACTS_PER_BATCH, SYNC_CONFLICT_WINDOW_MS

Database columns → TypeScript:
  snake_case en la DB, camelCase en TypeScript
  El tipo Database de supabase gen types maneja la conversión — usar siempre ese tipo base
```

---

### Estructura de un Server Action

Todo Server Action sigue este patrón exacto. Sin excepción.

```typescript
// actions/contacts.ts
'use server'

import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { getHubSpotClient } from '@/lib/hubspot/client'
import { revalidatePath } from 'next/cache'

// 1. Schema de validación con Zod (siempre, aunque sean pocos campos)
const UpdateContactSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
})

// 2. Tipo de retorno explícito — siempre ActionResult<T>
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

// 3. La función
export async function updateContact(
  input: z.infer<typeof UpdateContactSchema>
): Promise<ActionResult<{ id: string }>> {

  // 4. Validar input
  const parsed = UpdateContactSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos', code: 'VALIDATION_ERROR' }
  }

  // 5. Obtener cliente Supabase (con cookies del request)
  const supabase = await createServerClient()

  // 6. Verificar sesión — SIEMPRE getUser(), nunca getSession()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'No autorizado', code: 'UNAUTHORIZED' }
  }

  const orgId = user.user_metadata.org_id as string

  try {
    // 7. Lógica de negocio
    const hubspot = await getHubSpotClient(orgId)
    // ... actualizar en HubSpot y Supabase

    // 8. Revalidar solo las rutas afectadas
    revalidatePath(`/contacts/${parsed.data.id}`)

    return { success: true, data: { id: parsed.data.id } }

  } catch (error) {
    // 9. Errores tipados con código — nunca exponer stack traces
    if (error instanceof HubSpotRateLimitError) {
      return { success: false, error: 'HubSpot rate limit alcanzado. Intentá en unos segundos.', code: 'RATE_LIMIT' }
    }
    if (error instanceof HubSpotAuthError) {
      return { success: false, error: 'La conexión con HubSpot expiró. Reconectá tu cuenta.', code: 'HS_AUTH_ERROR' }
    }
    console.error('[updateContact]', error)
    return { success: false, error: 'Error inesperado al actualizar el contacto', code: 'INTERNAL_ERROR' }
  }
}
```

---

### Manejo de errores — clases custom

Crear en `lib/errors.ts`. Usar en todo el código — nunca `throw new Error('string genérico')`.

```typescript
// lib/errors.ts

export class HubSpotAuthError extends Error {
  constructor(message = 'Token de HubSpot inválido o expirado') {
    super(message)
    this.name = 'HubSpotAuthError'
  }
}

export class HubSpotRateLimitError extends Error {
  retryAfter?: number
  constructor(retryAfter?: number) {
    super('HubSpot rate limit alcanzado')
    this.name = 'HubSpotRateLimitError'
    this.retryAfter = retryAfter
  }
}

export class SyncConflictError extends Error {
  localState: unknown
  remoteState: unknown
  constructor(localState: unknown, remoteState: unknown) {
    super('Conflicto de sincronización detectado')
    this.name = 'SyncConflictError'
    this.localState = localState
    this.remoteState = remoteState
  }
}

export class WebhookVerificationError extends Error {
  constructor(reason: string) {
    super(`Verificación de webhook fallida: ${reason}`)
    this.name = 'WebhookVerificationError'
  }
}
```

---

### Estructura de tipos

```typescript
// types/index.ts

// Importar tipos generados por Supabase como base
import type { Database } from './database'  // generado por supabase gen types

// Tipo base de la DB
export type ContactRow = Database['public']['Tables']['contacts']['Row']
export type ContactInsert = Database['public']['Tables']['contacts']['Insert']
export type ContactUpdate = Database['public']['Tables']['contacts']['Update']

// Tipo enriquecido para la UI (el que se usa en componentes)
export type Contact = ContactRow & {
  // campos calculados o joins que no vienen solos de la DB
  aiInsights?: AiInsight[]
  syncEvents?: SyncEvent[]
}

// Nunca definir tipos manualmente para lo que ya genera Supabase.
// Nunca usar 'any'. Si no se sabe el tipo, usar 'unknown' y narrowing.
// Preferir 'type' sobre 'interface' para consistencia (salvo para extensión de objetos externos).
```

---

### Imports — orden y alias

```typescript
// Orden de imports (enforceado por el linter):
// 1. React y Next.js
// 2. Librerías externas
// 3. Imports internos con alias @/
// 4. Tipos (import type)
// 5. Assets

// Ejemplo correcto:
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/ssr'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AiInsightsPanel } from '@/components/contacts/AiInsightsPanel'
import { updateContact } from '@/actions/contacts'
import type { Contact } from '@/types'

// tsconfig.json paths (ya configurado por create-next-app):
// "@/*": ["./*"]
// Nunca usar rutas relativas con más de un nivel: '../../lib/...' → '@/lib/...'
```

---

### Comentarios y documentación inline

```typescript
// ✅ Comentar el POR QUÉ, no el QUÉ
// Respondemos 200 aunque falle el procesamiento interno
// porque HubSpot reintenta en 429/5xx y eso generaría duplicados
return new Response('OK', { status: 200 })

// ❌ Comentario que describe lo obvio — innecesario
// Retorna 200
return new Response('OK', { status: 200 })

// Usar JSDoc solo en funciones públicas de lib/ que no son obvias
/**
 * Calcula el hash SHA-256 del payload de propiedades de HubSpot normalizado.
 * El hash se usa para detectar webhooks duplicados (at-least-once delivery).
 * Las propiedades se ordenan alfabéticamente antes de hashear para garantizar
 * determinismo independientemente del orden en que HubSpot las envíe.
 */
export function calculateSyncHash(properties: Record<string, unknown>): string { ... }
```

---

### TypeScript — reglas estrictas

El `tsconfig.json` debe tener estas opciones activas:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Reglas que no se negocian:
- **Sin `any`**. Si el tipo es desconocido → `unknown` + type guard.
- **Sin non-null assertions (`!`)** salvo que sea imposible que sea null y se comenta por qué.
- **Sin `@ts-ignore`**. Si hay que ignorar un error de TS, usar `@ts-expect-error` con comentario.
- **Todos los `Promise` deben ser awaited** o manejados explícitamente.
- **Return types explícitos** en todas las funciones exportadas de `lib/` y `actions/`.

---

## ⚙️ Patrones de Next.js App Router

Esta sección define cómo usar Next.js correctamente en este proyecto.
Seguir estos patrones evita el 90% de los bugs comunes con el App Router.

---

### Server Component vs Client Component

**Regla**: todo es Server Component por defecto. Agregar `'use client'` solo cuando
hay una razón específica de las siguientes:

```
Agregar 'use client' solo si el componente necesita:
  ✓ useState, useReducer, useEffect, useRef, useContext
  ✓ Event listeners del browser (onClick en lógica compleja, onScroll, etc.)
  ✓ Supabase Realtime (suscripciones WebSocket)
  ✓ Librerías que usan APIs del browser (window, document, localStorage)
  ✓ Animaciones controladas por JS (no CSS puro)

NO agregar 'use client' solo porque:
  ✗ "El componente tiene onClick" — onClick en un button dentro de un SC está bien
     si el handler es un Server Action
  ✗ "Necesito pasar datos como props" — los SC pueden recibir props
  ✗ "Es un componente de UI" — la mayoría de UI puede ser SC
```

**Patrón correcto: Server Component wrapper + Client Component para interactividad**

```typescript
// app/contacts/[id]/page.tsx — SERVER COMPONENT
// Hace el fetch, no tiene estado
import { ContactDetail } from '@/components/contacts/ContactDetail'
import { ContactTimeline } from '@/components/contacts/ContactTimeline'
import { AiInsightsPanel } from '@/components/contacts/AiInsightsPanel'

export default async function ContactPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const { data: contact } = await supabase
    .from('contacts')
    .select('*, sync_events(*), ai_insights(*)')
    .eq('id', params.id)
    .single()

  if (!contact) notFound()

  return (
    <div className="...">
      <ContactDetail contact={contact} />       {/* Client Component — edición inline */}
      <ContactTimeline events={contact.sync_events} />  {/* Server Component — solo display */}
      <AiInsightsPanel contactId={contact.id} />        {/* Client Component — fetch on demand */}
    </div>
  )
}
```

---

### Fetch de datos — reglas

```typescript
// ✅ En Server Components: fetch directo con el server client de Supabase
// No usar useEffect + fetch en el cliente para datos iniciales
const supabase = await createServerClient()
const { data, error } = await supabase.from('contacts').select('*')

// ✅ En Client Components: solo para datos reactivos o on-demand
// (después de una acción del usuario, o suscripciones Realtime)
// Usar Server Actions para mutaciones — nunca fetch('/api/...') desde el cliente
// salvo para el chat con streaming

// ❌ Nunca:
useEffect(() => {
  fetch('/api/contacts').then(...)  // patrón antiguo, no usar en App Router
}, [])
```

---

### Loading y Suspense

```typescript
// Cada segmento de ruta que cargue datos debe tener su loading.tsx
// app/contacts/loading.tsx
export default function Loading() {
  return <ContactListSkeleton />  // Skeleton específico, no spinner genérico
}

// app/contacts/[id]/loading.tsx
export default function Loading() {
  return <ContactDetailSkeleton />
}

// Para loading parcial dentro de una página: usar <Suspense>
<Suspense fallback={<AiInsightsSkeleton />}>
  <AiInsightsPanel contactId={id} />
</Suspense>
```

---

### Error handling en rutas

```typescript
// app/contacts/error.tsx — captura errores de Server Components y Server Actions
'use client'  // error.tsx siempre es Client Component

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="...">
      <p>Error al cargar los contactos</p>
      <button onClick={reset}>Reintentar</button>
    </div>
  )
}
```

---

### Server Actions en Client Components — patrón con feedback

```typescript
// components/contacts/ContactForm.tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { updateContact } from '@/actions/contacts'

export function ContactForm({ contact }: { contact: Contact }) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateContact({
        id: contact.id,
        firstName: formData.get('firstName') as string,
        // ...
      })

      if (!result.success) {
        toast.error(result.error)  // Mensaje específico del error
        return
      }

      toast.success('Contacto actualizado')
      // No hace falta redirect ni reload — revalidatePath en el Server Action
      // hace el refresh del Server Component automáticamente
    })
  }

  return (
    <form action={handleSubmit}>
      {/* ... */}
      <Button type="submit" loading={isPending}>
        Guardar cambios
      </Button>
    </form>
  )
}
```

---

### Middleware — sesión y protección de rutas

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Siempre crear un response mutable para poder setear cookies
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRÍTICO: getUser() refresca el token automáticamente
  // Nunca usar getSession() en el middleware
  const { data: { user } } = await supabase.auth.getUser()

  const isPublicRoute = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/auth/')
    || request.nextUrl.pathname.startsWith('/api/webhooks/')  // webhooks son públicos (tienen su propia auth)

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/contacts', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}
```

---

### Variables de entorno — acceso correcto

```typescript
// En Server Components, Server Actions, Route Handlers, lib/:
process.env.SUPABASE_SERVICE_ROLE_KEY   // ✅ solo server
process.env.HUBSPOT_CLIENT_SECRET       // ✅ solo server
process.env.OPENAI_API_KEY              // ✅ solo server

// En Client Components:
process.env.NEXT_PUBLIC_SUPABASE_URL    // ✅ prefijo NEXT_PUBLIC_
process.env.NEXT_PUBLIC_APP_URL         // ✅ prefijo NEXT_PUBLIC_

// NUNCA en Client Components:
process.env.SUPABASE_SERVICE_ROLE_KEY   // ❌ se expone al browser
process.env.OPENAI_API_KEY              // ❌ se expone al browser

// En lib/supabase/server.ts — siempre con ! porque sabemos que existen
// o con validación al inicio de la app
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
```

---

### Vercel Cron — autenticación del endpoint

```typescript
// app/api/cron/sync/route.ts
export async function GET(request: Request) {
  // Vercel inyecta este header automáticamente cuando llama al cron
  // CRON_SECRET se define en las env vars de Vercel
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ...
}

// vercel.json
{
  "crons": [{ "path": "/api/cron/sync", "schedule": "0 * * * *" }]
}
```

Agregar `CRON_SECRET` a `.env.example` y a la documentación de setup.

---

## Stack definitivo

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | Next.js 15 App Router | Monolito justificable, Server Actions + API Routes |
| Lenguaje | TypeScript strict | Requerimiento del equipo, type-safety end-to-end |
| Base de datos | Supabase (Postgres) | RLS multi-tenant nativo, Realtime incluido, Vault para tokens |
| Auth | Supabase Auth — Magic Link (OTP) | Identidad desacoplada de la integración HubSpot |
| Integración CRM | HubSpot OAuth — paso del onboarding | HubSpot es una integración, no el IDP |
| Realtime UI | Supabase Realtime (`postgres_changes`) | WebSocket nativo, no polling |
| Sync HubSpot | HubSpot CRM API v3 + Webhooks | Push > pull, idempotente |
| IA | OpenAI API — `gpt-4o-mini` | Costo bajo, suficiente para el caso de uso |
| Deploy | Vercel | Integración nativa con Next.js |
| Dev webhooks | ngrok | Túnel local para recibir webhooks en desarrollo |

---

## Decisión de autenticación — por qué Magic Link y no "Login con HubSpot"

**Identidad e integración son conceptos distintos y deben tratarse por separado.**

Login con HubSpot OAuth parece simple al principio, pero introduce tres problemas reales:

1. **Acoplamiento duro**: si el token de HubSpot expira o se revoca, el usuario pierde el
   acceso a la app. Son ciclos de vida independientes que no deben estar acoplados.

2. **Multi-usuario por organización no escala**: en un SaaS B2B, varios usuarios de la misma
   empresa comparten la misma cuenta HubSpot. Con "login = HubSpot OAuth", no hay forma limpia
   de que el segundo usuario de la empresa se autentique sin lógica ad-hoc para compartir tokens.

3. **Lock-in de integración**: si mañana se agrega Salesforce o Pipedrive como segunda
   integración, el sistema de auth ya no sirve. La identidad quedaría atada a un proveedor de CRM.

**Solución elegida**: Magic Link de Supabase Auth como mecanismo de identidad.
HubSpot OAuth como paso del onboarding (integración, no autenticación).

Para defender en la entrevista:
> *"Separé la identidad de la integración deliberadamente. El login es con magic link —
> sin fricción, sin contraseñas que gestionar. La conexión con HubSpot es un paso del
> onboarding, no el mecanismo de autenticación. Esto permite múltiples usuarios por
> organización, que el sistema funcione aunque el token de HubSpot expire, y que mañana
> se agregue Salesforce sin tocar el sistema de auth."*

---

## Variables de entorno requeridas

Crear `.env.local` en la raíz del proyecto con todas estas variables.
En Vercel, configurar las mismas en el panel de Environment Variables.

```bash
# ─── Supabase ───────────────────────────────────────────────────────────────
# Obtenidas desde: supabase.com → proyecto → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...           # clave pública, va al cliente
SUPABASE_SERVICE_ROLE_KEY=eyJ...               # clave privada, NUNCA al cliente

# ─── HubSpot OAuth App ──────────────────────────────────────────────────────
# Obtenidas desde: developers.hubspot.com → Apps → tu app → Auth tab
HUBSPOT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_CLIENT_SECRET=yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy

# El client secret también se usa para verificar la firma de webhooks (v3)
# NO crear una variable separada HUBSPOT_WEBHOOK_SECRET — es el mismo CLIENT_SECRET
# Ver: https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests

# ─── HubSpot Redirect URI ────────────────────────────────────────────────────
# Debe estar registrada en: tu app HubSpot → Auth → Redirect URLs
# En desarrollo (con ngrok): https://xxxx.ngrok-free.app/api/hubspot/callback
# En producción: https://tu-app.vercel.app/api/hubspot/callback
# NOTA: esta ruta es DIFERENTE al callback de Supabase Auth (/auth/callback)
HUBSPOT_REDIRECT_URI=https://tu-app.vercel.app/api/hubspot/callback

# ─── OpenAI ─────────────────────────────────────────────────────────────────
# Obtenida desde: platform.openai.com → API Keys
OPENAI_API_KEY=sk-...

# ─── App ────────────────────────────────────────────────────────────────────
# URL pública de la app (sin trailing slash)
# En desarrollo con ngrok: la URL de ngrok
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

### Notas críticas sobre las env vars

**`HUBSPOT_CLIENT_SECRET` = secreto del webhook**
HubSpot usa el mismo `client_secret` de la OAuth app para firmar los webhooks con HMAC-SHA256.
No hay un secreto de webhook separado. La verificación usa `X-HubSpot-Signature-v3` +
`X-HubSpot-Request-Timestamp`.

**`SUPABASE_SERVICE_ROLE_KEY` nunca al cliente**
Esta clave bypasea RLS. Solo se usa en Server Actions, API Routes y funciones del servidor.
Nunca anteponerle `NEXT_PUBLIC_`.

**`NEXT_PUBLIC_SUPABASE_ANON_KEY` es pública por diseño**
Se usa en Client Components para el cliente de browser de Supabase. RLS protege los datos.

**Dos callbacks OAuth distintos, no confundirlos**
- `/auth/callback` → callback de Supabase Auth (magic link email confirmation)
- `/api/hubspot/callback` → callback de HubSpot OAuth (conectar la integración)

---

## Configuración de Supabase Auth — Magic Link

En el Dashboard de Supabase → Authentication → Settings:
- **Email Auth**: habilitado
- **Magic Link**: habilitado (es OTP por email, sin contraseña)
- **Confirm email**: habilitado (el magic link actúa como confirmación)
- **Site URL**: `https://tu-app.vercel.app`
- **Redirect URLs**: agregar `https://tu-app.vercel.app/auth/callback`

En Authentication → Email Templates → "Magic Link":
Personalizar el asunto y cuerpo si se quiere branding propio.

El flujo de Supabase Auth con magic link no requiere ninguna configuración adicional
en el proveedor. Todo ocurre dentro de Supabase.

---

## Configuración de HubSpot — paso a paso

### 1. Crear la OAuth App en HubSpot

1. Ir a `developers.hubspot.com` → crear Developer Account (gratis, separado del CRM account)
2. Apps → Create app
3. En la tab **Auth**:
   - Redirect URL: `https://tu-app.vercel.app/api/hubspot/callback`
   - También agregar la URL de ngrok para desarrollo
4. Copiar `Client ID` y `Client Secret`

### 2. Scopes requeridos (configurar en la OAuth app)

Los scopes se configuran en la tab **Auth** de la app en HubSpot Developer Portal.
Todos los que se usan en webhooks deben estar marcados como **Required**.

```
crm.objects.contacts.read      ← Required (leer contactos + recibir webhooks)
crm.objects.contacts.write     ← Required (crear/editar/archivar contactos)
oauth                          ← Required (siempre obligatorio)
```

El scope `crm.objects.contacts.read` marcado como Required es obligatorio para recibir
webhooks de contactos. Sin él, HubSpot no entregará los eventos.

### 3. Configurar Webhooks en HubSpot

En tu app → **Webhooks** tab:
- Target URL: `https://tu-app.vercel.app/api/webhooks/hubspot`
- Suscribir a estos eventos:
  - `contact.creation`
  - `contact.deletion`
  - `contact.propertyChange` (con `propertyName` vacío para capturar todos los cambios)

Los webhooks son a nivel de app, no por cuenta. Todos los portales que instalen tu app
enviarán eventos al mismo endpoint. El `portalId` en el payload identifica de cuál viene.

### 4. Campos de contacto usados

La app trabaja con estas propiedades de HubSpot (`/crm/v3/objects/contacts`):

```
firstname, lastname, email, phone
company, jobtitle, lifecyclestage
hs_lead_status, hubspot_owner_id
website, city, country
hs_lastmodifieddate, createdate
```

Los campos custom de un portal se capturan en `properties JSONB` de la tabla `contacts`.

---

## Configuración de Supabase — base de datos

### 1. Crear proyecto

En `supabase.com` → New project. Anotar URL y keys.

### 2. Habilitar Realtime para la tabla `contacts`

En Supabase Dashboard → Database → Replication → supabase_realtime publication.
Agregar la tabla `contacts` a la publicación. Sin esto, los cambios no llegan al cliente vía WebSocket.

Alternativamente, via SQL (incluido en la migration 003):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
```

### 3. Supabase Vault para tokens HubSpot

Vault viene habilitado por defecto en proyectos Supabase Cloud.
Se usa para guardar los `access_token` y `refresh_token` de HubSpot encriptados en la DB.

Los tokens de HubSpot se almacenan via `vault.create_secret()` y se referencian
por UUID en la tabla `hubspot_connections`. Nunca se guardan en texto plano.

**Importante**: Al insertar secrets via SQL directo, el statement queda en logs.
Usar siempre la función wrapper (ver migrations) o el dashboard de Supabase.

---

## Modelo de datos — Migraciones SQL

Crear en `/supabase/migrations/` en orden numérico.

### `001_organizations.sql`

```sql
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Dominio de email para auto-join de usuarios del mismo equipo
  email_domain text,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

create policy "users see own org"
  on organizations for select
  using (
    id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
```

### `002_hubspot_connections.sql`

```sql
create table hubspot_connections (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null references organizations(id) on delete cascade,
  portal_id            text not null,          -- HubSpot Hub ID
  portal_name          text,                   -- nombre del portal HubSpot (para mostrar en UI)
  access_token_secret  uuid,                   -- referencia a vault.secrets (UUID del secret)
  refresh_token_secret uuid,                   -- referencia a vault.secrets (UUID del secret)
  token_expires_at     timestamptz,
  scopes               text[],                 -- scopes autorizados por el usuario
  connected_by         uuid references auth.users(id),  -- usuario que hizo el OAuth
  connected_at         timestamptz not null default now(),
  last_synced_at       timestamptz,
  needs_reconnect      boolean not null default false,  -- true si el refresh falló

  unique(org_id)       -- una org = una conexión HubSpot activa
);

alter table hubspot_connections enable row level security;

create policy "users manage own connection"
  on hubspot_connections for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
```

### `003_contacts.sql`

```sql
create table contacts (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references organizations(id) on delete cascade,
  hubspot_id       text not null,

  -- Campos core promovidos a columnas tipadas
  email            text,
  first_name       text,
  last_name        text,
  phone            text,
  company          text,
  job_title        text,
  lifecycle_stage  text,
  lead_status      text,
  website          text,
  city             text,
  country          text,

  -- Campos custom / adicionales del portal HubSpot (schema flexible)
  properties       jsonb not null default '{}',

  -- Metadata de sync
  hubspot_updated_at  timestamptz,   -- timestamp que HubSpot reporta como última modificación
  local_updated_at    timestamptz not null default now(),
  sync_hash           text,          -- SHA-256 del payload normalizado (idempotencia)
  sync_status         text not null default 'synced'
                        check (sync_status in ('synced', 'pending', 'conflict', 'error')),
  is_archived         boolean not null default false,  -- soft delete si se borra en HubSpot

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique(org_id, hubspot_id)
);

-- Índices para queries frecuentes
create index contacts_org_id_idx       on contacts(org_id);
create index contacts_email_idx        on contacts(org_id, email);
create index contacts_sync_status_idx  on contacts(org_id, sync_status);
create index contacts_is_archived_idx  on contacts(org_id, is_archived);
create index contacts_lifecycle_idx    on contacts(org_id, lifecycle_stage);

-- Trigger para updated_at automático
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_updated_at
  before update on contacts
  for each row execute function update_updated_at();

-- RLS
alter table contacts enable row level security;

create policy "users manage own contacts"
  on contacts for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );

-- Habilitar Realtime para push automático al cliente
alter publication supabase_realtime add table contacts;
```

### `004_sync_events.sql`

```sql
-- Log inmutable de todas las operaciones de sync (audit trail)
create table sync_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  contact_id   uuid references contacts(id) on delete set null,
  hubspot_id   text,

  direction    text not null check (direction in ('hubspot_to_local', 'local_to_hubspot')),
  event_type   text not null check (event_type in ('create', 'update', 'delete', 'conflict', 'skip')),

  -- Snapshot del estado antes y después para auditoría
  before_state jsonb,
  after_state  jsonb,

  error_message text,
  created_at   timestamptz not null default now()
);

create index sync_events_org_contact_idx on sync_events(org_id, contact_id);
create index sync_events_created_at_idx  on sync_events(created_at desc);

-- Solo lectura para usuarios (es un audit log, no se edita)
alter table sync_events enable row level security;

create policy "users read own sync events"
  on sync_events for select
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
```

### `005_ai_insights.sql`

```sql
create table ai_insights (
  id             uuid primary key default gen_random_uuid(),
  contact_id     uuid not null references contacts(id) on delete cascade,
  org_id         uuid not null references organizations(id) on delete cascade,

  insight_type   text not null check (insight_type in (
    'summary',      -- resumen contextual del contacto
    'next_action',  -- acción concreta recomendada
    'risk_signal',  -- señal de riesgo (lead frío, sin actividad, etc.)
    'lead_score'    -- puntuación 0-100
  )),

  content        text not null,
  model_version  text not null default 'gpt-4o-mini',
  generated_at   timestamptz not null default now(),
  expires_at     timestamptz not null,           -- TTL 24hs desde generated_at
  is_stale       boolean not null default false  -- invalidado si el contacto se actualizó
);

create index ai_insights_contact_idx on ai_insights(contact_id, insight_type);
create index ai_insights_expires_idx on ai_insights(expires_at);

alter table ai_insights enable row level security;

create policy "users see own insights"
  on ai_insights for all
  using (
    org_id = (auth.jwt() -> 'user_metadata' ->> 'org_id')::uuid
  );
```

### `006_embeddings.sql`

```sql
-- Habilitar pgvector (viene incluido en Supabase Cloud)
create extension if not exists vector;

-- Agregar columna de embedding a contacts
-- text-embedding-3-small de OpenAI produce vectores de 1536 dimensiones
alter table contacts
  add column embedding vector(1536);

-- Índice IVFFlat para búsqueda aproximada por similitud coseno
-- lists=100 es razonable para hasta ~1M de filas; para el MVP con 50 contactos
-- cualquier valor funciona — lo dejamos preparado para escalar
create index contacts_embedding_idx
  on contacts
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Función helper para similarity search por org
-- Llamada desde lib/ai/chat.ts como supabase.rpc('match_contacts', {...})
create or replace function match_contacts(
  query_embedding  vector(1536),
  match_org_id     uuid,
  match_threshold  float default 0.5,
  match_count      int   default 20
)
returns table (
  id              uuid,
  first_name      text,
  last_name       text,
  email           text,
  company         text,
  job_title       text,
  lifecycle_stage text,
  lead_status     text,
  country         text,
  local_updated_at timestamptz,
  sync_status     text,
  similarity      float
)
language sql stable
as $$
  select
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.company,
    c.job_title,
    c.lifecycle_stage,
    c.lead_status,
    c.country,
    c.local_updated_at,
    c.sync_status,
    1 - (c.embedding <=> query_embedding) as similarity
  from contacts c
  where
    c.org_id = match_org_id
    and c.is_archived = false
    and c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

**Cuándo se genera el embedding de cada contacto:**
Al sincronizar un contacto (create o update), generar el texto representativo y llamar
a `text-embedding-3-small`. Guardar el vector resultante en `contacts.embedding`.
Si el contacto no tiene embedding todavía (contactos importados antes de implementar
esta feature), se genera lazy al primer acceso al chat.

**Texto representativo para embeddear:**
```typescript
function buildContactText(contact: Contact): string {
  return [
    `${contact.first_name} ${contact.last_name}`,
    contact.job_title && `Cargo: ${contact.job_title}`,
    contact.company && `Empresa: ${contact.company}`,
    contact.lifecycle_stage && `Etapa: ${contact.lifecycle_stage}`,
    contact.lead_status && `Estado: ${contact.lead_status}`,
    contact.country && `País: ${contact.country}`,
    contact.email && `Email: ${contact.email}`,
  ].filter(Boolean).join('. ')
}
// Ejemplo output:
// "Juan Pérez. Cargo: VP de Ventas. Empresa: Fintech SA.
//  Etapa: negotiation. Estado: in_progress. País: Argentina."
```

---

## Estructura del proyecto

```
/
├── app/
│   ├── (auth)/                               ← Rutas públicas (sin sesión requerida)
│   │   ├── login/
│   │   │   └── page.tsx                      ← Input de email → envía magic link
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts                  ← GET: Supabase confirma el magic link
│   │                                            Crea/encuentra org, setea user_metadata
│   │                                            Redirect a /onboarding o /contacts
│   │
│   ├── (app)/                                ← Rutas protegidas (middleware valida sesión)
│   │   ├── layout.tsx                        ← Layout con sidebar, header, estado de conexión
│   │   ├── onboarding/
│   │   │   └── page.tsx                      ← Stepper: bienvenida → conectar HubSpot
│   │   │                                        → seleccionar contactos → sync inicial
│   │   ├── contacts/
│   │   │   ├── page.tsx                      ← Lista de contactos (Server Component + Realtime)
│   │   │   └── [id]/
│   │   │       └── page.tsx                  ← Detalle con edición inline + AI Panel
│   │   └── settings/
│   │       └── page.tsx                      ← Estado conexión HubSpot, reconectar, desconectar
│   │                                            + panel de salud del sync (conflictos, errores, último sync)
│   │
│   └── api/
│       ├── hubspot/
│       │   ├── connect/
│       │   │   └── route.ts                  ← GET: inicia HubSpot OAuth (usuario ya autenticado)
│       │   └── callback/
│       │       └── route.ts                  ← GET: recibe code de HubSpot, guarda tokens en Vault
│       ├── cron/
│       │   └── sync/
│       │       └── route.ts                  ← GET: delta sync periódico (Vercel Cron, cada 1h)
│       │                                        Fallback si los webhooks fallaron
│       └── webhooks/
│           └── hubspot/
│               └── route.ts                  ← POST: recibe eventos de HubSpot
│
├── lib/
│   ├── hubspot/
│   │   ├── client.ts                         ← HubSpot API wrapper con auto-refresh de token
│   │   ├── contacts.ts                       ← CRUD de contactos contra HubSpot API
│   │   ├── sync.ts                           ← Sync engine (hash, conflict detection, upsert)
│   │   └── webhooks.ts                       ← Verificación HMAC-SHA256 v3 + parser de eventos
│   ├── ai/
│   │   ├── insights.ts                       ← Contact Intelligence (summary, next action, risk)
│   │   ├── search.ts                         ← Natural language → filtros Supabase
│   │   └── chat.ts                           ← RAG pipeline: embed query → similarity search → GPT
│   └── supabase/
│       ├── client.ts                         ← createBrowserClient (@supabase/ssr)
│       ├── server.ts                         ← createServerClient (@supabase/ssr + cookies)
│       └── middleware.ts                     ← updateSession para refresh de token
│
├── components/
│   ├── contacts/
│   │   ├── ContactList.tsx                   ← Lista con estados de sync
│   │   ├── ContactCard.tsx                   ← Card con badge de sync_status
│   │   ├── ContactDetail.tsx                 ← Vista detalle con edición inline
│   │   ├── ContactForm.tsx                   ← Formulario de edición (campos core + custom)
│   │   ├── ContactTimeline.tsx               ← Timeline de sync_events del contacto
│   │   ├── ConflictBanner.tsx                ← UI de resolución de conflicto bidireccional
│   │   ├── AiInsightsPanel.tsx               ← Panel lateral de AI (summary, next action, score)
│   │   └── NaturalLanguageSearch.tsx         ← Search input con soporte AI
│   ├── chat/
│   │   └── ContactsChat.tsx                  ← Chat RAG ('use client', streaming, contexto de contactos)
│   ├── sync/
│   │   └── SyncHealthPanel.tsx               ← Panel de salud: conflictos, errores, último sync
│   ├── onboarding/
│   │   └── OnboardingStepper.tsx             ← Stepper 4 pasos con validación por paso
│   ├── realtime/
│   │   └── ContactsRealtimeSync.tsx          ← 'use client': suscribe a postgres_changes
│   └── ui/                                   ← shadcn/ui como base del design system
│
├── actions/                                  ← Server Actions (mutaciones UI → servidor)
│   ├── contacts.ts                           ← createContact, updateContact, deleteContact
│   ├── hubspot.ts                            ← disconnectHubSpot, selectContactsToSync
│   ├── ai.ts                                ← generateInsights, naturalLanguageSearch
│   └── chat.ts                              ← sendChatMessage (RAG: embed → search → stream)
│
├── types/
│   └── index.ts                              ← Tipos globales + Database types (supabase gen types)
│
├── middleware.ts                             ← Protección de rutas + refresh de sesión Supabase
├── vercel.json                               ← Configuración de Vercel Cron (delta sync cada 1h)
│
└── supabase/
    └── migrations/
        ├── 001_organizations.sql
        ├── 002_hubspot_connections.sql
        ├── 003_contacts.sql
        ├── 004_sync_events.sql
        ├── 005_ai_insights.sql
        └── 006_embeddings.sql
```

---

## Flujos de autenticación e integración

### Flujo A — Registro / Login (Supabase Magic Link)

```
1. Usuario va a /login
2. Ingresa su email → click "Enviar magic link"
3. Server Action llama supabase.auth.signInWithOtp({ email })
   Supabase envía el email con el link de confirmación

4. Usuario hace click en el link del email
5. GET /auth/callback?token_hash=...&type=email
   Route Handler:
   → supabase.auth.verifyOtp({ token_hash, type: 'email' })
   → sesión creada

6. Lógica de org en el callback:
   → Si primer login: crear organization con email_domain del email
                      setear user_metadata: { org_id, onboarding_complete: false }
   → Si ya existe org con ese dominio: unir al usuario a esa org
                      (auto-join por dominio para multi-usuario)
   → updateUser({ data: { org_id } })

7. Redirect:
   → Si onboarding_complete = false → /onboarding
   → Si onboarding_complete = true  → /contacts
```

### Flujo B — Conectar HubSpot (onboarding paso 2, usuario ya autenticado)

```
1. Usuario en /onboarding hace click "Conectar HubSpot"
2. GET /api/hubspot/connect
   → verificar sesión activa (usuario debe estar logueado)
   → generar nonce, guardarlo en cookie httpOnly como state anti-CSRF
   → redirect a:
     https://app.hubspot.com/oauth/authorize
       ?client_id=...
       &scope=crm.objects.contacts.read%20crm.objects.contacts.write%20oauth
       &redirect_uri=.../api/hubspot/callback
       &state=<nonce>

3. Usuario aprueba en HubSpot
4. GET /api/hubspot/callback?code=...&state=...
   → validar state vs cookie (anti-CSRF)
   → POST https://api.hubapi.com/oauth/v1/token
       { grant_type: 'authorization_code', client_id, client_secret, code, redirect_uri }
   → recibir { access_token, refresh_token, expires_in, hub_id }

   → guardar tokens en Supabase Vault:
       access_secret_id  = await vault.create_secret(access_token)
       refresh_secret_id = await vault.create_secret(refresh_token)

   → upsert en hubspot_connections:
       { org_id: user.org_id, portal_id: hub_id,
         access_token_secret: access_secret_id,
         refresh_token_secret: refresh_secret_id,
         token_expires_at: now + expires_in,
         connected_by: user.id }

   → redirect a /onboarding?step=3
```

**Punto clave**: el callback de HubSpot usa la sesión Supabase del usuario actual
para saber a qué `org_id` asociar la conexión. El usuario ya está logueado cuando
conecta HubSpot. No hay creación de usuario en este paso.

### Flujo C — Refresh automático del token HubSpot

```
En lib/hubspot/client.ts, antes de cada request a la API de HubSpot:

1. Leer token_expires_at de hubspot_connections
2. Si expires_in < 5 minutos:
   → leer refresh_token de Vault (vault.decrypted_secrets)
   → POST https://api.hubapi.com/oauth/v1/token
       { grant_type: 'refresh_token', client_id, client_secret, refresh_token }
   → Si éxito:
       actualizar vault.secrets con nuevos tokens
       actualizar token_expires_at en hubspot_connections
   → Si falla (refresh token inválido):
       needs_reconnect = true en hubspot_connections
       throw HubSpotAuthError → banner en UI pidiendo reconectar
```

### Flujo D — Login de usuario existente

```
Igual que Flujo A, pero en el paso 6:
→ La org ya existe
→ El user_metadata ya tiene org_id
→ onboarding_complete = true
→ Redirect directo a /contacts
```

---

## Sincronización bidireccional

### HubSpot → App (webhook)

```
POST /api/webhooks/hubspot

1. VERIFICACIÓN DE FIRMA (rechazar si falla — 403):
   headers requeridos: X-HubSpot-Signature-v3, X-HubSpot-Request-Timestamp
   
   a. Rechazar si timestamp > 5 minutos de now()
   b. Construir string a firmar:
      sourceString = METHOD + fullURI + rawBody + timestamp
      (fullURI = URL completa incluyendo query string, con caracteres URL-encoded)
   c. hash = HMAC-SHA256(HUBSPOT_CLIENT_SECRET, sourceString) → Base64
   d. Comparar con X-HubSpot-Signature-v3 usando timingSafeEqual (evitar timing attacks)
   e. Si no coincide → 403

2. Responder 200 inmediatamente
   (HubSpot tiene timeout corto — procesar rápido o responder antes de procesar)

3. Procesar cada evento del array payload:
   a. Extraer portalId → buscar org en hubspot_connections
   b. Si portalId no existe → skip (no es un cliente registrado)
   c. Para contact.creation / contact.propertyChange:
      → GET /crm/v3/objects/contacts/{objectId}?properties=<lista>
        (el webhook solo trae el campo cambiado, necesitamos el contacto completo)
      → Normalizar payload → calcular sync_hash (SHA-256 de properties ordenadas)
      → Si sync_hash === contacts.sync_hash → SKIP (webhook duplicado, idempotente)
      → Si hubspot_updated_at del webhook < contacts.hubspot_updated_at → SKIP (fuera de orden)
      → Si contacts.local_updated_at > hubspot_updated_at Y diff < 5min:
           sync_status = 'conflict' → guardar ambas versiones en sync_events → notificar UI
      → Si no → upsert en contacts → sync_status = 'synced'
   d. Para contact.deletion:
      → is_archived = true (soft delete, nunca borrar físicamente)
   e. Loguear resultado en sync_events
   f. Supabase Realtime notifica automáticamente al browser (postgres_changes trigger)
```

**Nota**: El webhook recibe un array de eventos. Procesarlos todos en la misma request.
El `portalId` en cada evento identifica de qué portal HubSpot proviene.

### App → HubSpot (Server Action)

```
Usuario edita contacto → Server Action updateContact(id, data)

1. Validar datos (zod schema)
2. Obtener token HubSpot (con refresh automático si es necesario)
3. PATCH https://api.hubapi.com/crm/v3/objects/contacts/{hubspotId}
   body: { properties: { firstname, lastname, ... } }
4. Si HubSpot responde error:
   → No tocar Supabase
   → throw error → UI muestra toast de error con mensaje específico
5. Si éxito:
   → upsert en Supabase con nuevo estado
   → actualizar local_updated_at, sync_hash, sync_status = 'synced'
   → loguear en sync_events (direction: 'local_to_hubspot')
   → revalidatePath('/contacts/[id]')
```

### Sync inicial (onboarding pasos 3-4)

```
Paso 3 — Selección de contactos:
  Opción A "Todos":
    → GET /crm/v3/objects/contacts?limit=100&properties=...
    → Mostrar count total para confirmación del usuario

  Opción B "Seleccionar":
    → Listar lifecycle stages disponibles del portal
    → Usuario elige criterios de filtrado
    → Preview del count antes de confirmar

Paso 4 — Importación:
  Server Action importContacts(selection)
  → Paginación cursor-based de HubSpot (parámetro `after`)
  → Chunks de 100 contacts por request (máximo del batch API)
  → Por cada chunk:
      batch upsert en Supabase
      broadcast progreso via Supabase channel (no postgres_changes)
  → Rate limiting: respetar 100 req/10s para OAuth apps free tier
  → Al completar: last_synced_at = now(), redirect a /contacts

  En el cliente:
  → Suscribir a canal de broadcast de Supabase para el progreso
  → Progress bar en tiempo real
```

---

## Realtime UI con Supabase

### Patrón correcto para Next.js App Router

**Server Component** (`app/contacts/page.tsx`): hace el fetch inicial de datos.

**Client Component** (`components/realtime/ContactsRealtimeSync.tsx`): recibe los datos
iniciales como props y suscribe a cambios en tiempo real.

```typescript
// components/realtime/ContactsRealtimeSync.tsx
'use client'

import { createClient } from '@/lib/supabase/client'  // createBrowserClient
import { useEffect, useState } from 'react'

export function ContactsRealtimeSync({ initialContacts, orgId }) {
  const [contacts, setContacts] = useState(initialContacts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'contacts',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setContacts(prev => [payload.new, ...prev])
          }
          if (payload.eventType === 'UPDATE') {
            setContacts(prev => prev.map(c =>
              c.id === payload.new.id ? payload.new : c
            ))
          }
          if (payload.eventType === 'DELETE') {
            setContacts(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [orgId])

  return <ContactList contacts={contacts} />
}
```

**Importante**: Las suscripciones Realtime solo funcionan en Client Components.
RLS aplica también en Realtime — un usuario solo recibe cambios de su `org_id`.

---

## Inteligencia Artificial

### Modelo: `gpt-4o-mini`

Costo estimado: ~$0.001 por análisis completo de un contacto.
Latencia: ~1-2 segundos. Suficiente para comprensión de texto estructurado.

`gpt-4.1-mini` (abril 2025) es más reciente y outperforma `gpt-4o-mini` en benchmarks,
pero `gpt-4o-mini` es igualmente válido, ampliamente documentado y es la elección conservadora
correcta para un MVP de 3 días. Ambos son defendibles.

### Feature 1 — Contact Intelligence Panel

Disparado al abrir la vista detalle. Cache en `ai_insights` con TTL de 24hs.
Se invalida (`is_stale = true`) si el contacto fue actualizado después de `generated_at`.

```typescript
// lib/ai/insights.ts
const SYSTEM_PROMPT = `
Eres un asistente de ventas B2B. Analiza el contacto de CRM y devuelve SOLO un JSON
con exactamente esta estructura, sin markdown ni texto adicional:
{
  "summary": "2-3 oraciones: quién es, en qué etapa está, qué sabemos de él.",
  "next_action": "Una acción concreta y específica para avanzar con este contacto.",
  "risk_signal": null | "Descripción breve del riesgo si existe (lead frío, sin datos, etc.)",
  "lead_score": <0-100>
}

Criterios del lead_score:
- 80-100: datos completos + etapa avanzada (negotiation/closedwon) + actividad reciente
- 50-79: datos parciales + etapa media + algo de actividad
- 20-49: datos mínimos + etapa temprana + poca actividad
- 0-19:  datos casi vacíos + sin actividad + señales de abandono
`
```

### Feature 3 — Chat con tu base de contactos (RAG)

Un chat en lenguaje natural que razona sobre múltiples contactos a la vez. La diferencia
con Natural Language Search es fundamental: el search filtra y devuelve rows. El chat
razona sobre el contenido y devuelve síntesis, patrones y recomendaciones.

**Preguntas que solo el chat puede responder:**
```
"¿Cuáles son los patrones comunes entre mis leads que cerraron el último trimestre?"
"¿Qué contactos debería priorizar esta semana y por qué?"
"¿Hay industrias sin atender con perfil similar a mis mejores clientes?"
"Resumime el estado general de mi pipeline."
```

**Pipeline RAG completo:**

```typescript
// actions/chat.ts
async function sendChatMessage(message: string, orgId: string) {

  // 1. Embeddear la pregunta del usuario
  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',  // $0.00002/1K tokens — prácticamente gratis
    input: message,
  })

  // 2. Similarity search: top 20 contactos más relevantes semánticamente
  //    La función match_contacts vive en la migration 006_embeddings.sql
  const { data: relevantContacts } = await supabase.rpc('match_contacts', {
    query_embedding: queryEmbedding.data[0].embedding,
    match_org_id: orgId,
    match_threshold: 0.5,
    match_count: 20,
  })

  // 3. Construir contexto para GPT con los contactos recuperados
  const context = relevantContacts
    .map(c => `- ${c.first_name} ${c.last_name} | ${c.company} | ${c.lifecycle_stage} | ${c.country}`)
    .join('\n')

  // 4. GPT-4o-mini razona sobre el contexto — respuesta en streaming
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    stream: true,
    messages: [
      {
        role: 'system',
        content: `Eres un asistente de ventas B2B. Tenés acceso a los siguientes contactos
del CRM del usuario (los más relevantes para su pregunta):

${context}

Respondé en base a estos datos. Sé específico, accionable y conciso.
Si la pregunta no puede responderse con los datos disponibles, decilo claramente.`
      },
      { role: 'user', content: message }
    ],
  })

  return stream  // el Server Action devuelve el stream al cliente
}
```

**UI — `components/chat/ContactsChat.tsx`:**
- Input de texto en la parte inferior
- Respuestas en streaming (se renderizan token por token)
- Burbuja colapsable que muestra qué contactos se usaron como contexto
- Historial de la conversación en memoria (no persiste entre sesiones para el MVP)
- Accesible desde el sidebar o como página `/chat`

**Cuándo se generan los embeddings:**
Al sincronizar cada contacto (create/update), como paso final del sync engine:
```typescript
// Al final de lib/hubspot/sync.ts, después del upsert en Supabase:
const text = buildContactText(contact)
const { data } = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
})
await supabase
  .from('contacts')
  .update({ embedding: data[0].embedding })
  .eq('id', contact.id)
```

**Costo real para el MVP con 50 contactos:**
50 embeddings × ~30 tokens c/u = 1.500 tokens = $0.00003 total.
Cada pregunta de chat = ~20 tokens (query embedding) + respuesta GPT ≈ $0.001.
Completamente negligible.

**Para defender en la entrevista:**
> *"Implementé RAG sobre la base de contactos. Cada contacto tiene un embedding generado
> con text-embedding-3-small al momento del sync, almacenado en Supabase con pgvector.
> Cuando el usuario hace una pregunta en el chat, la vectorizo, hago similarity search
> para recuperar los 20 contactos más relevantes semánticamente, y uso esos como contexto
> para GPT-4o-mini. Esto permite responder preguntas de razonamiento sobre múltiples
> contactos sin mandar toda la base al modelo — escala a cualquier volumen sin cambiar
> la arquitectura."*

---

## Features adicionales del MVP

Estos tres features estaban originalmente en "Próximas iteraciones" pero tienen alto
impacto y bajo costo de implementación. Se incluyen en el MVP con prioridad después
de que todo lo core esté funcionando y deployado.

### Timeline de actividad por contacto

Vista cronológica en la vista detalle del contacto mostrando todo lo que ocurrió:
cuándo fue importado, qué campos cambiaron, si fue editado desde HubSpot o desde la app,
qué insights de IA se generaron, si hubo conflictos.

**Los datos ya existen en `sync_events`** — es exclusivamente UI.

```
● Insight de IA generado — hace 2 horas
● Editado desde HubSpot (email actualizado) — hace 5 horas
● Conflicto detectado y resuelto por el usuario — ayer 15:32
● Contacto importado desde HubSpot — 12 ene 2025
```

Componente: `ContactTimeline.tsx`. Query simple sobre `sync_events` filtrada por
`contact_id`, ordenada por `created_at desc`. Sin lógica adicional.

**Por qué importa en la demo**: hace visible el sync bidireccional. Sin esto, el
evaluador tiene que confiar en que funciona. Con esto, lo ve pasar en tiempo real.
Costo: medio día.

### Delta sync periódico (Vercel Cron)

Un cron job que corre cada hora como red de seguridad si los webhooks fallan
(ngrok caído, deploy en curso, outage temporal de HubSpot).

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

```typescript
// app/api/cron/sync/route.ts
export async function GET(request: Request) {
  // Verificar que viene de Vercel Cron (header Authorization)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Para cada org con conexión HubSpot activa:
  // GET /crm/v3/objects/contacts?modifiedAfter={last_synced_at}&properties=...
  // Upsert solo los contactos que cambiaron desde el último sync
  // Actualizar last_synced_at
}
```

Agregar `CRON_SECRET` a las env vars (Vercel lo inyecta automáticamente en el header
cuando llama al endpoint). Con 50 contactos es 1 request. Escala linealmente.

**Para defender en la entrevista:**
> *"Los webhooks son el mecanismo principal — push, tiempo real, eficiente. El cron es
> el fallback — si hay un período sin webhooks (deploy, outage), el delta sync lo cubre.
> Defense in depth: nunca quedo con datos desactualizados por más de una hora."*

### Panel de salud del sync (en Settings)

En `/settings`, debajo de la información de conexión HubSpot, un bloque con el estado
real del sistema. No una pantalla separada — integrado en la página existente.

```
┌─────────────────────────────────────────┐
│ Estado del sync                         │
│                                         │
│ ✅  47  contactos sincronizados         │
│ ⚠️   2  conflictos pendientes de resolver│
│ 🔴   1  error (ver detalle)             │
│ 🕐      Último sync: hace 3 minutos     │
└─────────────────────────────────────────┘
```

Cada número es clickeable y lleva a la lista de contactos filtrada por ese estado.
Los datos vienen de queries agregadas sobre `contacts` y `sync_events` — tablas que
ya existen. El componente es `SyncHealthPanel.tsx`.

**Por qué importa**: el evaluador ve que tratás los errores como ciudadanos de primera
clase, no los ocultás. Un sistema que muestra su propia salud es un sistema en el que
confiás. Costo: medio día.

El usuario escribe en lenguaje natural. GPT traduce a filtros. Se aplican a Supabase.

```typescript
// lib/ai/search.ts
// Input:  "contactos de Argentina que no me llamaron en 2 semanas"
// Output (JSON que GPT genera y la app aplica):
{
  "filters": [
    { "field": "country", "operator": "ilike", "value": "%Argentina%" },
    { "field": "local_updated_at", "operator": "lt", "value": "<ISO date de hace 2 semanas>" }
  ],
  "order_by": { "field": "local_updated_at", "direction": "asc" },
  "explanation": "Contactos en Argentina sin actividad en más de 14 días"
}

// NUNCA ejecutar SQL crudo — solo usar el query builder de Supabase
// Si GPT devuelve algo inválido → fallback a todos los contactos + mensaje al usuario
```

El prompt incluye el schema de `contacts` y ejemplos few-shot de input → output.

---

## Onboarding — 4 pasos

```
Paso 1 — Bienvenida
  Título: "Bienvenido a ContactShip"
  Descripción breve de lo que hace la plataforma
  CTA: "Empezar" → avanza al paso 2

Paso 2 — Conectar HubSpot
  Título: "Conectá tu cuenta de HubSpot"
  Botón: "Conectar HubSpot" → GET /api/hubspot/connect → OAuth flow completo
  Al volver del OAuth callback con éxito → avanza automáticamente al paso 3
  Si falla → mensaje de error + retry

Paso 3 — Seleccionar contactos
  Título: "¿Qué contactos querés importar?"
  Opción A: "Todos los contactos" (muestra el count total del portal)
  Opción B: "Seleccionar por criterio" (lifecycle stage, propietario)
  Preview: "Vas a importar X contactos"
  CTA: "Importar" → dispara Server Action → avanza al paso 4

Paso 4 — Sincronización
  Título: "Importando tus contactos..."
  Progress bar en tiempo real (Supabase broadcast channel)
  "X de Y contactos importados"
  Al completar:
    → updateUser({ data: { onboarding_complete: true } })
    → redirect a /contacts
```

El stepper es un Client Component con estado local. Cada paso valida antes de avanzar.
El estado del onboarding persiste en `user_metadata.onboarding_complete` de Supabase Auth.

---

## Edge cases y resoluciones

### Webhook duplicado
**Solución**: `sync_hash` (SHA-256 del payload de propiedades normalizado y ordenado).
Si el hash entrante coincide con `contacts.sync_hash` → descartar sin escribir.
Responder 200 de todas formas (HubSpot reintenta si no recibe 2xx).

### Webhook fuera de orden
**Solución**: Comparar `hubspot_updated_at` del payload con el valor guardado.
Si el incoming es más antiguo → skip, loguear en `sync_events` con `event_type = 'skip'`.

### Conflicto bidireccional
**Condición**: mismo contacto modificado en HubSpot Y localmente en menos de 5 minutos.
**Resolución**: marcar `sync_status = 'conflict'`. Guardar ambas versiones en `sync_events`.
`ConflictBanner` en UI con dos botones: "Mantener mis cambios" / "Usar versión HubSpot".
Last-write-wins por defecto si no hay interacción en 10 minutos.

### Contacto eliminado en HubSpot
**Solución**: `is_archived = true`. No se elimina de la DB (preservar historial y AI insights).
La lista filtra `is_archived = false` por defecto. Badge visual en detalle si se navega directamente.

### Campo custom de HubSpot desconocido
**Solución**: va a `properties JSONB`. La UI lo muestra en sección "Propiedades adicionales"
iterando las keys. Sin pérdida de información, sin necesidad de migraciones.

### Token HubSpot expirado
**Solución**: auto-refresh en `lib/hubspot/client.ts` antes de cada request.
Si el refresh falla → `needs_reconnect = true` → banner persistente en UI → botón "Reconectar HubSpot"
que inicia el flujo OAuth nuevamente (Flujo B), preservando la org y todos los datos.

### Rate limit HubSpot (429)
**Solución**: retry con exponential backoff + jitter en el cliente HubSpot.
Leer `Retry-After` header si está presente. Sync inicial en chunks de 100 con delay entre chunks.
Límites 2025: OAuth apps free = 100 req/10s. CRM Search API = 4 req/s (pool separado).

### Dos usuarios editando el mismo contacto simultáneamente
**Solución**: `updated_at` a nivel DB. El segundo write detecta que el estado cambió
(sync_hash diferente) y muestra `ConflictBanner` al segundo editor.

### Usuario intenta conectar HubSpot sin estar logueado
**Solución**: `/api/hubspot/connect` verifica la sesión Supabase al inicio.
Si no hay sesión → redirect a `/login`. El middleware también protege `/onboarding`.

---

## Decisiones técnicas para defender en la entrevista

### A — Auth desacoplada de la integración

> *"Separé identidad e integración deliberadamente. Magic link para auth — sin fricción,
> sin contraseñas que gestionar. HubSpot OAuth como paso del onboarding, no como IDP.
> Esto permite múltiples usuarios por organización, que el sistema funcione aunque el
> token de HubSpot se revoque, y que mañana se agregue Salesforce sin tocar el auth.
> En un SaaS B2B, identidad e integraciones tienen ciclos de vida independientes."*

### B — Idempotencia de webhooks

> *"HubSpot garantiza at-least-once delivery, no exactly-once. Los webhooks pueden llegar
> duplicados o fuera de orden. Mi handler es completamente idempotente: cada contacto tiene
> un `sync_hash` (SHA-256 del payload normalizado). Antes de cualquier write, comparo el
> hash entrante con el guardado. Si son iguales → 200 sin tocar la DB. Si el
> `hubspot_updated_at` del webhook es más viejo que el almacenado → skip y log.
> Sin locks, sin estado externo, sin riesgo de doble escritura."*

### C — Server Actions vs API REST

> *"Server Actions para mutaciones del usuario: editar contacto, trigguear AI, seleccionar
> sync. DX superior: type-safety end-to-end, sin contratos de API separados, sin fetch
> boilerplate en el cliente. API Routes para los dos casos donde hay un caller externo:
> el webhook de HubSpot y los callbacks OAuth. Esta no es una decisión anti-REST — REST
> es para interfaces entre sistemas. Server Actions son para la interfaz entre UI y servidor
> dentro del mismo sistema. La separación es clara, justificable y auditable."*

### D — IA que cambia comportamiento, no que decora

> *"El resumen de contacto que todos entregan no cambia el comportamiento: el usuario
> lee el resumen y tiene que decidir igual. Es decorativo. Lo que cambia el comportamiento
> es la combinación de Suggested Next Action + Natural Language Search. En el contexto de
> ContactShip — agentes de IA haciendo outbound — el flujo real es configurar campañas:
> 'quiero llamar a leads de mediana empresa en negociación sin contacto en 2 semanas.'
> Sin mi feature: 4 filtros manuales. Con mi feature: una oración en el buscador.
> La IA reduce el tiempo de configuración de campañas de minutos a segundos. Medible."*

---

## Setup de desarrollo

### Prerequisitos
- Node.js 20+
- Supabase CLI (`npm install -g supabase`)
- ngrok (para recibir webhooks de HubSpot en local)

### Primeros pasos

```bash
# 1. Clonar e instalar
git clone <repo>
cd <repo>
npm install

# 2. Copiar y completar env vars
cp .env.example .env.local
# Completar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
#            HUBSPOT_CLIENT_ID, HUBSPOT_CLIENT_SECRET, HUBSPOT_REDIRECT_URI,
#            OPENAI_API_KEY, NEXT_PUBLIC_APP_URL

# 3. Aplicar migraciones
supabase db push

# 4. Generar tipos TypeScript desde el schema de Supabase
supabase gen types typescript --project-id <project-id> > types/database.ts

# 5. Levantar ngrok en otra terminal (necesario para recibir webhooks de HubSpot)
ngrok http 3000
# → actualizar HUBSPOT_REDIRECT_URI y NEXT_PUBLIC_APP_URL con la URL de ngrok
# → actualizar Redirect URL en HubSpot Developer Portal
# → actualizar Target URL del webhook en HubSpot Developer Portal

# 6. Iniciar servidor de desarrollo
npm run dev
```

### Script para popular HubSpot Sandbox con 50 contactos

Crear `scripts/seed-hubspot.ts` y `scripts/seed-data.json` (50 contactos realistas).

```typescript
// scripts/seed-hubspot.ts
// Usa un Private App Token del sandbox (Settings → Integrations → Private Apps)
// No usa OAuth — es para seeding directo desde la consola
// Ejecutar: npx tsx scripts/seed-hubspot.ts

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN

const contacts = await import('./seed-data.json')

// Batch create — máximo 100 por request
const response = await fetch(
  'https://api.hubapi.com/crm/v3/objects/contacts/batch/create',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      inputs: contacts.default.map(c => ({ properties: c }))
    }),
  }
)

const result = await response.json()
console.log(`Creados: ${result.results?.length} contactos`)
```

El `seed-data.json` debe tener 50 objetos con campos:
`{ firstname, lastname, email, phone, company, jobtitle, lifecyclestage, country, city }`

---

## Testing mínimo requerido

Foco en la lógica crítica de negocio, no en coverage exhaustivo.

```
lib/hubspot/webhooks.test.ts
  ✓ verifica firma HMAC-v3 válida
  ✓ rechaza firma inválida (403)
  ✓ rechaza timestamp > 5 minutos
  ✓ descarta webhook duplicado (mismo sync_hash)
  ✓ descarta webhook fuera de orden (hubspot_updated_at más viejo)
  ✓ detecta conflicto (modificado localmente en < 5min)

lib/hubspot/sync.test.ts
  ✓ normaliza payload de HubSpot correctamente
  ✓ calcula sync_hash determinístico (mismo input → mismo hash siempre)
  ✓ guarda campo desconocido en properties JSONB sin error

lib/ai/search.test.ts
  ✓ parsea respuesta válida de GPT a filtros Supabase
  ✓ maneja respuesta inválida de GPT con fallback graceful
  ✓ no ejecuta SQL crudo bajo ninguna circunstancia
```

---

## Notas de arquitectura para el README del proyecto

### Por qué monolito Next.js sin backend separado
El problema no requiere escala horizontal independiente entre API y UI en el MVP.
La separación de concerns está en las capas internas: `lib/hubspot`, `lib/ai`, `lib/supabase`.
Si el sync engine necesitara escala propia (miles de portales concurrentes), se extrae
a un worker con Inngest o trigger.dev sin modificar la UI ni el contrato de datos.

### Por qué Supabase
RLS nativo elimina una capa entera de lógica de autorización en la aplicación.
Realtime incluido sin Redis ni WebSocket server propio.
Vault para tokens de terceros sin AWS Secrets Manager.
Para un MVP de 3 días pensado como producto real, la elección tiene sentido.

### Por qué webhooks y no polling
Polling para 50 contactos de un cliente es manejable.
Polling para 500 clientes con 10.000 contactos cada uno es un problema de escala serio.
Webhooks son la arquitectura correcta desde el inicio, sin importar el tamaño del MVP.

### Qué haría con más tiempo
- Job queue (Inngest) para procesar webhooks en background con reintentos automáticos
- Sentry + logs estructurados para observabilidad en producción
- Tests E2E con Playwright para onboarding y flujos críticos
- Invitaciones de equipo (actualmente el auto-join por dominio es el único mecanismo)
- Soporte para múltiples CRMs (Salesforce, Pipedrive) contra el mismo contrato de interfaz

---

## Checklist de entrega

### Funcionalidad core
- [ ] Magic link login funcional (email → link → sesión)
- [ ] Callback Supabase Auth: crea org + setea user_metadata
- [ ] Onboarding stepper 4 pasos completo y validado
- [ ] HubSpot OAuth: connect → callback → tokens en Vault
- [ ] Sync inicial con selección y progress bar en tiempo real
- [ ] Lista de contactos con estados de sync y búsqueda
- [ ] Vista detalle con edición inline sincronizada a HubSpot
- [ ] Timeline de actividad por contacto (desde sync_events)
- [ ] Webhook handler con verificación HMAC-v3 e idempotencia
- [ ] Delta sync periódico via Vercel Cron (fallback de webhooks)
- [ ] Conflict detection + ConflictBanner con resolución
- [ ] Supabase Realtime: UI se actualiza sin reload al recibir webhook
- [ ] Refresh automático de token HubSpot + banner si falla
- [ ] Soft delete de contactos archivados en HubSpot
- [ ] Panel de salud del sync en Settings (conflictos, errores, último sync)

### IA
- [ ] Contact Intelligence Panel (summary + next action + risk + score)
- [ ] Cache de insights con TTL 24hs e invalidación por cambio
- [ ] Natural Language Search funcional
- [ ] Embeddings generados al sincronizar cada contacto (text-embedding-3-small)
- [ ] Chat RAG con la base de contactos (similarity search + GPT streaming)

### Infraestructura
- [ ] Deploy en Vercel funcionando con todas las env vars
- [ ] Webhooks configurados en HubSpot apuntando a Vercel
- [ ] Vercel Cron configurado en vercel.json
- [ ] pgvector habilitado en Supabase + migration 006 aplicada
- [ ] Migraciones SQL versionadas en `/supabase/migrations/`
- [ ] Script de seed de 50 contactos en HubSpot Sandbox

### Documentación
- [ ] README con instrucciones de setup y env vars
- [ ] Sección de decisiones técnicas en el README
- [ ] Bonus A, B, C y D documentados y defendibles

---

## Próximas iteraciones

Esta sección documenta qué haríamos si tuviéramos más tiempo o si el proyecto avanzara
a producción real. Está pensada tanto para la defensa técnica en la entrevista como para
comunicar visión de producto más allá del MVP.

Las mejoras están organizadas por área y priorizadas: las primeras en cada sección son
las que más impacto tendrían con el menor esfuerzo adicional.

---

### 🏗️ Arquitectura y backend

**Job queue para sync en background (Inngest o trigger.dev)**
Hoy el webhook handler procesa los eventos de forma sincrónica en la misma request.
Esto funciona para bajo volumen, pero si llegan 50 eventos simultáneos de distintos portales,
el handler puede tardar más de lo que HubSpot tolera (5s timeout).
Con Inngest, el handler responde 200 inmediatamente y encola el procesamiento.
Reintentos automáticos con backoff exponencial incluidos. Cero infraestructura adicional.

**Separar el sync engine en un worker independiente**
Si la plataforma escala a cientos de portales conectados, el sync engine necesita
escala horizontal independiente de la UI. Extraer `lib/hubspot/sync.ts` a un
microservicio NestJS con su propia base de instancias en Vercel o Fly.io.
El contrato de datos (schema Supabase) no cambia — solo el ejecutor.

**Rate limiting por portal en el webhook handler**
Hoy si un portal de HubSpot muy activo manda 500 eventos en 10 segundos, consume
toda la capacidad del handler para todos los demás portales.
Implementar un token bucket por `portalId` para que un portal activo no degrade a los demás.

**Idempotency keys en la API propia**
Agregar `Idempotency-Key` header support en las API Routes para que clientes externos
puedan reintentar requests sin riesgo de doble escritura. Patrón estándar en APIs de pago.

---

### 🔐 Auth y multi-tenancia

**Invitaciones de equipo**
Hoy el único mecanismo de multi-usuario es el auto-join por dominio de email.
Agregar un sistema de invitaciones: el admin de la org genera un link con token firmado,
el invitado hace click, completa el magic link, y queda asociado a la org.
Una tabla `invitations` con `token`, `org_id`, `invited_by`, `expires_at`, `used_at`.

**Roles dentro de la organización**
MVP tiene acceso full para todos. La siguiente iteración mínima es dos roles:
`admin` (puede conectar/desconectar HubSpot, invitar usuarios) y
`member` (puede ver y editar contactos, no puede tocar la integración).
RLS se actualiza con `check (role = 'admin')` en las policies correspondientes.

**SSO / SAML para enterprise**
Empresas grandes no quieren gestionar usuarios individuales — quieren conectar
su IdP corporativo (Okta, Azure AD). Supabase Auth soporta SAML 2.0 con configuración
adicional. La arquitectura multi-tenant ya está preparada para esto.

**Refresh token rotation**
Hoy el refresh token de HubSpot es de larga vida. Implementar rotación explícita:
cada vez que se usa el refresh token para obtener uno nuevo, invalidar el anterior
y guardar el nuevo en Vault inmediatamente. Reduce la ventana de exposición si un token
es comprometido.

---

### 🔄 Sincronización y datos

**Sync histórico de actividad (engagements)**
Hoy solo sincronizamos propiedades del contacto. HubSpot también tiene un historial
de actividad: emails enviados, llamadas, reuniones, notas. Sincronizar esto permitiría
que la IA tenga contexto mucho más rico para sus análisis.
Requiere scopes adicionales: `crm.objects.notes.read`, `crm.objects.calls.read`.

**Sync bidireccional de Companies y Deals**
Los contactos de HubSpot están asociados a empresas y a oportunidades de negocio.
Mostrar estas asociaciones en la vista detalle agrega contexto fundamental para ventas.
Requiere tablas `companies` y `deals` con su propio sync engine y webhooks.

**Delta sync periódico como backup del webhook**
Los webhooks de HubSpot son confiables pero no infalibles. Si hay un outage temporal
del webhook endpoint (deploy, error), los cambios de ese período se pierden.
Un delta sync cada hora (comparando `hs_lastmodifieddate` con `last_synced_at`) actúa
como red de seguridad. Con los 50 contactos del MVP es un request. Con 50.000 ya requiere
paginación eficiente y throttling cuidadoso.

**Conflict resolution con merge de campos**
Hoy el conflicto se resuelve a nivel de contacto completo: "mis cambios" o "los de HubSpot".
Una versión más sofisticada mostraría qué campos específicos cambiaron en cada lado
y permitiría elegir campo por campo. Más complejo pero mucho mejor UX para equipos grandes.

**Soporte para múltiples CRMs**
La arquitectura de `hubspot_connections` + `lib/hubspot/` está pensada para ser
reemplazable. Agregar Salesforce o Pipedrive implicaría crear `lib/salesforce/` con el
mismo contrato de interfaz (`syncContact`, `getContact`, `verifyWebhook`) y una nueva
entrada en `hubspot_connections` renombrada a `crm_connections` con un campo `provider`.
El resto de la app (UI, AI, Realtime) no cambia.

---

### 🤖 Inteligencia artificial

**Lead scoring con más señales**
El scoring actual usa solo los datos del contacto en el CRM. Con acceso al historial
de actividad (emails abiertos, llamadas atendidas, reuniones completadas), el modelo
puede hacer predicciones mucho más precisas. Considerar fine-tuning o un modelo
de clasificación propio entrenado con datos históricos del cliente.

**Alertas proactivas de IA**
En lugar de analizar contactos solo cuando el usuario los abre, procesar todos los
contactos en background diariamente y emitir alertas: "5 leads en riesgo de enfriarse",
"3 contactos listos para hacer upgrade". Requiere job queue (Inngest) para no bloquear
requests. Notificaciones por email o in-app.

**Análisis de conversación**
ContactShip ya tiene transcripciones de llamadas de sus agentes de IA. Integrar esas
transcripciones en el contexto del contacto enriquece radicalmente los insights del chat
RAG y el Contact Intelligence Panel: "Este contacto preguntó por el precio en la última
llamada pero no firmó — seguimiento recomendado." Requiere acceso a la API interna de
ContactShip.

**Sugerencias de texto al editar**
Al editar notas o descripción de un contacto, IA sugiere completado automático basado
en el contexto del contacto y el historial de la organización. Complejo en UX
(autocomplete en tiempo real, debounce, latencia de API).

---

### 🎨 UX y producto

**Vista Kanban por lifecycle stage**
Alternativa a la lista tabular. Los contactos se muestran como cards en columnas
(Subscriber → Lead → MQL → SQL → Opportunity → Customer). Drag and drop para cambiar
de etapa sincroniza con HubSpot en tiempo real.

**Bulk actions**
Seleccionar múltiples contactos y aplicar una acción: cambiar lifecycle stage, asignar
propietario, exportar a CSV, archivar. Batch update en HubSpot API (máx 100 por request).

**Exportación a CSV**
Feature básico que los usuarios de CRM esperan. Exportar la lista actual (con filtros
aplicados) a CSV. Simple de agregar pero fuera de scope del MVP.

**Filtros guardados**
El usuario puede guardar una búsqueda o combinación de filtros como "vista" con nombre.
Persiste en la DB y aparece en el sidebar. Fundamental para equipos de ventas que trabajan
siempre con los mismos segmentos.

**Notificaciones in-app y por email**
Cuando hay un conflicto sin resolver, cuando el token de HubSpot expira, cuando hay
leads en riesgo según la IA. Sistema de notificaciones con prioridades y preferencias
por usuario.

---

### 📊 Observabilidad y operaciones

**Sentry para error tracking**
Capturar excepciones en producción con contexto: qué usuario, qué org, qué operación
falló. Alertas por email o Slack cuando hay errores nuevos o un spike en errores conocidos.

**Logs estructurados con contexto de negocio**
Reemplazar `console.log` por un logger estructurado (Pino) que incluya siempre:
`org_id`, `portal_id`, `contact_id`, `operation`, `duration_ms`. Consultable en Vercel Logs
o exportable a Datadog/Grafana.

**Alertas de rate limit**
Monitorear el header `X-HubSpot-RateLimit-Remaining` en cada response de HubSpot.
Si cae por debajo del 20%, emitir una alerta antes de que empiecen los 429.

**Tests E2E con Playwright**
Cubrir los flujos críticos: registro → onboarding → editar contacto → verificar sync en HubSpot.
Correr en CI/CD antes de cada deploy a producción.

---

### 💰 Modelo de negocio (si fuera un producto real)

**Planes y billing**
Free tier: 1 usuario, hasta 500 contactos, sin IA.
Pro: usuarios ilimitados, hasta 10.000 contactos, IA incluida.
Enterprise: contactos ilimitados, múltiples CRMs, SSO, SLA.
Integrar Stripe con Supabase para gestionar suscripciones y gates de features.

**Usage-based pricing para IA**
Los insights de IA tienen costo real (OpenAI API). En el MVP se absorbe el costo.
En producción, considerar un modelo donde los insights cuentan como "créditos"
y los planes tienen una cuota mensual.

**API pública para integraciones**
Exponer una API REST versionada para que los clientes enterprise puedan integrar
ContactShip con sus propios sistemas. Autenticación con API keys por organización.
La arquitectura interna ya separa UI de lógica de negocio — extraer API Routes es natural.
