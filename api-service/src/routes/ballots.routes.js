// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { logEvent, extractUserFromReq } from "../services/audit.js";
import { runtimeConfig } from "../config/initConfig.js";

const router = express.Router();

// BALLOTS (public)
router.get("/ballots", async (req, res) => {
  const lang = String(req.query.lang || runtimeConfig.DEFAULT_LANG).slice(0, 5);
  const useEn = lang.toLowerCase().startsWith("en");
  const titleCol = useEn ? "titleEn" : "titleDe";
  const descCol = useEn ? "descriptionEn" : "descriptionDe";
  const electionNameCol = useEn ? "e.nameEn" : "e.nameDe";

  try {
    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.${titleCol} AS title,
         b.${descCol} AS description,
         b.minChoices,
         b.maxChoices,
         b.ballotType,
         b.electionID AS electionId,
         e.slug AS electionSlug,
         ${electionNameCol} AS electionName,
         e.startsAt,
         e.endsAt,
         e.isActive AS electionIsActive
       FROM ballots b
       LEFT JOIN elections e ON e.id = b.electionID
       ORDER BY b.id DESC`
    );

    await logEvent(req, {
      component: "voting",
      eventType: "BALLOTS_LIST",
      details: { count: rows.length, lang },
    });

    res.json(rows);
  } catch (e) {
    console.error("GET /ballots error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.get("/ballots/:id/choices", async (req, res) => {
  const ballotId = Number(req.params.id);
  if (!Number.isFinite(ballotId)) return res.status(400).json({ code: "BAD_ID" });

  const lang = String(req.query.lang || runtimeConfig.DEFAULT_LANG).slice(0, 5);
  const useEn = lang.toLowerCase().startsWith("en");
  const labelCol = useEn ? "labelEn" : "labelDe";

  try {
    const [[ballot]] = await pool.query("SELECT id FROM ballots WHERE id=? LIMIT 1", [ballotId]);
    if (!ballot) return res.status(404).json({ code: "BALLOT_NOT_FOUND" });

    const [choices] = await pool.query(
      `SELECT id, ${labelCol} AS label, sortIndex
         FROM choices
        WHERE ballotID = ? AND technicalNone != 1
        ORDER BY sortIndex`,
      [ballotId]
    );

    await logEvent(req, {
      component: "voting",
      eventType: "BALLOT_CHOICES_VIEW",
      details: { ballotId, count: choices.length, lang },
    });

    res.json(choices);
  } catch (e) {
    console.error("GET /ballots/:id/choices error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// vote
router.post("/ballots/:id/vote", requireAuth, async (req, res) => {
  let valid = 1;
  const ballotId = Number(req.params.id);
  let choiceIds = Array.isArray(req.body?.choiceIds) ? req.body.choiceIds.map(Number) : [];
  choiceIds = Array.from(new Set(choiceIds));

  if (!Number.isFinite(ballotId) || choiceIds.some((n) => !Number.isFinite(n))) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  const userId = req.user.id;

  try {
    const [[ballot]] = await pool.query(
      "SELECT id, minChoices, maxChoices FROM ballots WHERE id=? LIMIT 1",
      [ballotId]
    );
    if (!ballot) return res.status(404).json({ code: "BALLOT_NOT_FOUND" });

    const [[noneRow]] = await pool.query(
      "SELECT id FROM choices WHERE ballotID = ? AND technicalNone = 1 LIMIT 1",
      [ballotId]
    );
    if (!noneRow) return res.status(400).json({ code: "INVALID_CHOICE_MISSING" });
    const technicalNoneId = Number(noneRow.id);

    if (choiceIds.includes(technicalNoneId)) {
      choiceIds = choiceIds.filter((id) => id !== technicalNoneId);
    }

    if (choiceIds.length < ballot.minChoices || choiceIds.length > ballot.maxChoices) valid = 0;
    if (choiceIds.length === 0) choiceIds = [technicalNoneId];

    const [validChoices] = await pool.query(
      `SELECT id FROM choices WHERE ballotID=? AND id IN (?)`,
      [ballotId, choiceIds.length ? choiceIds : [0]]
    );
    if (validChoices.length !== choiceIds.length) {
      return res.status(400).json({ code: "CHOICE_NOT_IN_BALLOT" });
    }

    const [[exists]] = await pool.query(
      `SELECT 1 AS x FROM userChoices WHERE userID=? AND ballotsID=? LIMIT 1`,
      [userId, ballotId]
    );
    if (exists) return res.status(409).json({ code: "ALREADY_VOTED" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const cid of choiceIds) {
        await conn.query(
          `INSERT INTO userChoices (ballotsID, choiceID, userID, isValid, createdAt)
           VALUES (?, ?, ?, ?, NOW())`,
          [ballotId, cid, userId, valid]
        );
      }
      await conn.commit();

      await logEvent(req, {
        component: "voting",
        eventType: "VOTE_CAST",
        userId,
        details: { ballotId, choiceIds, valid: !!valid },
      });

      return res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error("vote error:", e);
      return res.status(500).json({ code: "INTERNAL" });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("vote outer error:", e);
    return res.status(500).json({ code: "INTERNAL" });
  }
});

router.get("/ballots/:id/result", async (req, res) => {
  const ballotId = Number(req.params.id);
  if (!Number.isFinite(ballotId)) return res.status(400).json({ code: "BAD_ID" });

  const lang = String(req.query.lang || runtimeConfig.DEFAULT_LANG).slice(0, 5);
  const useEn = lang.toLowerCase().startsWith("en");
  const labelCol = useEn ? "labelEn" : "labelDe";

  try {
    const [rows] = await pool.query(
      `SELECT c.id AS choiceId, c.${labelCol} AS label, COUNT(uc.userID) AS votes
         FROM choices c
         LEFT JOIN userChoices uc
           ON uc.choiceID = c.id
          AND uc.ballotsID = ?
          AND uc.isValid = 1
        WHERE c.ballotID = ?
        GROUP BY c.id, c.${labelCol}
        ORDER BY votes DESC, c.sortIndex ASC`,
      [ballotId, ballotId]
    );

    res.json(rows);
  } catch (e) {
    console.error("GET /ballots/:id/result error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// VOTING: PUBLIC TICKETS
router.post("/voting/tickets", async (req, res) => {
  if (!runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT) {
    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_TICKET_REJECTED_DISABLED",
      level: "WARN",
      details: { reason: "disabled" },
    });
    return res.status(403).json({ code: "DISABLED" });
  }

  const { contact, message, ballotId, electionId, context, pageUrl } = req.body ?? {};

  const msg = typeof message === "string" ? message.trim() : "";
  const contactStr = typeof contact === "string" ? contact.trim() : "";

  if (!msg) return res.status(400).json({ code: "BAD_INPUT" });

  const bId = Number(ballotId);
  const eId = Number(electionId);

  const ticketBallotId = Number.isFinite(bId) && bId > 0 ? bId : null;
  const ticketElectionId = Number.isFinite(eId) && eId > 0 ? eId : null;

  const u = extractUserFromReq(req);
  const userId = u ? u.id : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO tickets (userId, ballotId, electionId, contact, message)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, ticketBallotId, ticketElectionId, contactStr || null, msg]
    );

    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_TICKET_CREATED",
      userId,
      details: {
        ticketId: result.insertId,
        ballotId: ticketBallotId,
        electionId: ticketElectionId,
        context: typeof context === "string" ? context : null,
        pageUrl: typeof pageUrl === "string" ? pageUrl : null,
        hadAuthCookie: !!u,
      },
    });

    return res.status(201).json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error("POST /voting/tickets error:", e);

    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_TICKET_CREATE_ERROR",
      level: "ERROR",
      userId,
      details: { message: e?.message || String(e) },
    });

    return res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
