import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { BrandMark } from "@/components/app/brand-mark";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between brand-bg p-12 text-white overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(0 0% 100% / 0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-white/95 ring-1 ring-white/30 shadow-sm">
            <BrandMark size={30} priority />
          </div>
          <div className="text-base font-semibold tracking-tight">Scheduler</div>
        </div>
        <div className="relative space-y-5 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur">
            Multi-tenant workflow control plane
          </div>
          <h1 className="text-3xl font-semibold tracking-tight leading-tight">
            Orchestrate reliable jobs across every tenant, every timezone.
          </h1>
          <p className="text-sm text-white/70 leading-relaxed">
            Cron, interval and RRULE schedules on a PostgreSQL-native backbone.
            Durable retries, dead-letter handling and a premium drag-and-drop
            workflow builder.
          </p>
          <ul className="space-y-2 text-sm text-white/80">
            {[
              "pg-boss powered dispatch with FOR UPDATE SKIP LOCKED",
              "Versioned workflows with replay and audit trail",
              "Tenant isolation and rate-limited execution",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/70" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} Scheduler Platform
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-sm space-y-7">
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center bg-card ring-1 ring-border shadow-sm">
              <BrandMark size={30} priority />
            </div>
            <div className="text-lg font-semibold">Scheduler</div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Sign in to your workspace
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use the seeded demo account to explore.
            </p>
          </div>

          <LoginForm />

          <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Demo credentials</div>
            <div className="font-mono">demo@scheduler.local</div>
            <div className="font-mono">demo123456</div>
          </div>
        </div>
      </div>
    </div>
  );
}
