import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().trim().min(1).max(120).nullable().optional(),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.userId === "api-key") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { fullName, email } = parsed.data;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fullName !== undefined) {
    params.push(fullName);
    sets.push(`full_name = $${params.length}`);
  }
  if (email !== undefined) {
    params.push(email);
    sets.push(`email = $${params.length}`);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  params.push(user.userId);
  try {
    await query(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${params.length}`,
      params,
    );
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }
    throw e;
  }
  return NextResponse.json({ ok: true });
}
