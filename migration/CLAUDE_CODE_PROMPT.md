# Prompt para Claude Code — Migración Design System v2

Copiá y pegá este prompt en Claude Code (con el repo abierto). El plan está dividido en fases para que Claude pueda confirmar antes de avanzar.

---

## PROMPT

```
Estoy migrando ContactShip a un nuevo design system v2. Es light-first
(antes era dark-only), con un accent cobalto (#2348C9) en vez del indigo
neón anterior, y tipografía Geist (en vez de Syne + DM Sans). La filosofía
nueva es "quiet defaults, hairlines en vez de cajas, accent contenido".

Los nombres de tokens (--bg-base, --brand, --text-primary, etc.) NO cambian
— sólo cambian valores. Eso minimiza el blast radius en componentes.

Te paso 2 archivos de referencia:
1. `migration/globals.css` — el reemplazo completo de app/globals.css
2. `migration/MIGRATION.md` — el spec con el detalle componente por componente

Antes de tocar nada, leé los dos archivos enteros. Después seguí el plan
de abajo. NO avances entre fases sin que yo te lo confirme explícitamente.

El plan tiene 10 fases:
  Fase 0  — Auditoría (sin código)
  Fase 1  — Foundations (CSS + Geist fonts)
  Fase 2  — Avatar component + landing rediseñada
  Fase 3  — Refresh visual de componentes existentes
  Fase 4  — Settings (rediseño mayor, sub-nav)
  Fase 5  — Conflicts inbox (NUEVA ruta /conflicts)
  Fase 6  — EmptyState component + Chat upgrade
  Fase 7  — Dialog primitives + 3 dialogs (Email, ConflictDiff, FilterSummary)
  Fase 8  — Dashboard rediseño + SimilarContacts panel + Citations en chat
  Fase 9  — Limpieza (greps, typecheck, lint)
  Fase 10 — Dark mode toggle (opcional)

═══════════════════════════════════════════════════════════════════════════
FASE 0 — Auditoría (sin escribir código)
═══════════════════════════════════════════════════════════════════════════

1. Leé:
   - migration/globals.css
   - migration/MIGRATION.md
   - app/globals.css (el viejo)
   - app/layout.tsx
   - components/layout/Sidebar.tsx
   - components/contacts/ContactList.tsx
   - components/contacts/ContactTimeline.tsx
   - components/contacts/SyncStatusBadge.tsx
   - components/contacts/AiInsightsPanel.tsx
   - components/contacts/ContactForm.tsx
   - components/contacts/ConflictBanner.tsx
   - components/onboarding/OnboardingStepper.tsx
   - app/page.tsx
   - app/(auth)/login/page.tsx
   - app/(app)/contacts/[id]/page.tsx

2. Hacé un grep por colores hardcodeados:
   grep -rn "#6366F1\|#0A0A0F\|#111118\|#1A1A24\|#F0F0FF\|#9494B8\|#5C5C7A" \
     app/ components/ --include="*.tsx" --include="*.ts" --include="*.css"

3. Devolveme:
   - Un diff resumen de lo que vas a cambiar (alto nivel, por archivo).
   - Lista de hardcodes encontrados.
   - Cualquier ambigüedad o decisión que no esté cubierta en MIGRATION.md.
   - Tu propuesta para cada ambigüedad (Regla 3 del INIT_PLAN: proponer,
     no sólo preguntar).

Esperá confirmación antes de avanzar a Fase 1.

═══════════════════════════════════════════════════════════════════════════
FASE 1 — Foundations (CSS + fonts)
═══════════════════════════════════════════════════════════════════════════

1. Reemplazá app/globals.css por el contenido de migration/globals.css.

2. Actualizá app/layout.tsx:
   - Sacar imports de DM_Sans, JetBrains_Mono, Syne.
   - Agregar Geist y Geist_Mono desde next/font/google.
   - El <html> no debe tener class="dark" por default
     (la app es light-first ahora).
   - className del <html>: `${geistSans.variable} ${geistMono.variable}`
   - Mantener suppressHydrationWarning.

3. Si querés instalar el paquete oficial `geist`:
   pnpm add geist
   Y usar `import { GeistSans, GeistMono } from "geist/font"`.
   Si no, usar next/font/google como dice arriba (más simple).

4. Verificá con `pnpm dev`:
   - Página principal debe verse con fondo claro #FBFBFA.
   - No deberían haber errores de fuente en la consola.
   - El texto debe verse en Geist (no en DM Sans).

Mostrame el resultado y esperá confirmación.

═══════════════════════════════════════════════════════════════════════════
FASE 2 — Avatar component (nuevo) + landing
═══════════════════════════════════════════════════════════════════════════

1. Crear components/ui/avatar.tsx con el código que está en MIGRATION.md §3.
   (Tonal background derivado del nombre por hash → hue, oklch).

2. Rediseñar app/page.tsx (landing) según el Login artboard del design
   system: split-pane con brand panel a la izquierda (fondo --bg-inverse,
   un wordmark + título + 1 sentence de copy) y form a la derecha (email
   + magic link button + SSO opcional). El título de la izquierda no debe
   ser "ContactShip" repetido — debe ser una promesa de producto en una
   sola línea ("A CRM workspace that mirrors HubSpot in real time.").

   Esto reemplaza el layout actual centrado de tarjetita en el medio.

3. Confirmar visualmente que el avatar component se ve bien con varios
   nombres distintos (montar 4-5 en una página de prueba si hace falta,
   luego borrarla).

═══════════════════════════════════════════════════════════════════════════
FASE 3 — Componentes existentes (refresh visual)
═══════════════════════════════════════════════════════════════════════════

Aplicar los cambios de MIGRATION.md §2.3 archivo por archivo:

1. components/layout/Sidebar.tsx
   - Cambiar active state de `bg-brand-subtle text-brand` a
     `bg-bg-subtle text-text-primary`.
   - Sustituir el icono Sparkles del logo por un mark cuadrado: un
     <div className="h-7 w-7 rounded-md bg-text-primary"> con un check
     blanco adentro (ver Logo component del design system).
   - Agregar item de nav "Conflictos" con count badge warning si hay
     conflicts pendientes (route /conflicts — la armamos en Fase 5).

2. components/contacts/ContactList.tsx
   - Columna nombre: agregar <Avatar size={26} name={...} /> antes del
     nombre, con gap-2.5.
   - Columna email: aplicar font-mono text-xs text-text-muted.
   - Selected/highlighted row: usar bg-brand-subtle/30 sin border-left.
   - El banner del AI search: revisar que el contraste se vea bien en
     light mode (ya debería con los tokens nuevos).
   - Empty state: usar <EmptyState> (lo creamos en Fase 6) en lugar del
     mensaje plano actual.

3. components/contacts/SyncStatusBadge.tsx
   - Sin cambios funcionales — verificar que el dot del conflict siga
     animando.

4. components/contacts/AiInsightsPanel.tsx
   - LeadScoreCard: el número grande debe usar text-3xl font-semibold
     y la familia heading (Geist). Tabular nums.
   - Quitar cualquier gradient si hay.
   - Inline empty cuando no hay insights todavía (border dashed, ícono
     lateral chico, action "Generar ahora").

5. components/onboarding/OnboardingStepper.tsx
   - Verificar visualmente — los stepper dots deberían verse bien con
     los nuevos tokens.
   - SelectionOption (checked): hoy es border-brand bg-brand-subtle;
     mantener.

6. components/contacts/ContactTimeline.tsx
   - Adoptar el patrón del TimelineEntry del design system:
     ícono cuadrado de 28x28 con tonal bg (success/brand/info/neutral)
     + título + meta en mono + tiempo en mono + línea conectora.

7. components/contacts/ConflictBanner.tsx
   - Pattern del Banner del design system: padding 12px 16px,
     border + bg subtle del tone, action button del lado derecho.
   - Considerar reemplazarlo por una entrada en la Conflicts inbox
     (Fase 5) — si la inbox existe, el banner global puede ser un
     link "3 conflictos pendientes → ver inbox".

8. components/contacts/ContactForm.tsx
   - Inputs deben quedar bien automáticamente al cambiar los tokens.
     Sólo verificar focus ring (debería ser 3px tonal cobalt alpha 0.18).

Después de cada archivo, mostrame el diff y un screenshot mental
(describime cómo se ve). NO avanzar al siguiente sin confirmación
para los primeros 3 (Sidebar, ContactList, AiInsightsPanel) — después
podés agrupar el resto si todo va bien.

═══════════════════════════════════════════════════════════════════════════
FASE 4 — Settings (rediseño mayor)
═══════════════════════════════════════════════════════════════════════════

La página actual app/(app)/settings/page.tsx es plana. Necesita el layout
del Settings artboard del design system: sub-nav vertical + secciones.

1. Crear components/settings/SettingsNav.tsx con:
   - <SettingsNavGroup title="...">{children}</SettingsNavGroup>
   - <SettingsNavItem label="..." active={...} badge={...} badgeTone={...} />
   Estilos según MIGRATION.md §2.3 "Settings page".

2. Crear components/settings/SettingsSection.tsx con:
   - Title + desc + border-bottom + lista de SettingsRow.
   - SettingsRow: { title, desc, children } donde children es el control
     (Toggle, Select, button group).

3. Reescribir app/(app)/settings/page.tsx como Server Component que:
   - Carga datos de org (name, hubspot connection status, last sync, etc).
   - Renderiza <SettingsLayout> con sub-nav + main panel.
   - La ruta soporta sub-paths: /settings/profile, /settings/hubspot,
     /settings/sync-health, etc. Cada uno cambia el contenido del main
     panel; el SettingsNav resalta el active.
   - Para esta fase, implementar al menos: General (org name), HubSpot
     connection (la card destacada con Re-sync + Disconnect), Sync
     (toggles del MIGRATION.md), AI (toggle + model select).

4. HubSpot connection card:
   - Avatar cuadrado #FF7A59 (HubSpot orange) con "H" centrada.
   - Status badge "Live" success dot.
   - Stats: contactos sincronizados (mono), connected date, connected by.
   - Actions: "Re-sync" secondary + "Disconnect" danger.

5. Server Actions necesarios:
   - updateOrgSettings({field, value}) — para org name, toggles.
   - disconnectHubSpot() — invalida tokens y limpia state.
   - triggerResync() — kicks off cron sync manualmente.

NO avancés a la siguiente fase sin confirmación.

═══════════════════════════════════════════════════════════════════════════
FASE 5 — Conflicts inbox (NUEVA ruta)
═══════════════════════════════════════════════════════════════════════════

Crear /conflicts como ruta dedicada. Hoy los conflicts se muestran como
banner inline; vamos a darles una vista propia.

1. Crear app/(app)/conflicts/page.tsx (Server Component) que:
   - Fetch de sync_events donde event_type='conflict' AND resolved_at IS NULL,
     ordenados por created_at desc, joinear con contacts.
   - Si no hay conflicts → <EmptyState> "Todo en sync" success.
   - Si hay → <ConflictsInbox initialConflicts={...} orgId={...} />.

2. Crear components/conflicts/ConflictsInbox.tsx (Client Component):
   - Layout: 380px left list + flex-1 right detail.
   - State: selectedConflictId (default: first item).
   - Realtime: suscribir a sync_events INSERT/UPDATE con
     filter=`event_type=eq.conflict` para refrescar en vivo.
   - Render <ConflictListItem> array + <ConflictDetail conflict={selected} />.

3. Crear components/conflicts/ConflictListItem.tsx:
   - Avatar + name + time (mono, small) + field chip + 2 líneas de diff
     (local: ... remote: ...).
   - Active: bg-bg-subtle + border-left 2px brand.

4. Crear components/conflicts/ConflictDetail.tsx:
   - Header: avatar lg + name + contact_id mono + Badge conflict pulse.
   - Card "¿Qué pasó?": timeline de 3 entradas explicando el conflict.
   - Section "Elegí qué versión queda": 2 <ConflictDiffCard> side-by-side.
     Click selecciona; selected tiene border 2px brand + checkmark circular
     superior derecho.
   - Footer: "Posponer" (ghost izq) + "Editar manual" (secondary) +
     "Aplicar [winner]" (primary).

5. Server Action: actions/conflicts.ts → resolveConflict({
     contactId: string,
     field: string,
     winner: 'local' | 'remote' | 'manual',
     manualValue?: string,
   }).
   - Pushea el valor ganador a HubSpot via API + actualiza local.
   - Marca el sync_event como resolved.
   - revalidatePath('/conflicts') y '/contacts/[id]'.

6. Agregar count en el Sidebar (link "Conflictos · 3") basado en el
   count de conflicts pending. Realtime para que baje a 2/1/0 al resolver.

═══════════════════════════════════════════════════════════════════════════
FASE 6 — EmptyState component + Chat upgrade
═══════════════════════════════════════════════════════════════════════════

6.1 — EmptyState component

1. Crear components/ui/empty-state.tsx según MIGRATION.md §2.3:
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

2. Crear components/ui/empty-glyph.tsx con 4 variantes SVG inline (NO emoji,
   NO Lucide directo): contacts, check, search, chat. Cuadrado 56x56,
   bg-bg-subtle (success-subtle si tone=success), stroke 1.5.

3. Aplicar en ContactList, ConflictsScreen (cuando no hay conflicts),
   AiInsightsPanel (inline variant).

6.2 — Chat upgrade

La página /chat existe pero es plana. Adoptar el layout del Chat artboard.

1. Reescribir components/chat/ContactsChat.tsx:
   - Layout 3-col: AppSidebar (ya está) + history rail (260px nuevo) +
     conversation.
   - History rail: lista de conversaciones agrupadas por fecha (Hoy / Ayer
     / Esta semana). Item active con bg-bg-subtle.
   - Composer: card con bg-bg-surface, border-strong, shadow-md.

2. Crear components/chat/ChatMessage.tsx:
   - Variant 'user': chip a la derecha con bg-bg-subtle, border-radius
     12px excepto top-right que es 4px.
   - Variant 'ai': ícono Sparkles 28x28 rounded-square brand-subtle +
     contenido. Soporta tablas inline (mismo style que ContactList).
   - Variant thinking: 3 dots animados.

3. La page del chat puede manejar persistencia de conversations con
   una nueva tabla `chat_conversations` (id, org_id, title, created_at,
   updated_at) + `chat_messages` (id, conversation_id, role, content,
   created_at). Migración SQL nueva en supabase/migrations/008_chat.sql.

═══════════════════════════════════════════════════════════════════════════
FASE 7 — Dialog primitives + 3 dialogs existentes
═══════════════════════════════════════════════════════════════════════════

El repo ya tiene shadcn/ui Dialog en components/ui/dialog.tsx. NO lo
toques; lo consume bien con los nuevos tokens. Pero los 3 dialogs propios
necesitan adopción del look del DS (icono cuadrado en el header, footer
con bg-bg-base, etc.).

Leé MIGRATION.md §9.2, §9.3, §9.7 antes de tocar nada.

7.1 — components/contacts/EmailDraftDialog.tsx

Ya existe. Refactor:
- Wrappear el DialogTitle en un <div flex items-center gap-3> con un
  icon tile cuadrado 32x32 background brand-subtle (sparkles dentro).
- Tone picker: que el active tenga border-brand bg-brand-subtle.
- Rationale callout: card bg-brand-subtle border-brand/40 con label
  "Por qué este enfoque:" en font-medium text-brand-on-subtle.
- Footer: Regenerar (ghost) + Copiar (secondary) + Abrir en mail (primary).

7.2 — components/contacts/ConflictDiffDialog.tsx

Ya existe. Refactor:
- Header con icon "alert-triangle" en tile error-subtle.
- Meta bar: bg-bg-subtle con timestamp + bulk action buttons.
- Header row (CAMPO · LOCAL · HUBSPOT): chico, uppercase mono,
  CON dot indicators a la izquierda de "Local" (info azul) y
  "HubSpot" (warning naranja).
- DiffCell: estados según MIGRATION.md §9.3.

7.3 — components/contacts/FilterSummaryDialog.tsx

Ya existe. Refactor:
- Header con icon sparkles brand tile.
- Stats bar con success/warning indicator según muestra completa/parcial.
- Body: estructurar la respuesta de la IA en 3 secciones
  (Patrones, Gaps, Próximos pasos) si el modelo lo respeta — sino
  renderizar como markdown plano. Headings bold color brand-on-subtle.

Mostrame el diff de cada uno antes de avanzar al siguiente.

═══════════════════════════════════════════════════════════════════════════
FASE 8 — Dashboard + SimilarContacts + Citations
═══════════════════════════════════════════════════════════════════════════

8.1 — Dashboard rediseño

Archivo: app/(app)/dashboard/page.tsx + components/dashboard/DashboardPriorities.tsx

Leé MIGRATION.md §9.8 para el spec completo. Cambios clave:
- Hero: eyebrow con la fecha en mono uppercase + título "Hola, {orgName}"
  + insight automático en el subtitle (calcular delta del último mes).
- Stat cards: rediseñar StatCard con icon-tile + delta en mono.
- Breakdown cards: bar 4px (no 1.5px), tonal fill (brand para top item,
  border-strong para resto).
- DashboardPriorities card: usar background brand-subtle como destacada.
  El icon tile del header sólido brand (#fff icon). Items en bg-bg-surface
  cards dentro.

NO cambies los Server Actions de getTopPriorities — sólo el componente.

8.2 — SimilarContactsPanel

Archivo: components/contacts/SimilarContactsPanel.tsx

Leé MIGRATION.md §9.1. Refactor:
- Avatar + meta layout.
- SimilarityBadge con tres tiers (85/70/below) en colores
  success/brand/neutral.
- Reemplazar Users2 de Lucide por nuestro icon "users" si el design
  system los expone; sino mantener Lucide.

Integrarlo en app/(app)/contacts/[id]/page.tsx como un panel adicional
en la columna derecha (debajo del AiInsightsPanel) si no estaba ya.

8.3 — Citations + persona + voice en Chat

Archivo: components/chat/ContactsChat.tsx

Leé MIGRATION.md §9.4, §9.5, §9.6. Refactor:

8.3.1 Mensajes
- User: bubble con bg-bg-subtle (NO brand), border-default,
  border-top-right-radius 4px (cola sutil).
- AI: icon tile sparkles + texto plano sin bubble grande.
- Layout: AI ocupa 100% del width disponible (no maxWidth 80%),
  user sí maxWidth 80%.

8.3.2 Citations
- Componente <Citations contacts={[...]} /> debajo del mensaje AI.
- Label mono 10px uppercase + chips redondeados.
- CitationChip: pill (rounded-full), border-default, hover brand,
  formato "Nombre · Empresa", ExternalLink icon hover-only.

8.3.3 Persona toggle
- Mover del header current al top-right como segmented control.
- Label "PERSONA" arriba en mono 10px.
- Active: bg-brand text-primary-foreground.

8.3.4 Voice input
- Mic button al lado del Enviar (no en su propia card).
- Listening indicator banner ARRIBA del composer.
- Interim transcript en italic text-secondary.

═══════════════════════════════════════════════════════════════════════════
FASE 9 — Limpieza
═══════════════════════════════════════════════════════════════════════════

1. Buscar hardcodes residuales:
   grep -rn "#6366F1\|#0A0A0F\|#9494B8" app/ components/

2. Buscar usos de la familia Syne:
   grep -rn "font-heading\|font-syne" app/ components/
   Si aparecen, reemplazar font-heading por font-sans (todo es Geist
   ahora, no hay display alternativa).

3. Buscar usos de dark class hardcodeada:
   grep -rn "className=\"dark" app/ components/

4. Verificar que tsc / eslint pasen:
   pnpm typecheck
   pnpm lint

═══════════════════════════════════════════════════════════════════════════
FASE 10 — Toggle dark mode (OPCIONAL — preguntame antes)
═══════════════════════════════════════════════════════════════════════════

El design system soporta dark mode pero la app es light-first. Si querés
agregar un toggle:

- Botón en el Sidebar (abajo, cerca del logout).
- Persistir en localStorage.
- Aplicar/sacar class="dark" en <html>.
- No hace falta soportar "system" — sólo light/dark manual.

Esperá mi confirmación antes de hacer esto.

═══════════════════════════════════════════════════════════════════════════
REGLAS GENERALES
═══════════════════════════════════════════════════════════════════════════

- Seguir las reglas del INIT_PLAN.md (en la raíz del proyecto): preguntar
  antes de asumir, agrupar preguntas, proponer soluciones, confirmar plan
  antes de codear.
- No tocar componentes shadcn en components/ui/ (excepto el avatar nuevo).
  Si encontrás un bug ahí, decímelo en vez de patchearlo.
- No agregar dependencias nuevas sin confirmarme (excepto `geist`).
- Cada commit tiene que dejar el repo en estado funcional. Si una fase
  no se puede completar atomically, dividila.
```

