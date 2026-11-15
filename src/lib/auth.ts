import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getPool } from "@/db";

export const auth = betterAuth({
  database: getPool(),
  secret: process.env["AUTH_SECRET"] ?? "smash-and-shake-super-secret-key-32-chars-min",
  baseURL: process.env["AUTH_URL"] ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
