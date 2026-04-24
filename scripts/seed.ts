import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });

  const email = "demo@scheduler.local";
  const passwordHash = await bcrypt.hash("demo123456", 10);

  await pool.query("BEGIN");
  try {
    const tenant = await pool.query<{ id: string }>(
      `INSERT INTO tenants (name, slug, timezone)
       VALUES ('Demo Tenant', 'demo', 'UTC')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
    );
    const user = await pool.query<{ id: string }>(
      `INSERT INTO users (email, full_name, password_hash)
       VALUES ($1, 'Demo User', $2)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      [email, passwordHash],
    );
    await pool.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [tenant.rows[0].id, user.rows[0].id],
    );
    await pool.query("COMMIT");
    console.log("seed complete");
    console.log(`  email:    ${email}`);
    console.log(`  password: demo123456`);
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
