"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Play,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copyable";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type Template = {
  id: string;
  group: string;
  label: string;
  method: Method;
  path: string;
  body?: string;
};

const TEMPLATES: Template[] = [
  { id: "workflows.list", group: "Workflows", label: "List workflows", method: "GET", path: "/api/workflows" },
  {
    id: "workflows.create",
    group: "Workflows",
    label: "Create workflow",
    method: "POST",
    path: "/api/workflows",
    body: `{\n  "name": "Order pipeline",\n  "code": "orders"\n}`,
  },
  { id: "workflows.get", group: "Workflows", label: "Get workflow", method: "GET", path: "/api/workflows/:id" },
  { id: "workflows.publish", group: "Workflows", label: "Publish workflow", method: "POST", path: "/api/workflows/:id/publish" },
  {
    id: "workflows.runNow",
    group: "Workflows",
    label: "Run workflow now",
    method: "POST",
    path: "/api/workflows/:id/run-now",
    body: `{\n  "payload": { "orderId": "ord_123" }\n}`,
  },
  { id: "schedules.list", group: "Schedules", label: "List schedules", method: "GET", path: "/api/schedules" },
  {
    id: "schedules.create",
    group: "Schedules",
    label: "Create schedule",
    method: "POST",
    path: "/api/schedules",
    body: `{\n  "workflowId": "wf_...",\n  "name": "Nightly sync",\n  "scheduleType": "cron",\n  "cronExpression": "0 2 * * *",\n  "timezone": "UTC"\n}`,
  },
  { id: "schedules.pause", group: "Schedules", label: "Pause schedule", method: "POST", path: "/api/schedules/:id/pause" },
  { id: "schedules.resume", group: "Schedules", label: "Resume schedule", method: "POST", path: "/api/schedules/:id/resume" },
  { id: "schedules.runNow", group: "Schedules", label: "Force run", method: "POST", path: "/api/schedules/:id/run-now" },
  { id: "executions.list", group: "Executions", label: "List executions", method: "GET", path: "/api/executions" },
  { id: "executions.get", group: "Executions", label: "Execution detail", method: "GET", path: "/api/executions/:id" },
  { id: "keys.list", group: "API keys", label: "List API keys", method: "GET", path: "/api/api-keys" },
  {
    id: "keys.create",
    group: "API keys",
    label: "Create API key",
    method: "POST",
    path: "/api/api-keys",
    body: `{\n  "name": "CI runner",\n  "expiresInDays": 90\n}`,
  },
  { id: "keys.revoke", group: "API keys", label: "Revoke API key", method: "POST", path: "/api/api-keys/:id/revoke" },
];

// A "terminal" surface is intentionally dark in both themes (like a real
// terminal or an editor code block). Chrome around it uses semantic tokens.
const TERMINAL = "bg-slate-950 text-slate-100 border-slate-800";
const TERMINAL_MUTED = "text-slate-400";

type RunResult = {
  ok: boolean;
  status: number;
  statusText: string;
  durationMs: number;
  headers: [string, string][];
  body: string;
  bodyKind: "json" | "text";
};

