import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "auth.db");

const db = new Database(dbPath);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "linktroo-better-auth-secret-change-me",
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:8787",
  basePath: "/api/auth",
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8787",
    "https://linktroo.cc",
  ],
});
