// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
// src/config/env.js
export const PORT = Number(process.env.PORT) || 3000;

export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "mysql://app:app@mysql:3306/evoting?charset=utf8mb4";

export const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET env var is not set");
  process.exit(1);
}

// Dauer der Login-Session in Minuten (JWT u. Cookie)
export const SESSION_MINUTES = Number(process.env.SESSION_MINUTES) || 3;

// Betriebsmodus
const APP_MODE_RAW = String(process.env.APP_MODE || "full").trim().toLowerCase();
export const APP_MODE = APP_MODE_RAW === "verifier" ? "verifier" : "full";

export const NODE_ENV = String(process.env.NODE_ENV || "development").trim();

export const COOKIE_SAMESITE = String(process.env.COOKIE_SAMESITE || "").trim();
export const COOKIE_SECURE = String(process.env.COOKIE_SECURE || "").trim();

export const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "");
export const VERIFIER_ORIGINS = String(
  process.env.VERIFIER_ORIGINS || "http://localhost:8081"
);
