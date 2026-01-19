// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
// src/middleware/cors.js
import cors from "cors";
import { CORS_ORIGINS, VERIFIER_ORIGINS as VERIFIER_ORIGINS_RAW } from "../config/env.js";

const DEFAULT_CORS_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://demo.dtkocz.de:8080",
  "http://demo.dtkocz.de:8081",
  "https://verifier.dtkocz.de",
  "https://voting.dtkocz.de",
];

const EXTRA_CORS_ORIGINS = String(CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_CORS_ORIGINS = Array.from(
  new Set([...DEFAULT_CORS_ORIGINS, ...EXTRA_CORS_ORIGINS])
);

export const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (ALLOWED_CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
};

export const VERIFIER_ORIGINS = String(VERIFIER_ORIGINS_RAW || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isFromVerifierOrigin(req) {
  const origin =
    typeof req.headers.origin === "string" ? req.headers.origin.trim() : "";
  return origin ? VERIFIER_ORIGINS.includes(origin) : false;
}

export function applyCors(app) {
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
}
