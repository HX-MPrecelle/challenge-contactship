import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyGlyph } from "@/components/ui/empty-glyph";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-border-default pb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">ContactShip</span>
        <span className="text-xs text-text-muted">/</span>
        <span className="text-xs font-mono text-brand uppercase tracking-widest">Design System</span>
      </div>
      <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
      <p className="mt-1.5 text-sm text-text-secondary">{description}</p>
    </div>
  );
}

function SectionTitle({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div id={id} className="pt-10 pb-5 border-b border-border-default mb-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </h3>
  );
}

function TokenRow({ name, value, preview }: { name: string; value: string; preview?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2 border-b border-border-default last:border-0">
      {preview && <div className="shrink-0">{preview}</div>}
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-text-primary">{name}</p>
      </div>
      <p className="font-mono text-xs text-text-muted">{value}</p>
    </div>
  );
}

function ColorSwatch({
  label,
  token,
  value,
  textClass = "text-text-primary",
}: {
  label: string;
  token: string;
  value: string;
  textClass?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-12 w-full rounded-lg border border-border-default"
        style={{ background: `var(${token})` }}
      />
      <div>
        <p className="text-xs font-medium text-text-primary">{label}</p>
        <p className="font-mono text-[10px] text-text-muted">{token}</p>
        <p className="font-mono text-[10px] text-text-muted">{value}</p>
      </div>
    </div>
  );
}

function DemoFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-default bg-bg-base overflow-hidden">
      <div className="flex items-center justify-between border-b border-border-default bg-bg-surface px-4 py-2">
        <span className="font-mono text-[11px] text-text-muted">{label}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  return (
    <div className="min-h-full bg-bg-base">
      {/* Sticky TOC sidebar + main content */}
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex gap-10">

          {/* Sticky TOC */}
          <nav className="hidden lg:block w-44 shrink-0">
            <div className="sticky top-6 flex flex-col gap-0.5">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Contents</p>
              {[
                ["#colors", "Colors"],
                ["#typography", "Typography"],
                ["#spacing", "Spacing & Radius"],
                ["#shadows", "Shadows"],
                ["#buttons", "Buttons"],
                ["#badges", "Badges"],
                ["#cards", "Cards"],
                ["#forms", "Forms"],
                ["#avatars", "Avatars"],
                ["#feedback", "Feedback"],
                ["#loading", "Loading"],
                ["#empty", "Empty States"],
                ["#patterns", "Patterns"],
              ].map(([href, label]) => (
                <a
                  key={href}
                  href={href!}
                  className="rounded-md px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                >
                  {label}
                </a>
              ))}
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <PageHeader
              title="Design System"
              description="Tokens, componentes y patrones de ContactShip v2.0. Cobalt-first, light mode by default."
            />

            {/* ── COLORS ─────────────────────────────────────────────── */}
            <SectionTitle
              id="colors"
              title="Colors"
              description="Variables CSS expuestas como clases Tailwind vía @theme inline."
            />

            <SubTitle>Brand — Cobalt</SubTitle>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch label="Brand" token="--brand" value="#2348C9 / #7B92FF" />
              <ColorSwatch label="Brand Hover" token="--brand-hover" value="#1B3AAF / #94A7FF" />
              <ColorSwatch label="Brand Subtle" token="--brand-subtle" value="#EEF2FF / #1A1F36" />
              <ColorSwatch label="Brand Ring" token="--brand-ring" value="rgba(35,72,201,.18)" />
            </div>

            <SubTitle>Backgrounds</SubTitle>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch label="Base" token="--bg-base" value="#FBFBFA" />
              <ColorSwatch label="Surface" token="--bg-surface" value="#FFFFFF" />
              <ColorSwatch label="Elevated" token="--bg-elevated" value="#FFFFFF" />
              <ColorSwatch label="Subtle" token="--bg-subtle" value="#F5F5F4" />
            </div>

            <SubTitle>Text</SubTitle>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch label="Primary" token="--text-primary" value="#0F1115" />
              <ColorSwatch label="Secondary" token="--text-secondary" value="#5B5F66" />
              <ColorSwatch label="Muted" token="--text-muted" value="#9098A0" />
              <div className="flex flex-col gap-2">
                <div className="h-12 w-full rounded-lg border border-border-default bg-text-primary flex items-center justify-center">
                  <span className="text-xs font-medium text-white">Inverse</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">Inverse</p>
                  <p className="font-mono text-[10px] text-text-muted">--text-inverse</p>
                  <p className="font-mono text-[10px] text-text-muted">#FFFFFF</p>
                </div>
              </div>
            </div>

            <SubTitle>Borders</SubTitle>
            <div className="mb-8 grid grid-cols-3 gap-4">
              <ColorSwatch label="Default" token="--border-default" value="#E6E6E4" />
              <ColorSwatch label="Strong" token="--border-strong" value="#D4D4D2" />
              <ColorSwatch label="Focus" token="--border-focus" value="#2348C9" />
            </div>

            <SubTitle>Semantic States</SubTitle>
            <div className="mb-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch label="Success" token="--success" value="#0A7C5A" />
              <ColorSwatch label="Warning" token="--warning" value="#A8530B" />
              <ColorSwatch label="Error" token="--error" value="#B42318" />
              <ColorSwatch label="Info" token="--info" value="#1849A9" />
            </div>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ColorSwatch label="Success Subtle" token="--success-subtle" value="#ECFBF4" />
              <ColorSwatch label="Warning Subtle" token="--warning-subtle" value="#FDF3E7" />
              <ColorSwatch label="Error Subtle" token="--error-subtle" value="#FEF3F2" />
              <ColorSwatch label="Info Subtle" token="--info-subtle" value="#EFF4FF" />
            </div>

            {/* ── TYPOGRAPHY ─────────────────────────────────────────── */}
            <SectionTitle
              id="typography"
              title="Typography"
              description="Geist Sans + Geist Mono. Escala compacta, letter-spacing: -0.005em."
            />

            <DemoFrame label="Type scale">
              <div className="flex flex-col gap-4">
                {[
                  { size: "text-3xl", label: "3xl — 36px / Display", specimen: "ContactShip AI" },
                  { size: "text-2xl", label: "2xl — 28px / H1", specimen: "Manage your contacts" },
                  { size: "text-xl", label: "xl — 22px / H2", specimen: "Recently synced" },
                  { size: "text-lg", label: "lg — 18px / H3", specimen: "Quick actions" },
                  { size: "text-md", label: "md — 15px / Lead", specimen: "Review suggested contacts to add to your pipeline" },
                  { size: "text-base", label: "base — 14px / Body", specimen: "The quick brown fox jumps over the lazy dog" },
                  { size: "text-sm", label: "sm — 13px / Secondary", specimen: "Last updated 2 hours ago · 142 contacts" },
                  { size: "text-xs", label: "xs — 11px / Caption / Badge", specimen: "SYNCED · PENDING · CONFLICT" },
                ].map(({ size, label, specimen }) => (
                  <div key={size} className="flex items-baseline gap-4 border-b border-border-default pb-4 last:border-0 last:pb-0">
                    <div className="w-40 shrink-0">
                      <p className="font-mono text-[10px] text-text-muted">{label}</p>
                    </div>
                    <p className={cn(size, "text-text-primary leading-tight")}>{specimen}</p>
                  </div>
                ))}
              </div>
            </DemoFrame>

            <div className="mt-6">
              <DemoFrame label="Font weights">
                <div className="flex flex-col gap-3">
                  {[
                    { weight: "font-normal", label: "400 — Normal" },
                    { weight: "font-medium", label: "500 — Medium" },
                    { weight: "font-semibold", label: "600 — Semibold" },
                    { weight: "font-bold", label: "700 — Bold" },
                  ].map(({ weight, label }) => (
                    <div key={weight} className="flex items-center gap-4">
                      <span className="w-28 font-mono text-[10px] text-text-muted">{label}</span>
                      <span className={cn("text-base text-text-primary", weight)}>
                        The quick brown fox
                      </span>
                    </div>
                  ))}
                </div>
              </DemoFrame>
            </div>

            <div className="mt-6">
              <DemoFrame label="Mono — code / tabular data">
                <p className="font-mono text-sm text-text-primary">
                  contact.email === &quot;martin@example.com&quot; &amp;&amp; contact.synced
                </p>
                <p className="mt-2 font-mono text-sm text-text-secondary tabular-nums">
                  1,234,567 · $99.00 · 08:42:17
                </p>
              </DemoFrame>
            </div>

            {/* ── SPACING & RADIUS ──────────────────────────────────── */}
            <SectionTitle id="spacing" title="Spacing & Radius" />

            <SubTitle>Border Radius</SubTitle>
            <div className="mb-8 grid grid-cols-3 gap-4 sm:grid-cols-5">
              {[
                { label: "sm", token: "--radius-sm", approx: "~5px" },
                { label: "md", token: "--radius-md", approx: "~6px" },
                { label: "lg", token: "--radius-lg", approx: "8px" },
                { label: "xl", token: "--radius-xl", approx: "~11px" },
                { label: "2xl", token: "--radius-2xl", approx: "~14px" },
              ].map(({ label, token, approx }) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="h-12 w-full border-2 border-border-strong bg-brand-subtle"
                    style={{ borderRadius: `var(${token})` }}
                  />
                  <div className="text-center">
                    <p className="text-xs font-medium text-text-primary">{label}</p>
                    <p className="font-mono text-[10px] text-text-muted">{approx}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── SHADOWS ───────────────────────────────────────────── */}
            <SectionTitle id="shadows" title="Shadows" />
            <div className="mb-8 grid grid-cols-3 gap-6">
              {[
                { label: "shadow-cs-sm", desc: "Subtly elevated — inputs, tags" },
                { label: "shadow-cs-md", desc: "Cards, panels, popovers" },
                { label: "shadow-cs-lg", desc: "Modals, drawers" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex flex-col gap-3">
                  <div
                    className="h-16 w-full rounded-xl bg-bg-surface"
                    style={{ boxShadow: `var(--${label.replace("shadow-cs-", "shadow-")})` }}
                  />
                  <div>
                    <p className="font-mono text-xs text-text-primary">{label}</p>
                    <p className="text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── BUTTONS ───────────────────────────────────────────── */}
            <SectionTitle
              id="buttons"
              title="Buttons"
              description="6 variantes × 7 tamaños. Soporta asChild para composición."
            />

            <SubTitle>Variants</SubTitle>
            <DemoFrame label="All variants — size default">
              <div className="flex flex-wrap gap-3">
                <Button variant="default">Default</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </DemoFrame>

            <div className="mt-4">
              <SubTitle>Sizes</SubTitle>
              <DemoFrame label="All sizes — variant default">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </DemoFrame>
            </div>

            <div className="mt-4">
              <SubTitle>Icon buttons</SubTitle>
              <DemoFrame label="Icon sizes">
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="icon-xs" variant="outline"><Plus /></Button>
                  <Button size="icon-sm" variant="outline"><Settings /></Button>
                  <Button size="icon" variant="outline"><Bell /></Button>
                  <Button size="icon-lg" variant="outline"><Download /></Button>
                </div>
              </DemoFrame>
            </div>

            <div className="mt-4">
              <SubTitle>With icons</SubTitle>
              <DemoFrame label="Leading + trailing icons">
                <div className="flex flex-wrap gap-3">
                  <Button><Plus />Add Contact</Button>
                  <Button variant="outline">Export<Download /></Button>
                  <Button variant="outline"><Search />Search contacts</Button>
                  <Button variant="destructive"><Trash2 />Delete</Button>
                  <Button disabled><Loader2 className="animate-spin" />Loading…</Button>
                </div>
              </DemoFrame>
            </div>

            {/* ── BADGES ────────────────────────────────────────────── */}
            <SectionTitle
              id="badges"
              title="Badges"
              description="Pill components para estados, categorías y etiquetas."
            />

            <SubTitle>Base variants</SubTitle>
            <DemoFrame label="shadcn variants">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="ghost">Ghost</Badge>
              </div>
            </DemoFrame>

            <div className="mt-4">
              <SubTitle>Semantic variants</SubTitle>
              <DemoFrame label="success / warning / error / info — usan tokens del sistema">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Synced</Badge>
                  <Badge variant="warning">Pending</Badge>
                  <Badge variant="error">Conflict</Badge>
                  <Badge variant="info">Info</Badge>
                </div>
              </DemoFrame>
            </div>

            <div className="mt-4">
              <SubTitle>With icons</SubTitle>
              <DemoFrame label="Leading icon">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success"><Check />Synced</Badge>
                  <Badge variant="error"><AlertCircle />Error</Badge>
                  <Badge variant="outline"><User />Assigned</Badge>
                </div>
              </DemoFrame>
            </div>

            {/* ── CARDS ─────────────────────────────────────────────── */}
            <SectionTitle
              id="cards"
              title="Cards"
              description="Contenedor principal de contenido. Soporte para tamaño default y sm."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Card default</CardTitle>
                  <CardDescription>Descripción secundaria del contenido</CardDescription>
                  <CardAction>
                    <Button size="icon-sm" variant="ghost"><Settings /></Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-secondary">
                    Contenido principal del card. Puede incluir cualquier elemento.
                  </p>
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-xs text-text-muted">Actualizado hace 2h</span>
                  <Button size="xs" variant="outline">Ver más<ChevronRight /></Button>
                </CardFooter>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>Card sm</CardTitle>
                  <CardDescription>Variante compacta para widgets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold text-text-primary">1,284</span>
                    <Badge variant="success">+12%</Badge>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">Total contacts</p>
                </CardContent>
              </Card>
            </div>

            {/* ── FORMS ─────────────────────────────────────────────── */}
            <SectionTitle id="forms" title="Forms" />

            <DemoFrame label="Input states">
              <div className="flex flex-col gap-4 max-w-xs">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="input-default">Default</Label>
                  <Input id="input-default" placeholder="martin@example.com" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="input-disabled">Disabled</Label>
                  <Input id="input-disabled" placeholder="Disabled input" disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="input-error">Error</Label>
                  <Input id="input-error" placeholder="Invalid email" aria-invalid="true" />
                  <p className="text-xs text-error">Email address is required</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="input-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-muted" />
                    <Input id="input-search" className="pl-8" placeholder="Search contacts…" />
                  </div>
                </div>
              </div>
            </DemoFrame>

            {/* ── AVATARS ───────────────────────────────────────────── */}
            <SectionTitle id="avatars" title="Avatars" />

            <DemoFrame label="Sizes — genera iniciales + color desde el nombre">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Martin Precelle" size={24} />
                  <span className="font-mono text-[10px] text-text-muted">24px</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Martin Precelle" size={32} />
                  <span className="font-mono text-[10px] text-text-muted">32px</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Martin Precelle" size={40} />
                  <span className="font-mono text-[10px] text-text-muted">40px</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Martin Precelle" size={48} />
                  <span className="font-mono text-[10px] text-text-muted">48px</span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Avatar name="Ana García" size={32} />
                <Avatar name="Bob Smith" size={32} />
                <Avatar name="Carol White" size={32} />
                <Avatar name="David Brown" size={32} />
                <Avatar name="Elena Martínez" size={32} />
                <span className="text-xs text-text-muted">Cada nombre genera un hue único</span>
              </div>
            </DemoFrame>

            {/* ── FEEDBACK ──────────────────────────────────────────── */}
            <SectionTitle
              id="feedback"
              title="Feedback / Alerts"
              description="Banners de estado semántico usando los tokens del sistema."
            />

            <div className="flex flex-col gap-3">
              {[
                {
                  variant: "success",
                  icon: <Check className="size-4 text-success" />,
                  title: "Contact synced",
                  message: "martin@example.com was successfully pushed to HubSpot.",
                  bg: "bg-success-subtle",
                  border: "border-success/20",
                  text: "text-success",
                  body: "text-text-secondary",
                },
                {
                  variant: "warning",
                  icon: <AlertCircle className="size-4 text-warning" />,
                  title: "Sync pending",
                  message: "Changes are queued and will sync within 5 minutes.",
                  bg: "bg-warning-subtle",
                  border: "border-warning/20",
                  text: "text-warning",
                  body: "text-text-secondary",
                },
                {
                  variant: "error",
                  icon: <AlertCircle className="size-4 text-error" />,
                  title: "Conflict detected",
                  message: "Email field differs between CRM and HubSpot. Review required.",
                  bg: "bg-error-subtle",
                  border: "border-error/20",
                  text: "text-error",
                  body: "text-text-secondary",
                },
                {
                  variant: "info",
                  icon: <Bell className="size-4 text-info" />,
                  title: "New contacts detected",
                  message: "3 contacts from your last HubSpot import are ready to review.",
                  bg: "bg-info-subtle",
                  border: "border-info/20",
                  text: "text-info",
                  body: "text-text-secondary",
                },
              ].map(({ variant, icon, title, message, bg, border, text, body }) => (
                <div
                  key={variant}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-4 py-3",
                    bg,
                    border
                  )}
                >
                  <div className="mt-0.5 shrink-0">{icon}</div>
                  <div>
                    <p className={cn("text-sm font-medium", text)}>{title}</p>
                    <p className={cn("text-sm", body)}>{message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── LOADING ───────────────────────────────────────────── */}
            <SectionTitle
              id="loading"
              title="Loading States"
              description="Skeleton y progress para estados de carga."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <DemoFrame label="Skeleton — contact row">
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </DemoFrame>

              <DemoFrame label="Progress bar">
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs text-text-secondary">Sync progress</span>
                      <span className="text-xs font-medium text-text-primary">68%</span>
                    </div>
                    <Progress value={68} className="h-2" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs text-text-secondary">Contacts imported</span>
                      <span className="text-xs font-medium text-text-primary">1,284 / 2,000</span>
                    </div>
                    <Progress value={64} className="h-1.5" />
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between">
                      <span className="text-xs text-text-secondary">AI processing</span>
                      <span className="text-xs font-medium text-text-primary">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </div>
              </DemoFrame>
            </div>

            {/* ── EMPTY STATES ──────────────────────────────────────── */}
            <SectionTitle id="empty" title="Empty States" />

            <DemoFrame label="EmptyState component">
              <div className="flex items-center justify-center border border-dashed border-border-strong rounded-xl py-4">
                <div className="flex flex-col items-center gap-4 py-10 text-center">
                  <EmptyGlyph kind="contacts" />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm font-semibold text-text-primary">No contacts yet</p>
                    <p className="max-w-xs text-sm text-text-secondary">
                      Import from HubSpot or add contacts manually to get started.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm"><Plus />Add contact</Button>
                    <Button size="sm" variant="outline">Import from HubSpot</Button>
                  </div>
                </div>
              </div>
            </DemoFrame>

            {/* ── PATTERNS ──────────────────────────────────────────── */}
            <SectionTitle
              id="patterns"
              title="Patterns"
              description="Combinaciones recurrentes usadas en el producto."
            />

            <SubTitle>Sync status badge</SubTitle>
            <DemoFrame label="SyncStatusBadge — status → token mapping">
              <div className="flex flex-wrap gap-3">
                {[
                  { status: "synced", bg: "bg-success-subtle", text: "text-success", dot: "bg-success" },
                  { status: "pending", bg: "bg-warning-subtle", text: "text-warning", dot: "bg-warning", animate: "animate-pulse-dot" },
                  { status: "conflict", bg: "bg-error-subtle", text: "text-error", dot: "bg-error animate-pulse-dot" },
                  { status: "error", bg: "bg-error-subtle", text: "text-error", dot: "bg-error" },
                ].map(({ status, bg, text, dot }) => (
                  <span
                    key={status}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
                      bg,
                      text
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                    {status}
                  </span>
                ))}
              </div>
            </DemoFrame>

            <div className="mt-6">
              <SubTitle>Page header pattern</SubTitle>
              <DemoFrame label="Standard page header — title + action">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-semibold text-text-primary">Contacts</h1>
                    <p className="text-sm text-text-secondary">1,284 contacts · last synced 2h ago</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><Search />Search</Button>
                    <Button size="sm"><Plus />Add contact</Button>
                  </div>
                </div>
              </DemoFrame>
            </div>

            <div className="mt-6">
              <SubTitle>Separator</SubTitle>
              <DemoFrame label="Horizontal separator">
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-text-secondary">Section above</p>
                  <Separator />
                  <p className="text-sm text-text-secondary">Section below</p>
                </div>
              </DemoFrame>
            </div>

            {/* Token reference table */}
            <SectionTitle
              id="tokens"
              title="Token Reference"
              description="Referencia rápida de todas las variables CSS expuestas como utilidades Tailwind."
            />

            <div className="rounded-xl border border-border-default overflow-hidden">
              <div className="grid grid-cols-3 gap-4 bg-bg-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                <span>Token CSS</span>
                <span>Clase Tailwind</span>
                <span>Descripción</span>
              </div>
              {[
                ["--brand", "bg-brand / text-brand / border-brand", "Cobalt primario"],
                ["--brand-hover", "bg-brand-hover", "Estado hover del brand"],
                ["--brand-subtle", "bg-brand-subtle", "Fondo suave del brand"],
                ["--bg-base", "bg-bg-base", "Fondo de la app shell"],
                ["--bg-surface", "bg-bg-surface", "Fondo de cards y paneles"],
                ["--bg-subtle", "bg-bg-subtle", "Hover / zebra rows"],
                ["--text-primary", "text-text-primary", "Texto principal"],
                ["--text-secondary", "text-text-secondary", "Texto secundario"],
                ["--text-muted", "text-text-muted", "Texto atenuado / placeholders"],
                ["--border-default", "border-border-default", "Borde estándar"],
                ["--border-strong", "border-border-strong", "Borde reforzado"],
                ["--border-focus", "border-border-focus", "Anillo de foco"],
                ["--success", "text-success / bg-success", "Estado éxito"],
                ["--success-subtle", "bg-success-subtle", "Fondo estado éxito"],
                ["--warning", "text-warning / bg-warning", "Estado advertencia"],
                ["--warning-subtle", "bg-warning-subtle", "Fondo estado advertencia"],
                ["--error", "text-error / bg-error", "Estado error"],
                ["--error-subtle", "bg-error-subtle", "Fondo estado error"],
                ["--info", "text-info / bg-info", "Estado informativo"],
                ["--info-subtle", "bg-info-subtle", "Fondo estado informativo"],
                ["--shadow-sm", "shadow-cs-sm", "Elevación leve"],
                ["--shadow-md", "shadow-cs-md", "Elevación media"],
                ["--shadow-lg", "shadow-cs-lg", "Elevación alta"],
              ].map(([token, util, desc]) => (
                <div
                  key={token}
                  className="grid grid-cols-3 gap-4 px-4 py-2.5 border-t border-border-default text-xs hover:bg-bg-subtle transition-colors"
                >
                  <span className="font-mono text-text-primary">{token}</span>
                  <span className="font-mono text-brand">{util}</span>
                  <span className="text-text-secondary">{desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 pb-10 text-center">
              <p className="font-mono text-xs text-text-muted">
                ContactShip Design System v2.0 · Cobalt · Tailwind v4 · shadcn/ui Radix Nova
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
