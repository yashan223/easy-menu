import { createServerFn } from "@tanstack/react-start";
import { sql } from "@/db";

export interface AppSettings {
  currency: "LKR" | "USD";
}

export const checkHasAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await sql`SELECT count(*)::int as c FROM "user"`;
  const count = Number(rows[0]?.["c"] ?? 0);
  return { hasAdmin: count > 0 };
});

export const getSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  const rows = await sql`SELECT key, value FROM app_settings WHERE key = 'currency'`;
  const currency = (rows[0]?.["value"] as "LKR" | "USD") || "LKR";

  const settings: AppSettings = {
    currency,
  };

  return settings;
});

export const updateSettingsFn = createServerFn({ method: "POST" })
  .validator((data: { currency: "LKR" | "USD" }) => data)
  .handler(async ({ data }) => {
    await sql`
      INSERT INTO app_settings (key, value)
      VALUES ('currency', ${data.currency})
      ON CONFLICT (key) DO UPDATE SET value = ${data.currency}
    `;
    return { success: true };
  });
