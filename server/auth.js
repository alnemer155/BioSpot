import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "auth.db");

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

export { db };

db.exec(`
  CREATE TABLE IF NOT EXISTS "user" (
    "id"            text NOT NULL PRIMARY KEY,
    "name"          text NOT NULL,
    "email"         text NOT NULL,
    "emailVerified" integer NOT NULL,
    "image"         text,
    "createdAt"     date NOT NULL,
    "updatedAt"     date NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "user_email_uidx" ON "user" ("email");

  CREATE TABLE IF NOT EXISTS "session" (
    "id"        text NOT NULL PRIMARY KEY,
    "expiresAt" date NOT NULL,
    "token"     text NOT NULL,
    "createdAt" date NOT NULL,
    "updatedAt" date NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId"    text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "session_token_uidx" ON "session" ("token");
  CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");

  CREATE TABLE IF NOT EXISTS "account" (
    "id"                    text NOT NULL PRIMARY KEY,
    "issuer"                text NOT NULL,
    "accountId"             text NOT NULL,
    "providerId"            text NOT NULL,
    "userId"                text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accessToken"           text,
    "refreshToken"          text,
    "idToken"               text,
    "accessTokenExpiresAt"  date,
    "refreshTokenExpiresAt" date,
    "scope"                 text,
    "password"              text,
    "createdAt"             date NOT NULL,
    "updatedAt"             date NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
  CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");

  CREATE TABLE IF NOT EXISTS "verification" (
    "id"         text NOT NULL PRIMARY KEY,
    "identifier" text NOT NULL,
    "value"      text NOT NULL,
    "expiresAt"  date NOT NULL,
    "createdAt"  date NOT NULL,
    "updatedAt"  date NOT NULL
  );
  CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
`);

const isProd = process.env.NODE_ENV === "production";
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "linktroo-better-auth-secret-change-me",
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  baseURL: process.env.BETTER_AUTH_BASE_URL || (isProd ? "https://api.linktroo.cc" : "http://localhost:8787"),
  basePath: "/api/auth",
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    crossSubDomainCookies: {
      enabled: isProd,
      domain: isProd ? ".linktroo.cc" : undefined,
    },
    ...(isProd
      ? {
          defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
          },
        }
      : {}),
  },
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:8787",
    "https://linktroo.cc",
    "https://www.linktroo.cc",
    "https://api.linktroo.cc",
  ],
});