---

## Bonus — comandos previos a la migración

Antes de ejecutar el prompt, hacé:

```bash
# 1. Crear branch para la migración
git checkout -b design-system-v2

# 2. Copiar los archivos del design system al repo
mkdir -p design-system
# (Copiá globals.css y MIGRATION.md desde acá a design-system/ en tu repo)

# 3. Verificar que el repo arranca antes de empezar
pnpm install
pnpm dev
# (Confirmá que la versión vieja levanta sin errores)

# 4. Levantar Claude Code y pegar el prompt de arriba
```

## Bonus — qué hacer después de cada fase

- Después de **Fase 1**: commit `chore(design-system): apply v2 tokens & switch to Geist`. Si algo se rompió, los componentes shadcn no, pero los propios pueden verse raros — eso se arregla en Fase 3.
- Después de **Fase 2**: commit `feat(ui): add Avatar component + redesign landing`.
- Después de **Fase 3**: commits separados por componente (`feat(contacts): adopt design system v2 in ContactList`, etc.).
- Después de **Fase 4**: commit `feat(settings): redesign settings page with sub-nav`.
- Después de **Fase 5**: commit `feat(conflicts): add dedicated conflicts inbox at /conflicts`.
- Después de **Fase 6**: dos commits — `feat(ui): add EmptyState component` y `feat(chat): redesign chat with history rail and message bubbles`.
- Después de **Fase 7**: tres commits — uno por dialog (`feat(contacts): redesign EmailDraftDialog`, etc.).
- Después de **Fase 8**: tres commits — `feat(dashboard): redesign dashboard with v2 system`, `feat(contacts): redesign SimilarContactsPanel`, `feat(chat): add citations + voice + persona toggle redesign`.
- Después de **Fase 9**: commit `chore: remove design system v1 residuals`.

## Bonus — para la entrevista

Cuando muestres el resultado, llevá:

1. El canvas del design system abierto (este archivo HTML).
2. La app corriendo en localhost con el nuevo diseño.
3. Una página de commits limpia mostrando la migración fase por fase.
4. Una respuesta de 30s a "por qué este sistema y no otro": **light-first
   porque B2B serio se ve light hoy (Linear, Vercel, Attio, Stripe);
   cobalt porque es accent corporativo sin el AI-demo de indigo neón;
   Geist porque tiene carácter sin teatralidad; hairlines porque los
   shadows pesados envejecen mal en producto B2B.**
