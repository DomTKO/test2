// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import crypto from "crypto";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { logEvent } from "../services/audit.js";
import { runtimeConfig } from "../config/initConfig.js";

const router = express.Router();

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normName(v) {
  return String(v || "").trim();
}

function sameUsername(a, b) {
  return normName(a).toLowerCase() === normName(b).toLowerCase();
}

// create voting-side session
router.post("/verifier/session", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { ballotId } = req.body ?? {};
  if (!Number.isFinite(Number(ballotId))) return res.status(400).json({ code: "BAD_BALLOT" });

  const [[hasVoted]] = await pool.query(
    `SELECT 1 AS x FROM userChoices WHERE userID=? AND ballotsID=? LIMIT 1`,
    [userId, ballotId]
  );
  if (!hasVoted) return res.status(403).json({ code: "NO_VOTE_FOR_BALLOT" });

  const now = new Date();
  const windowMinutes = 30;
  const tokenLifetimeSec = 30;

  const token = generateToken();
  const tokenValidUntil = new Date(now.getTime() + tokenLifetimeSec * 1000);
  const windowValidUntil = new Date(now.getTime() + windowMinutes * 60 * 1000);

  await pool.query(
    "UPDATE verifierSessions SET isActive=0 WHERE userID=? AND ballotsID=?",
    [userId, ballotId]
  );

  const [result] = await pool.query(
    `INSERT INTO verifierSessions
       (userID, ballotsID, token, tokenValidUntil, windowValidUntil, isActive)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [userId, ballotId, token, tokenValidUntil, windowValidUntil]
  );

  await logEvent(req, {
    component: "voting",
    eventType: "VERIFIER_SESSION_CREATED",
    userId,
    details: { ballotId, sessionId: result.insertId },
  });

  res.status(201).json({ id: result.insertId, token, tokenValidUntil, windowValidUntil });
});

router.get("/verifier/session/:id/status", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) return res.status(400).json({ code: "BAD_SESSION" });

  try {
    const [[row]] = await pool.query(
      "SELECT wasLookedUp, windowValidUntil FROM verifierSessions WHERE id = ? AND userID = ? LIMIT 1",
      [sessionId, userId]
    );
    if (!row) return res.status(404).json({ code: "SESSION_NOT_FOUND" });

    const windowExpired =
      row.windowValidUntil && new Date(row.windowValidUntil) < new Date();

    return res.json({
      lookedUp: !windowExpired && Number(row.wasLookedUp) === 1,
      windowExpired: !!windowExpired,
    });
  } catch (e) {
    console.error("GET /verifier/session/:id/status error:", e);
    return res.status(500).json({ code: "INTERNAL" });
  }
});

// claim (verifier-side)
router.post("/verifier/claim", async (req, res) => {
  const { token, username } = req.body ?? {};
  const tokenStr = typeof token === "string" ? token.trim() : "";
  const usernameStr = typeof username === "string" ? username.trim() : "";

  if (!tokenStr) return res.status(400).json({ code: "BAD_TOKEN" });

  const requireName = !!runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM;
  if (requireName && !usernameStr) {
    return res.status(400).json({ code: "USERNAME_REQUIRED" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT *
         FROM verifierSessions
        WHERE token = ?
          AND isActive = 1
          AND tokenValidUntil >= NOW()
          AND windowValidUntil >= NOW()
        LIMIT 1
        FOR UPDATE`,
      [tokenStr]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ code: "TOKEN_INVALID" });
    }

    const session = rows[0];

    if (requireName) {
      const [[u]] = await conn.query(
        "SELECT userName FROM users WHERE id = ? LIMIT 1",
        [session.userID]
      );
      const actual = String(u?.userName || "").trim();

      if (!actual || !sameUsername(actual, usernameStr)) {
        await conn.rollback();

        try {
          await logEvent(req, {
            component: "verifier",
            eventType: "VERIFIER_USERNAME_CONFIRM_FAILED",
            level: "WARN",
            userId: session.userID,
            details: { ballotId: session.ballotsID },
          });
        } catch {}

        return res.status(403).json({ code: "USERNAME_MISMATCH" });
      }
    }

    await conn.query(
      `UPDATE verifierSessions
          SET isActive = 0,
              wasLookedUp = 1,
              tokenValidUntil = NOW()
        WHERE id = ?`,
      [session.id]
    );

    const now = new Date();
    const minutes = 10;
    const newToken = generateToken();
    const newValidUntil = new Date(now.getTime() + minutes * 60 * 1000);

    const [insertResult] = await conn.query(
      `INSERT INTO verifierSessions
         (userID, ballotsID, token, tokenValidUntil, windowValidUntil, isActive)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [session.userID, session.ballotsID, newToken, newValidUntil, newValidUntil]
    );

    await conn.commit();

    await logEvent(req, {
      component: "verifier",
      eventType: "VERIFIER_SESSION_CLAIMED",
      userId: session.userID,
      details: {
        ballotId: session.ballotsID,
        oldSessionId: session.id,
        newSessionId: insertResult.insertId,
        windowMinutes: minutes,
        requireUsernameConfirm: requireName,
      },
    });

    return res.status(201).json({
      id: insertResult.insertId,
      token: newToken,
      tokenValidUntil: newValidUntil,
      windowValidUntil: newValidUntil,
    });
  } catch (e) {
    console.error("POST /verifier/claim error:", e);
    try { await conn.rollback(); } catch {}
    return res.status(500).json({ code: "INTERNAL" });
  } finally {
    conn.release();
  }
});

router.get("/verifier/config/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) return res.status(400).json({ code: "BAD_TOKEN" });

  try {
    const [[session]] = await pool.query(
      `SELECT id, userID, ballotsID
         FROM verifierSessions
        WHERE token = ?
          AND isActive = 1
          AND tokenValidUntil >= NOW()
          AND windowValidUntil >= NOW()
        LIMIT 1`,
      [token]
    );

    if (!session) return res.status(404).json({ code: "TOKEN_INVALID" });

    await logEvent(req, {
      component: "verifier",
      eventType: "VERIFIER_CONFIG_VIEW",
      userId: session.userID,
      details: {
        ballotId: session.ballotsID,
        researchVerifierOffset: runtimeConfig.RESEARCH_VERIFIER_OFFSET,
        verifierShowAllBallots: runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS,
        verifierReportUseSimpleView: runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW,
        verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,
      },
    });

    return res.json({
      researchVerifierOffset: runtimeConfig.RESEARCH_VERIFIER_OFFSET,
      researchHideQr: runtimeConfig.RESEARCH_HIDE_QR,
      verifierShowAllBallots: runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS,
      verifierReportUseSimpleView: runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW,
      verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,
    });
  } catch (e) {
    console.error("GET /verifier/config/:token error:", e);
    return res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/verifier/session/:id/refresh", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) return res.status(400).json({ code: "BAD_SESSION" });

  const [[session]] = await pool.query(
    "SELECT * FROM verifierSessions WHERE id = ? AND userID = ? LIMIT 1",
    [sessionId, userId]
  );
  if (!session) return res.status(404).json({ code: "SESSION_NOT_FOUND" });

  const now = new Date();

  if (new Date(session.windowValidUntil) < now) {
    await pool.query("UPDATE verifierSessions SET isActive = 0 WHERE id = ?", [sessionId]);
    return res.status(410).json({ code: "WINDOW_EXPIRED" });
  }

  if (Number(session.wasLookedUp) === 1) {
    return res.json({
      id: sessionId,
      token: session.token,
      tokenValidUntil: session.tokenValidUntil,
      windowValidUntil: session.windowValidUntil,
    });
  }

  const tokenLifetimeSec = 30;
  const newToken = generateToken();
  const newTokenValidUntil = new Date(now.getTime() + tokenLifetimeSec * 1000);

  await pool.query(
    "UPDATE verifierSessions SET token = ?, tokenValidUntil = ?, isActive = 1 WHERE id = ?",
    [newToken, newTokenValidUntil, sessionId]
  );

  await pool.query(
    `UPDATE verifierSessions
        SET isActive = 0
      WHERE userID = ?
        AND ballotsID = ?
        AND id <> ?
        AND tokenValidUntil <> windowValidUntil`,
    [session.userID, session.ballotsID, sessionId]
  );

  return res.json({
    id: sessionId,
    token: newToken,
    tokenValidUntil: newTokenValidUntil,
    windowValidUntil: session.windowValidUntil,
  });
});

router.post("/verifier/session/:id/stop", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const sessionId = Number(req.params.id);
  if (!Number.isFinite(sessionId)) return res.status(400).json({ code: "BAD_SESSION" });

  const [result] = await pool.query(
    "UPDATE verifierSessions SET isActive=0 WHERE id=? AND userID=? AND isActive=1",
    [sessionId, userId]
  );

  if (result.affectedRows > 0) {
    await logEvent(req, {
      component: "voting",
      eventType: "VERIFIER_SESSION_STOPPED",
      userId,
      details: { sessionId },
    });
  }

  res.json({ ok: true, alreadyStopped: result.affectedRows === 0 });
});

router.get("/verifier/lookup/:token", async (req, res) => {
  const token = String(req.params.token || "").trim();
  if (!token) return res.status(400).json({ code: "BAD_TOKEN" });

  const requireName = !!runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM;
  const usernameStr = typeof req.query.username === "string" ? String(req.query.username).trim() : "";

  if (requireName && !usernameStr) {
    return res.status(400).json({ code: "USERNAME_REQUIRED" });
  }

  const [[session]] = await pool.query(
    `SELECT *
       FROM verifierSessions
      WHERE token = ?
        AND isActive = 1
        AND tokenValidUntil >= NOW()
        AND windowValidUntil >= NOW()
      LIMIT 1`,
    [token]
  );

  if (!session) return res.status(404).json({ code: "TOKEN_INVALID" });

  if (requireName) {
    const [[u]] = await pool.query(
      "SELECT userName FROM users WHERE id = ? LIMIT 1",
      [session.userID]
    );
    const actual = String(u?.userName || "").trim();
    if (!actual || !sameUsername(actual, usernameStr)) {
      try {
        await logEvent(req, {
          component: "verifier",
          eventType: "VERIFIER_USERNAME_CONFIRM_FAILED",
          level: "WARN",
          userId: session.userID,
          details: { ballotId: session.ballotsID },
        });
      } catch {}

      return res.status(403).json({ code: "USERNAME_MISMATCH" });
    }
  }

  try {
    await pool.query(
      "UPDATE verifierSessions SET wasLookedUp = 1 WHERE userID = ? AND ballotsID = ? AND windowValidUntil >= NOW()",
      [session.userID, session.ballotsID]
    );
  } catch (e) {
    console.error("verifier lookup: wasLookedUp update error:", e);
  }

  let ballotIds = [session.ballotsID];

  if (runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS) {
    try {
      const [ballotRows] = await pool.query(
        `SELECT DISTINCT ballotsID AS ballotId
           FROM userChoices
          WHERE userID = ?
          ORDER BY ballotsID ASC`,
        [session.userID]
      );

      const allIds = ballotRows
        .map((r) => Number(r.ballotId))
        .filter((id) => Number.isFinite(id) && id > 0);

      if (allIds.length) ballotIds = allIds;
    } catch (e) {
      console.error("verifier lookup: all ballots for user error:", e);
      ballotIds = [session.ballotsID];
    }
  } else {
    try {
      const [[ballotInfo]] = await pool.query(
        `SELECT ballotType, electionID
           FROM ballots
          WHERE id = ?
          LIMIT 1`,
        [session.ballotsID]
      );

      const type = String(ballotInfo?.ballotType || "").toLowerCase();
      const electionId = ballotInfo?.electionID;

      const isPairType = type === "first" || type === "second";

      if (isPairType && Number.isFinite(Number(electionId))) {
        const [pairRows] = await pool.query(
          `SELECT id
             FROM ballots
            WHERE electionID = ?
              AND ballotType IN ('first', 'second')
            ORDER BY
              CASE ballotType WHEN 'first' THEN 1 WHEN 'second' THEN 2 ELSE 3 END,
              id ASC`,
          [electionId]
        );

        const pairIds = pairRows
          .map((r) => Number(r.id))
          .filter((id) => Number.isFinite(id) && id > 0);

        ballotIds = pairIds.length ? pairIds : [session.ballotsID];
      } else {
        ballotIds = [session.ballotsID];
      }
    } catch (e) {
      console.error("verifier lookup: pair ballot resolution error:", e);
      ballotIds = [session.ballotsID];
    }
  }

  const [rows] = await pool.query(
    `SELECT
       uc.ballotsID AS ballotId,
       c.id         AS choiceId,
       c.labelDe,
       c.labelEn,
       uc.isValid
     FROM userChoices uc
     JOIN choices c ON c.id = uc.choiceID
    WHERE uc.userID   = ?
      AND uc.ballotsID IN (?)
    ORDER BY uc.ballotsID ASC, c.sortIndex ASC, c.id ASC`,
    [session.userID, ballotIds]
  );

  const lang = String(req.query.lang || runtimeConfig.DEFAULT_LANG).toLowerCase();
  const useEn = lang.startsWith("en");

  const choices = rows.map((r) => ({
    id: Number(r.choiceId),
    ballotId: Number(r.ballotId),
    label: useEn ? r.labelEn : r.labelDe,
    isValid: Number(r.isValid) === 1,
  }));

  await logEvent(req, {
    component: "verifier",
    eventType: "VERIFIER_LOOKUP",
    userId: session.userID,
    details: {
      baseBallotId: session.ballotsID,
      ballotIds,
      numChoices: choices.length,
      showAllBallots: runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS,
      requireUsernameConfirm: requireName,
    },
  });

  res.json({ ballotId: session.ballotsID, ballotIds, choices });
});

router.post("/verifier/tickets", async (req, res) => {
  const { token, contact, message } = req.body ?? {};

  const tokenStr = typeof token === "string" ? token.trim() : "";
  const msg = typeof message === "string" ? message.trim() : "";
  const contactStr = typeof contact === "string" ? contact.trim() : "";

  if (!tokenStr || !msg) return res.status(400).json({ code: "BAD_INPUT" });

  const [[session]] = await pool.query(
    `SELECT *
       FROM verifierSessions
      WHERE token = ?
        AND tokenValidUntil = windowValidUntil
        AND windowValidUntil >= NOW()
      LIMIT 1`,
    [tokenStr]
  );

  if (!session) return res.status(404).json({ code: "TOKEN_INVALID" });

  let ticketBallotId = session.ballotsID;
  let ticketElectionId = null;

  try {
    const [[ballot]] = await pool.query(
      `SELECT ballotType, electionID
         FROM ballots
        WHERE id = ?
        LIMIT 1`,
      [session.ballotsID]
    );

    if (ballot) {
      const type = String(ballot.ballotType || "").toLowerCase();
      const isPairType = type === "first" || type === "second";
      if (isPairType && ballot.electionID) {
        ticketBallotId = null;
        ticketElectionId = ballot.electionID;
      }
    }
  } catch (e) {
    console.error("verifier ticket: ballot lookup error:", e);
  }

  if (runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS) {
    ticketBallotId = null;
    ticketElectionId = null;
  }

  const [result] = await pool.query(
    `INSERT INTO tickets (userId, ballotId, electionId, contact, message)
     VALUES (?, ?, ?, ?, ?)`,
    [session.userID, ticketBallotId, ticketElectionId, contactStr || null, msg]
  );

  await logEvent(req, {
    component: "verifier",
    eventType: "TICKET_CREATED",
    userId: session.userID,
    details: {
      ballotId: ticketBallotId,
      electionId: ticketElectionId,
      ticketId: result.insertId,
    },
  });

  res.status(201).json({ ok: true, id: result.insertId });
});

export default router;
