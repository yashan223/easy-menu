import { neon, Pool } from "@neondatabase/serverless";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: string | number;
  category: string;
  sort_order: number;
  image_url: string | null;
  created_at?: string;
}

export function getDbUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }
  return url;
}

export function getSql() {
  return neon(getDbUrl());
}

export const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
  return getSql()(strings, ...values);
};

export function getPool() {
  return new Pool({ connectionString: getDbUrl() });
}
