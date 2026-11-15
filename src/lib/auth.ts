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
  trustedOrigins: [
    "https://easy-menu-theta.vercel.app",
    "https://*.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    ...(process.env["AUTH_URL"] ? [process.env["AUTH_URL"]] : []),
  ],
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
