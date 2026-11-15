import { createServerFn } from "@tanstack/react-start";
import { sql } from "@/db";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export const fetchCategoriesFn = createServerFn({ method: "GET" }).handler(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const countRes = await sql`SELECT count(*)::int as c FROM categories`;
  if (Number(countRes[0]?.["c"] ?? 0) === 0) {
    await sql`
      INSERT INTO categories (name, sort_order)
      VALUES ('Burgers', 0), ('Sides', 1), ('Cocktails', 2)
      ON CONFLICT DO NOTHING
    `;
  }

  const rows =
    await sql`SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC`;
  return rows as unknown as Category[];
});

export const addCategoryFn = createServerFn({ method: "POST" })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error("Category name cannot be empty");
    }

    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        sort_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;

    await sql`
      INSERT INTO categories (name, sort_order)
      VALUES (${trimmed}, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM categories))
      ON CONFLICT (name) DO NOTHING
    `;

    return { success: true };
  });

export const deleteCategoryFn = createServerFn({ method: "POST" })
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    const itemsCount =
      await sql`SELECT count(*)::int as c FROM menu_items WHERE category = ${name}`;
    if (Number(itemsCount[0]?.["c"] ?? 0) > 0) {
      throw new Error(`Cannot delete "${name}" because menu items are currently assigned to it.`);
    }

    await sql`DELETE FROM categories WHERE name = ${name}`;
    return { success: true };
  });
