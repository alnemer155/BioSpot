import Database from "better-sqlite3";

const db = new Database("./auth.db");

db.pragma("foreign_keys = ON");

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

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables:", tables.map(r => r.name));
db.close();
