import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { BrandMark } from "@/components/app/brand-mark";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Schedule with precision",
    description:
      "Run once, on intervals, or on recurring schedules.",
    icon: CalendarClock,
  },
  {
    title: "Build workflow logic",
    description:
      "Build trigger, delay, condition, and action flows.",
    icon: Waypoints,
  },
  {
    title: "Track every run",
    description:
      "See runs, workers, and delivery status in one view.",
    icon: Activity,
  },
  {
    title: "Operate safely",
    description:
      "Keep control, visibility, and tenant safety built in.",
    icon: ShieldCheck,
  },
];

export default function Index() {
  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,hsl(220_24%_9%),hsl(220_22%_8%)_46%,hsl(214_20%_10%))] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,hsl(8_88%_58%/0.18),transparent_36%),radial-gradient(circle_at_top_right,hsl(188_72%_52%/0.16),transparent_34%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[32rem] bg-[radial-gradient(circle_at_bottom_left,hsl(8_88%_58%/0.12),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(188_72%_52%/0.12),transparent_30%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,hsl(220_22%_8%/0.42)_30%,hsl(220_22%_8%/0.75)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1380px] flex-col rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,hsl(220_24%_10%/0.92),hsl(220_20%_11%/0.9))] p-4 shadow-[0_28px_90px_-50px_rgba(15,23,42,0.62)] backdrop-blur-xl sm:p-6 lg:p-8">
        <header className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-border/60 bg-card/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[1.2rem] border border-border/60 bg-white/80 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)] dark:bg-white/10">
              <BrandMark size={30} priority />
            </div>
            <div className="text-sm font-semibold tracking-[-0.02em]">Scheduler</div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl px-4">
              <Link href="/login">
                Open app
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-6 pt-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,0.8fr)] lg:items-stretch">
          <div className="hero-glow overflow-hidden rounded-[2rem] border border-border/70 p-6 sm:p-8 lg:p-10">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                Workflow platform
              </div>
              <h1 className="mt-5 flex flex-col gap-3 text-[2.7rem] font-semibold leading-[0.96] tracking-[-0.06em] text-foreground sm:gap-4 sm:text-[3.8rem] lg:gap-5 lg:text-[4.4rem]">
                <span>Schedule jobs.</span>
                <span>Run workflows.</span>
                <span>Stay in control.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Simple scheduling, workflow automation, and run visibility.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-2xl px-6">
                <Link href="/login">
                  Start in dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                Scheduling, workflows, and visibility in one place.
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="panel-surface rounded-[1.6rem] border border-border/70 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold tracking-[-0.03em]">
                        {feature.title}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border/60 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-4 rounded-[1.75rem] border border-border/70 bg-card/50 p-4 sm:grid-cols-3 sm:p-5">
          <Metric value="4" label="core surfaces" />
          <Metric value="24/7" label="run visibility" />
          <Metric value="1" label="control plane" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/50 p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Built for modern operations
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] sm:text-[2rem]">
              One place for schedules, workflows, and execution clarity.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Keep recurring jobs organized, workflow logic visible, and every run easy to review.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoTile title="Schedules" description="Create and manage timed runs with clean status visibility." />
            <InfoTile title="Executions" description="Review outcomes, activity, and recent runtime history." />
          </div>
        </section>

        <footer className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-border/70 bg-card/45 px-5 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="font-medium text-foreground">Scheduler</div>
            <div className="mt-1">Simple workflow scheduling and operational visibility.</div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/60 bg-background/70 px-4 py-4">
      <div className="text-[1.8rem] font-semibold tracking-[-0.05em]">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function InfoTile({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-5">
      <div className="text-base font-semibold tracking-[-0.03em] text-foreground">{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
