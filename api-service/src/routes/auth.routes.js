// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import argon2 from "argon2";

import { APP_MODE, SESSION_MINUTES, JWT_SECRET } from "../config/env.js";
import { pool } from "../db/pool.js";
import { isFromVerifierOrigin } from "../middleware/cors.js";
import { issueAccessToken, setAuthCookie, requireAuth } from "../middleware/auth.js";
import { logEvent } from "../services/audit.js";

const router = express.Router();

router.use(cookieParser());

const STORE_HASH_AS_BINARY = true;

async function hasRemainingBallots(userId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS remaining
       FROM ballots b
      WHERE NOT EXISTS (
             SELECT 1
               FROM userChoices uc
              WHERE uc.userID = ? AND uc.ballotsID = b.id
           )`,
    [userId]
  );
  return Number(row.remaining) > 0;
}

router.post("/auth/login", async (req, res) => {
  if (isFromVerifierOrigin(req)) {
    await logEvent(req, {
      component: "verifier",
      eventType: "LOGIN_FAILED",
      level: "WARN",
      userId: null,
      details: {
        reason: "LOGIN_BLOCKED_FROM_VERIFIER_ORIGIN",
        origin: req.headers.origin || null,
      },
    });

    return res.status(403).json({
      code: "LOGIN_DISABLED",
      detail: "Password login is disabled on verifier instance",
    });
  }

  const { username, password } = req.body ?? {};
  if (!username || !password) {
    await logEvent(req, {
      component: "voting",
      eventType: "LOGIN_FAILED",
      level: "WARN",
      userId: null,
      details: { username: username || null, reason: "MISSING_CREDENTIALS" },
    });

    return res.status(400).json({
      code: "MISSING_CREDENTIALS",
      detail: "username/password required",
    });
  }

  if (APP_MODE === "verifier") {
    await logEvent(req, {
      component: "verifier",
      eventType: "LOGIN_FAILED",
      level: "WARN",
      userId: null,
      details: {
        username: String(username),
        reason: "LOGIN_DISABLED_VERIFIER_MODE",
      },
    });

    return res.status(403).json({
      code: "LOGIN_DISABLED",
      detail: "Password login is disabled in verifier mode",
    });
  }

  const [rows] = await pool.query(
    "SELECT id, userName, pwHash, role, isActive FROM users WHERE userName = ? LIMIT 1",
    [username]
  );
  const user = rows[0];

  if (!user) {
    await logEvent(req, {
      component: "voting",
      eventType: "LOGIN_FAILED",
      level: "WARN",
      userId: null,
      details: { username, reason: "NO_SUCH_USER" },
    });

    return res
      .status(401)
      .json({ code: "INVALID_CREDENTIALS", detail: "Invalid credentials" });
  }

  if (user.isActive !== 1) {
    await logEvent(req, {
      component: "voting",
      eventType: "LOGIN_INACTIVE",
      level: "WARN",
      userId: user.id,
      details: { username: user.userName },
    });

    return res.status(401).json({ code: "INACTIVE", detail: "Account inactive" });
  }

  try {
    const stored = Buffer.isBuffer(user.pwHash)
      ? user.pwHash.toString()
      : String(user.pwHash);

    const ok = await argon2.verify(stored, password);
    if (!ok) {
      await logEvent(req, {
        component: "voting",
        eventType: "LOGIN_FAILED",
        level: "WARN",
        userId: user.id,
        details: { username: user.userName, reason: "WRONG_PASSWORD" },
      });

      return res
        .status(401)
        .json({ code: "INVALID_CREDENTIALS", detail: "Invalid credentials" });
    }
  } catch (e) {
    await logEvent(req, {
      component: "voting",
      eventType: "LOGIN_FAILED",
      level: "WARN",
      userId: user.id,
      details: { username: user.userName, reason: "VERIFY_ERROR" },
    });

    return res
      .status(401)
      .json({ code: "INVALID_CREDENTIALS", detail: "Invalid credentials" });
  }

  // showroom cleanup
  if (user.role === "showroom") {
    try {
      await pool.query("DELETE FROM userChoices WHERE userID = ?", [user.id]);
      await pool.query("DELETE FROM logs WHERE userId = ?", [user.id]);
    } catch (e) {
      console.error("showroom cleanup error:", e);
    }
  }

  const token = issueAccessToken({ id: user.id, role: user.role });
  setAuthCookie(req, res, token);

  await logEvent(req, {
    component: "voting",
    eventType: "LOGIN_SUCCESS",
    userId: user.id,
    details: { username: user.userName, role: user.role },
  });

  res.json({ ok: true });
});

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.access_token;
  let userId = null;
  let role = null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      userId = Number(payload.sub);
      role = payload.role;

      if (role === "voter" && Number.isFinite(userId)) {
        try {
          const remaining = await hasRemainingBallots(userId);
          if (!remaining) {
            await pool.query("UPDATE users SET isActive = 0 WHERE id = ?", [userId]);
          }
        } catch (e) {
          console.error("logout deactivate error:", e);
        }
      }
    } catch {
      // ignore
    }
  }

  const reason =
    req.query && typeof req.query.reason === "string" ? req.query.reason : undefined;

  if (userId !== null) {
    const component = role === "admin" ? "admin-api" : "voting";
    const eventType = reason === "abort" ? "VOTE_ABORT" : "LOGOUT";

    await logEvent(req, {
      component,
      eventType,
      userId,
      details: { reason: reason || "normal" },
    });
  }

  res.clearCookie("access_token", { path: "/" });
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res) => {
  const token = req.cookies?.access_token;
  if (!token) return res.status(401).json({ detail: "Not authenticated" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = Number(payload.sub);

    if (!Number.isFinite(userId)) {
      res.clearCookie("access_token", { path: "/" });
      return res.status(401).json({ detail: "Not authenticated" });
    }

    const [rows] = await pool.query(
      "SELECT id, userName, role, isActive FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    const user = rows[0];

    if (!user) {
      res.clearCookie("access_token", { path: "/" });
      return res.status(401).json({ detail: "Not authenticated" });
    }

    if (user.role === "voter") {
      const remaining = await hasRemainingBallots(userId);
      if (!remaining) {
        await pool.query("UPDATE users SET isActive = 0 WHERE id = ?", [userId]);

        await logEvent(req, {
          component: "voting",
          eventType: "AUTH_AUTO_DEACTIVATE_NO_BALLOTS",
          userId,
          details: { reason: "no_remaining_ballots" },
        });

        res.clearCookie("access_token", { path: "/" });
        return res
          .status(401)
          .json({ detail: "No remaining ballots, user deactivated" });
      }
    }

    if (user.isActive !== 1) {
      res.clearCookie("access_token", { path: "/" });
      return res.status(401).json({ detail: "Not authenticated" });
    }

    // Sliding session
    const nowSec = Math.floor(Date.now() / 1000);
    if (
      typeof payload.exp === "number" &&
      payload.exp - nowSec < (SESSION_MINUTES * 60) / 2
    ) {
      const newToken = issueAccessToken({ id: user.id, role: user.role });
      setAuthCookie(req, res, newToken);
    }

    res.json({ id: user.id, username: user.userName, role: user.role });
  } catch {
    res.clearCookie("access_token", { path: "/" });
    return res.status(401).json({ detail: "Invalid token" });
  }
});

router.get("/me/votes", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    "SELECT DISTINCT ballotsID AS ballotId FROM userChoices WHERE userID=?",
    [userId]
  );
  const ballotIds = rows.map((r) => Number(r.ballotId));

  await logEvent(req, {
    component: req.user.role === "admin" ? "admin-api" : "voting",
    eventType: "ME_VOTES_LIST",
    userId,
    details: { count: ballotIds.length },
  });

  res.json(ballotIds);
});

router.post("/voting/log", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { action, ballotId, route, page } = req.body ?? {};

  const a = String(action || "").trim().toLowerCase();

  const ACTION_TO_EVENT = {
    back: "UI_BACK",
    nav: "UI_NAV",
    edit: "UI_EDIT",
    continue: "UI_CONTINUE",
    next_ballot: "UI_NEXT_BALLOT",
    ballot_open: "UI_BALLOT_OPEN",
    finish_logout: "UI_FINISH_LOGOUT",
    submit: "UI_SUBMIT",
    submit_invalid: "UI_SUBMIT_INVALID",
  };

  const eventType = ACTION_TO_EVENT[a];
  if (!eventType) return res.status(400).json({ code: "BAD_ACTION" });

  const bId = Number(ballotId);
  const safeBallotId = Number.isFinite(bId) && bId > 0 ? bId : null;

  await logEvent(req, {
    component: "voting",
    eventType,
    userId,
    details: {
      action: a,
      ballotId: safeBallotId,
      route: typeof route === "string" ? route : null,
      page: typeof page === "string" ? page : null,
    },
  });

  return res.json({ ok: true });
});

export default router;
