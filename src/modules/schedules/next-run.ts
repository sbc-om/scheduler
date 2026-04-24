import { CronExpressionParser } from "cron-parser";
import { RRule } from "rrule";

export type ScheduleType =
  | "once"
  | "delayed"
  | "cron"
  | "interval"
  | "rrule"
  | "manual"
  | "event";

export type ScheduleNextRunInput = {
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  rrule?: string | null;
  intervalSeconds?: number | null;
  runAt?: Date | string | null;
  timezone?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  lastRunAt?: Date | string | null;
};

function parseDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  return typeof v === "string" ? new Date(v) : v;
}

export function computeNextRun(
  input: ScheduleNextRunInput,
  from: Date = new Date(),
): Date | null {
  const base = (() => {
    const startAt = parseDate(input.startAt);
    return startAt && startAt > from ? startAt : from;
  })();

  let next: Date | null = null;

  switch (input.scheduleType) {
    case "once":
    case "delayed": {
      const at = parseDate(input.runAt);
      if (!at) return null;
      next = at > from ? at : null;
      break;
    }
    case "cron": {
      if (!input.cronExpression) return null;
      try {
        const iter = CronExpressionParser.parse(input.cronExpression, {
          currentDate: base,
          tz: input.timezone ?? "UTC",
        });
        next = iter.next().toDate();
      } catch {
        return null;
      }
      break;
    }
    case "interval": {
      if (!input.intervalSeconds || input.intervalSeconds <= 0) return null;
      const last = parseDate(input.lastRunAt);
      const step = input.intervalSeconds * 1000;
      if (!last) {
        next = new Date(base.getTime() + step);
      } else {
        let t = last.getTime() + step;
        while (t <= from.getTime()) t += step;
        next = new Date(t);
      }
      break;
    }
    case "rrule": {
      if (!input.rrule) return null;
      try {
        const rule = RRule.fromString(input.rrule);
        next = rule.after(base, false);
      } catch {
        return null;
      }
      break;
    }
    case "manual":
    case "event":
      next = null;
      break;
  }

  const endAt = parseDate(input.endAt);
  if (next && endAt && next > endAt) return null;
  return next;
}
