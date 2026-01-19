// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
// src/middleware/auth.js
import jwt from "jsonwebtoken";
import { JWT_SECRET, SESSION_MINUTES, COOKIE_SAMESITE, COOKIE_SECURE, NODE_ENV } from "../config/env.js";

export function issueAccessToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: `${SESSION_MINUTES}m`,
  });
}

function resolveCookieSameSite() {
  const forced = String(COOKIE_SAMESITE || "").trim().toLowerCase();
  if (["lax", "strict", "none"].includes(forced)) return forced;
  return "lax";
}

function resolveCookieSecure(req, sameSite) {
  const forced = String(COOKIE_SECURE || "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(forced)) return true;
  if (["0", "false", "no", "off"].includes(forced)) return false;

  const xfProto = req.headers["x-forwarded-proto"];
  const isHttps =
    (typeof xfProto === "string" &&
      xfProto.split(",")[0].trim().toLowerCase() === "https") ||
    !!req.secure;

  if (sameSite === "none") return true;
  if (NODE_ENV === "production") return isHttps;
  return false;
}

export function setAuthCookie(req, res, token) {
  const sameSite = resolveCookieSameSite();
  const secure = resolveCookieSecure(req, sameSite);

  res.cookie("access_token", token, {
    httpOnly: true,
    sameSite,
    secure,
    path: "/",
    maxAge: SESSION_MINUTES * 60 * 1000,
  });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ code: "NOT_AUTH" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);

    if (!Number.isFinite(userId)) {
      return res.status(401).json({ code: "INVALID_TOKEN" });
    }

    req.user = { id: userId, role: payload.role };

    // Sliding Session
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      typeof payload.exp === "number" &&
      payload.exp - nowSec < (SESSION_MINUTES * 60) / 2
    ) {
      const newToken = issueAccessToken({ id: userId, role: payload.role });
      setAuthCookie(req, res, newToken);
    }

    return next();
  } catch {
    return res.status(401).json({ code: "INVALID_TOKEN" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ code: "NOT_AUTH" });
  if (req.user.role !== "admin") return res.status(403).json({ code: "NOT_ADMIN" });
  next();
}
