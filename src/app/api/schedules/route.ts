import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth";
import {
  createSchedule,
  listSchedules,
} from "@/modules/schedules/repository";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const rows = await listSchedules(user.tenantId);
    return NextResponse.json({ schedules: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const Body = z.object({
  name: z.string().min(1),
  workflowId: z.string().uuid(),
  scheduleType: z.enum([
    "once",
    "delayed",
    "cron",
    "interval",
    "rrule",
    "manual",
    "event",
  ]),
  cronExpression: z.string().optional().nullable(),
  rrule: z.string().optional().nullable(),
  intervalSeconds: z.number().int().positive().optional().nullable(),
  runAt: z.string().datetime().optional().nullable(),
  timezone: z.string().optional(),
  priority: z.number().int().optional(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireSessionUser();
    const body = await req.json().catch(() => ({}));
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const d = parsed.data;
    const s = await createSchedule({
      tenantId: user.tenantId,
      workflowId: d.workflowId,
      name: d.name,
      scheduleType: d.scheduleType,
      cronExpression: d.cronExpression ?? null,
      rrule: d.rrule ?? null,
      intervalSeconds: d.intervalSeconds ?? null,
      runAt: d.runAt ? new Date(d.runAt) : null,
      timezone: d.timezone,
      priority: d.priority,
      startAt: d.startAt ? new Date(d.startAt) : null,
      endAt: d.endAt ? new Date(d.endAt) : null,
      payload: d.payload,
      createdBy: user.userId === "api-key" ? null : user.userId,
    });
    return NextResponse.json(s);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
