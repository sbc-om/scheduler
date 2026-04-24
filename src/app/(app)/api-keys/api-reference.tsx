"use client";

import { useState } from "react";
import { Terminal } from "lucide-react";
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
      { method: "POST", path: "/api/workflows", summary: "Create workflow", example: { body: `{\n  "name": "Order pipeline",\n  "code": "orders"\n}` } },
      { method: "GET", path: "/api/workflows/:id", summary: "Get workflow" },
      { method: "PATCH", path: "/api/workflows/:id", summary: "Update workflow" },
      { method: "POST", path: "/api/workflows/:id/publish", summary: "Publish latest draft" },
      { method: "PUT", path: "/api/workflows/:id/builder", summary: "Save builder graph" },
      { method: "POST", path: "/api/workflows/:id/run-now", summary: "Dispatch an ad-hoc run", example: { body: `{\n  "payload": { "orderId": "ord_123" }\n}` } },
    ],
  },
  {
    title: "Schedules",
    description: "Manage time-based and event-based triggers.",
    endpoints: [
      { method: "GET", path: "/api/schedules", summary: "List schedules" },
      { method: "POST", path: "/api/schedules", summary: "Create schedule", example: { body: `{\n  "workflowId": "wf_...",\n  "name": "Nightly sync",\n  "scheduleType": "cron",\n  "cronExpression": "0 2 * * *",\n  "timezone": "UTC"\n}` } },
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
      { method: "POST", path: "/api/api-keys", summary: "Create key", example: { body: `{\n  "name": "Production worker",\n  "expiresInDays": 90\n}` } },
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
  GET: "bg-sky-500/10 text-sky-600 ring-sky-500/25 dark:text-sky-300",
  POST: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300",
  PUT: "bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300",
  PATCH: "bg-violet-500/10 text-violet-600 ring-violet-500/25 dark:text-violet-300",
  DELETE: "bg-rose-500/10 text-rose-600 ring-rose-500/25 dark:text-rose-300",
};

function buildCurl(baseUrl: string, e: Endpoint) {
  const url = `${baseUrl}${e.path}`;
  const parts = [
    `curl -X ${e.method} '${url}'`,
    `  -H 'Authorization: Bearer $SCHEDULER_API_KEY'`,
  ];
  if (e.example?.body) {
    parts.push(`  -H 'Content-Type: application/json'`);
    parts.push(`  -d '${e.example.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n");
}

export function ApiReference({ baseUrl }: { baseUrl: string }) {
  const [active, setActive] = useState(GROUPS[0].title);
  const group = GROUPS.find((g) => g.title === active) ?? GROUPS[0];

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
        {GROUPS.map((g) => (
          <button
            key={g.title}
            type="button"
            onClick={() => setActive(g.title)}
            className={cn(
              "rounded-lg px-3 py-2 text-left text-sm transition-colors",
              g.title === active
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {g.title}
            <span className="ml-2 text-[11px] text-muted-foreground">
              {g.endpoints.length}
            </span>
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <p className="text-xs text-muted-foreground">{group.description}</p>
        </div>
        <div className="space-y-3">
          {group.endpoints.map((e) => {
            const curl = buildCurl(baseUrl, e);
            return (
              <div
                key={`${e.method} ${e.path}`}
                className="group rounded-xl border border-border/60 bg-card/60 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ring-1 ring-inset",
                      METHOD_STYLES[e.method],
                    )}
                  >
                    {e.method}
                  </span>
                  <code className="font-mono text-xs">{e.path}</code>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {e.summary}
                  </span>
                </div>
                <div className="mt-2 rounded-lg border border-border/60 bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border/60 px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                      <Terminal className="h-3 w-3" />
                      cURL
                    </div>
                    <CopyButton value={curl} label="cURL" size="sm" />
                  </div>
                  <pre className="scrollbar-thin overflow-x-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
                    <code>{curl}</code>
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
