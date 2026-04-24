"use client";

import { useState } from "react";
import { Network, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copyable";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Endpoint = {
  method: Method;
  path: string;
  summary: string;
  example?: { body?: string };
};

type Group = {
  title: string;
  description: string;
  endpoints: Endpoint[];
};

const GROUPS: Group[] = [
  {
    title: "Workflows",
    description: "Create, publish, and trigger workflow definitions.",
    endpoints: [
      { method: "GET", path: "/api/workflows", summary: "List workflows" },
      { method: "POST", path: "/api/workflows", summary: "Create workflow", example: { body: `{
  "name": "Order pipeline",
  "code": "orders"
}` } },
      { method: "GET", path: "/api/workflows/:id", summary: "Get workflow" },
      { method: "PATCH", path: "/api/workflows/:id", summary: "Update workflow" },
      { method: "POST", path: "/api/workflows/:id/publish", summary: "Publish latest draft" },
      { method: "PUT", path: "/api/workflows/:id/builder", summary: "Save builder graph" },
      { method: "POST", path: "/api/workflows/:id/run-now", summary: "Dispatch an ad-hoc run", example: { body: `{
  "payload": { "orderId": "ord_123" }
}` } },
    ],
  },
  {
    title: "Schedules",
    description: "Manage time-based and event-based triggers.",
    endpoints: [
      { method: "GET", path: "/api/schedules", summary: "List schedules" },
      { method: "POST", path: "/api/schedules", summary: "Create schedule", example: { body: `{
  "workflowId": "wf_...",
  "name": "Nightly sync",
  "scheduleType": "cron",
  "cronExpression": "0 2 * * *",
  "timezone": "UTC"
}` } },
      { method: "GET", path: "/api/schedules/:id", summary: "Get schedule" },
      { method: "PATCH", path: "/api/schedules/:id", summary: "Update schedule" },
      { method: "DELETE", path: "/api/schedules/:id", summary: "Delete schedule" },
      { method: "POST", path: "/api/schedules/:id/pause", summary: "Pause" },
      { method: "POST", path: "/api/schedules/:id/resume", summary: "Resume" },
      { method: "POST", path: "/api/schedules/:id/run-now", summary: "Force run" },
    ],
  },
  {
    title: "Executions",
    description: "Inspect run history and step-level telemetry.",
    endpoints: [
      { method: "GET", path: "/api/executions", summary: "List executions" },
      { method: "GET", path: "/api/executions/:id", summary: "Execution detail with step runs" },
    ],
  },
  {
    title: "API keys",
    description: "Programmatically rotate credentials.",
    endpoints: [
      { method: "GET", path: "/api/api-keys", summary: "List keys" },
      { method: "POST", path: "/api/api-keys", summary: "Create key", example: { body: `{
  "name": "Production worker",
  "expiresInDays": 90
}` } },
      { method: "POST", path: "/api/api-keys/:id/revoke", summary: "Revoke key" },
    ],
  },
  {
    title: "Notifications",
    description: "In-app and push notification feed.",
    endpoints: [
      { method: "GET", path: "/api/notifications", summary: "List notifications" },
      { method: "POST", path: "/api/notifications/:id/read", summary: "Mark as read" },
      { method: "POST", path: "/api/push-subscriptions", summary: "Register a browser push subscription" },
    ],
  },
];

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-cyan-500/10 text-cyan-700 ring-cyan-500/25 dark:text-cyan-300",
  POST: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  PUT: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  PATCH: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
  DELETE: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
};

// Dark-in-both-themes surface for code blocks (like a real terminal).
const TERMINAL = "bg-slate-950 text-slate-100 border-slate-800";

function buildCurl(baseUrl: string, endpoint: Endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const parts = [
    `curl -X ${endpoint.method} '${url}'`,
    `  -H 'Authorization: Bearer $SCHEDULER_API_KEY'`,
  ];
  if (endpoint.example?.body) {
    parts.push(`  -H 'Content-Type: application/json'`);
    parts.push(`  -d '${endpoint.example.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n");
}

export function ApiReferencePanel({ baseUrl }: { baseUrl: string }) {
  const [active, setActive] = useState(GROUPS[0].title);
  const group = GROUPS.find((item) => item.title === active) ?? GROUPS[0];

  return (
    <div className="min-w-0 w-full max-w-full overflow-hidden">
      <div className="flex min-w-0 w-full max-w-full flex-col gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="min-w-0 w-full max-w-full rounded-2xl border border-border bg-card p-2 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Network className="h-3.5 w-3.5" />
            Collections
          </div>
          <nav className="mt-2 grid w-full max-w-full grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:flex-col">
            {GROUPS.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setActive(item.title)}
                className={cn(
                  "min-w-0 rounded-xl px-3 py-2 text-left transition-colors",
                  item.title === active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <div className="truncate text-sm font-medium">{item.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                  {item.endpoints.length} endpoints
                </div>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 w-full max-w-full space-y-4 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Reference set
              </div>
              <h3 className="mt-1 text-base font-semibold">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
            </div>
            <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              {group.endpoints.length} routes
            </div>
          </div>

          <div className="space-y-3">
            {group.endpoints.map((endpoint) => {
              const curl = buildCurl(baseUrl, endpoint);
              return (
                <section
                  key={`${endpoint.method} ${endpoint.path}`}
                  className="min-w-0 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-background"
                >
                  <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase ring-1 ring-inset",
                        METHOD_STYLES[endpoint.method],
                      )}
                    >
                      {endpoint.method}
                    </span>
                    <code className="min-w-0 break-all font-mono text-xs">
                      {endpoint.path}
                    </code>
                    <span className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                      {endpoint.summary}
                    </span>
                  </div>
                  <div className={cn("min-w-0 w-full max-w-full", TERMINAL)}>
                    <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 uppercase tracking-[0.18em]">
                        <Terminal className="h-3 w-3" />
                        cURL
                      </div>
                      <CopyButton value={curl} label="cURL" size="sm" className="border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200" />
                    </div>
                    <pre className="scrollbar-thin max-w-full overflow-x-auto px-3 py-3 font-mono text-[11px] leading-6 text-slate-200 sm:px-4">
                      <code>{curl}</code>
                    </pre>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