export function ApiPlayground({ baseUrl }: { baseUrl: string }) {
  const [templateId, setTemplateId] = useState<string>(TEMPLATES[0].id);
  const template = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0],
    [templateId],
  );

  const [method, setMethod] = useState<Method>(template.method);
  const [path, setPath] = useState<string>(template.path);
  const [body, setBody] = useState<string>(template.body ?? "");
  const [token, setToken] = useState<string>("");
  const [headersText, setHeadersText] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id) ?? TEMPLATES[0];
    setTemplateId(id);
    setMethod(t.method);
    setPath(t.path);
    setBody(t.body ?? "");
    setResult(null);
  }

  async function run() {
    if (!path.trim()) {
      toast.error("Path is required");
      return;
    }
    if (path.includes(":")) {
      toast.error("Replace path params like :id before running");
      return;
    }
    const url = path.startsWith("http")
      ? path
      : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers: Record<string, string> = {};
    if (token.trim()) headers["authorization"] = `Bearer ${token.trim()}`;
    if (method !== "GET" && method !== "DELETE" && body.trim()) {
      headers["content-type"] = "application/json";
    }

    if (headersText.trim()) {
      for (const line of headersText.split("\n")) {
        const idx = line.indexOf(":");
        if (idx <= 0) continue;
        const name = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        if (name) headers[name] = value;
      }
    }

    let payload: BodyInit | undefined;
    if (method !== "GET" && method !== "DELETE" && body.trim()) {
      try {
        const parsed = JSON.parse(body);
        payload = JSON.stringify(parsed);
      } catch {
        toast.error("Body is not valid JSON");
        return;
      }
    }

    setRunning(true);
    setResult(null);
    const startedAt = performance.now();
    try {
      // credentials: "omit" ensures the session cookie is NOT sent, so we
      // are truly authenticating with the Bearer key (or nothing). This is
      // what makes the playground a faithful test of the API key itself.
      const res = await fetch(url, {
        method,
        headers,
        body: payload,
        credentials: "omit",
        cache: "no-store",
      });
      const durationMs = Math.round(performance.now() - startedAt);
      const text = await res.text();
      let bodyKind: RunResult["bodyKind"] = "text";
      let formatted = text;
      try {
        formatted = JSON.stringify(JSON.parse(text), null, 2);
        bodyKind = "json";
      } catch {
        // leave as text
      }
      setResult({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs,
        headers: Array.from(res.headers.entries()),
        body: formatted,
        bodyKind,
      });
    } catch (err) {
      setResult({
        ok: false,
        status: 0,
        statusText: "Request failed",
        durationMs: Math.round(performance.now() - startedAt),
        headers: [],
        body: (err as Error).message,
        bodyKind: "text",
      });
    } finally {
      setRunning(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    for (const t of TEMPLATES) {
      const list = map.get(t.group) ?? [];
      list.push(t);
      map.set(t.group, list);
    }
    return Array.from(map.entries());
  }, []);

  const curl = useMemo(() => {
    const headers: string[] = [
      `-H 'Authorization: Bearer ${token || "$SCHEDULER_API_KEY"}'`,
    ];
    if (method !== "GET" && method !== "DELETE" && body.trim()) {
      headers.push(`-H 'Content-Type: application/json'`);
    }
    const url = path.startsWith("http")
      ? path
      : `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
    const parts = [`curl -X ${method} '${url}'`, ...headers.map((h) => `  ${h}`)];
    if (method !== "GET" && method !== "DELETE" && body.trim()) {
      parts.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
    }
    return parts.join(" \\\n");
  }, [method, path, body, token, baseUrl]);

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <Terminal className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
        Live Request Runner
      </div>

      <div className="grid gap-3 md:grid-cols-[260px_1fr]">
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Endpoint</Label>
          <Select
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            className="font-mono text-xs"
          >
            {grouped.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.method} · {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Request</Label>
          <div className="flex items-stretch gap-2">
            <Select
              className="w-28 font-mono text-xs"
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
            >
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as Method[]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/workflows"
              className="font-mono text-xs"
            />
            <Button onClick={run} disabled={running}>
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Send
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Replace placeholders like <code className="rounded bg-muted px-1 font-mono">:id</code>{" "}
            with real values before sending. The request is sent{" "}
            <span className="font-medium">without</span> browser cookies, so only your API key authenticates.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-muted-foreground">
            <KeyRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-300" />
            API key
          </Label>
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="sbk_..."
            autoComplete="off"
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Paste a key from the table above. Stored only in this tab.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Extra headers</Label>
          <Textarea
            value={headersText}
            onChange={(e) => setHeadersText(e.target.value)}
            placeholder={"x-trace-id: demo\nx-idempotency-key: 123"}
            rows={3}
            className="font-mono text-xs"
          />
        </div>
      </div>

      {method !== "GET" && method !== "DELETE" ? (
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Request body (JSON)</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={7}
            className="font-mono text-xs"
            placeholder="{}"
            spellCheck={false}
          />
        </div>
      ) : null}

      <div className={cn("rounded-xl border", TERMINAL)}>
        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
          <div className={cn("flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em]", TERMINAL_MUTED)}>
            <Terminal className="h-3 w-3 text-cyan-300" />
            cURL
          </div>
          <CopyButton value={curl} label="cURL" size="sm" className="border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200" />
        </div>
        <pre className="scrollbar-thin overflow-x-auto px-3 py-3 font-mono text-[11px] leading-6 text-slate-200">
          <code>{curl}</code>
        </pre>
      </div>

      {result ? (
        <div className={cn("space-y-2 rounded-xl border p-3", TERMINAL)}>
          <div className="flex flex-wrap items-center gap-2">
            {result.ok ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400" />
            )}
            <span
              className={cn(
                "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ring-1 ring-inset",
                result.ok
                  ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                  : "bg-rose-500/15 text-rose-300 ring-rose-400/30",
              )}
            >
              {result.status || "ERR"} {result.statusText || ""}
            </span>
            <span className="text-xs text-slate-400 tabular-nums">
              {result.durationMs} ms
            </span>
            <span className="ml-auto text-[11px] uppercase tracking-widest text-slate-500">
              {result.bodyKind === "json" ? "JSON" : "Text"}
            </span>
            <CopyButton value={result.body} label="response" size="sm" className="border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-200" />
          </div>
          <pre className="scrollbar-thin max-h-96 overflow-auto rounded-lg border border-slate-800 bg-slate-900 px-3 py-3 font-mono text-[11px] leading-6 text-slate-200">
            <code>{result.body || "(empty)"}</code>
          </pre>
          {result.headers.length > 0 ? (
            <details className="group">
              <summary className="cursor-pointer text-[11px] font-medium text-slate-400 hover:text-slate-200">
                Response headers ({result.headers.length})
              </summary>
              <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900">
                <table className="w-full text-[11px]">
                  <tbody>
                    {result.headers.map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-800 last:border-0">
                        <td className="px-2 py-1 font-mono text-slate-500">
                          {k}
                        </td>
                        <td className="px-2 py-1 font-mono text-slate-300">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
