import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getPool } from "@/db";

const getBaseURL = () => {
  if (process.env["AUTH_URL"]) return process.env["AUTH_URL"];
  if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
    return `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`;
  }
  if (process.env["VERCEL_URL"]) {
    return `https://${process.env["VERCEL_URL"]}`;
  }
  if (process.env["NODE_ENV"] === "production") {
    return "https://easy-menu-theta.vercel.app";
  }
  return "http://localhost:3000";
};

export const auth = betterAuth({
  database: getPool(),
  secret: process.env["AUTH_SECRET"] ?? "smash-and-shake-super-secret-key-32-chars-min",
  baseURL: getBaseURL(),
  trustedOrigins: async (request) => {
    const list: string[] = [
      "https://easy-menu-theta.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:3001",
      "http://localhost:5174",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5174",
    ];
    if (process.env["AUTH_URL"]) {
      list.push(process.env["AUTH_URL"]);
    }
    if (process.env["VERCEL_URL"]) {
      list.push(`https://${process.env["VERCEL_URL"]}`);
    }
    if (process.env["VERCEL_PROJECT_PRODUCTION_URL"]) {
      list.push(`https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`);
    }
    const headerOrigin = request?.headers?.get("origin") || request?.headers?.get("referer");
    if (headerOrigin) {
      try {
        const u = new URL(headerOrigin);
        list.push(u.origin);
      } catch (err) {
        void err;
      }
    }
    return Array.from(new Set(list));
  },
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
