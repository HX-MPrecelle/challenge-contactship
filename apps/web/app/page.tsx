import Link from "next/link";
import { ArrowRight, Sparkles, Zap, Database } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--accent)_0%,_transparent_60%)] opacity-30" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]" />

      <nav className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            ContactShip
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </div>
      </nav>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
          Realtime · AI-native · Built on HubSpot
        </div>
        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
          The AI copilot that
          <br />
          <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            operates your CRM.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-balance">
          ContactShip mirrors HubSpot in realtime and gives you a workspace
          where you — and an AI agent — can actually run sales operations.
        </p>
        <div className="mt-10 flex items-center gap-3">
          <Link
            href="/login"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-all hover:bg-foreground/90"
          >
            Get started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-24 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<Zap className="h-4 w-4" />}
            title="Realtime mirror"
            description="Webhooks keep your local workspace in sync with HubSpot in under a second."
          />
          <FeatureCard
            icon={<Sparkles className="h-4 w-4" />}
            title="AI Copilot"
            description="Streaming tool calls. The AI doesn't summarize — it operates."
          />
          <FeatureCard
            icon={<Database className="h-4 w-4" />}
            title="Local-first ops"
            description="Mutations are instant. Sync is observable. Conflicts are surfaced, not hidden."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/30 p-5 text-left backdrop-blur transition-colors hover:bg-card/60">
      <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
