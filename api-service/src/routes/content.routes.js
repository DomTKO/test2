// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import { pool } from "../db/pool.js";
import { logEvent } from "../services/audit.js";
import { cleanHtml } from "../utils/sanitize.js";
import { normalizeLang, normalizePublicTextKey } from "../config/initConfig.js";

const router = express.Router();

router.get("/content/:pageKey", async (req, res) => {
  const rawKey = String(req.params.pageKey || "").trim();
  if (!rawKey) return res.status(400).json({ code: "BAD_PAGE" });

  const lang = normalizeLang(req.query.lang);
  const resolvedKey = normalizePublicTextKey(rawKey);

  try {
    let [rows] = await pool.query(
      "SELECT html FROM publicTexts WHERE pageKey = ? AND lang = ? LIMIT 1",
      [resolvedKey, lang]
    );

    if ((!rows || !rows.length) && resolvedKey !== rawKey) {
      const [rows2] = await pool.query(
        "SELECT html FROM publicTexts WHERE pageKey = ? AND lang = ? LIMIT 1",
        [rawKey, lang]
      );
      rows = rows2;
    }

    const html = cleanHtml(rows[0]?.html || "");

    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_CONTENT_VIEW",
      details: { pageKey: rawKey, resolvedKey, lang },
    });

    res.json({ pageKey: rawKey, lang, html });
  } catch (e) {
    console.error("GET /content/:pageKey error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
