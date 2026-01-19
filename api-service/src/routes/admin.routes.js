// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import argon2 from "argon2";
import crypto from "crypto";

import { APP_MODE } from "../config/env.js";
import { pool } from "../db/pool.js";
import { upload } from "../middleware/upload.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

import {
  logEvent,
  VOTER_AUDIT_EVENT_TYPES,
  getAuditLabelDe,
} from "../services/audit.js";

import { cleanHtml } from "../utils/sanitize.js";
import {
  runtimeConfig,
  SITE_LOGO_PATH,
  PUBLIC_TEXT_PAGES,
  normalizeLang,
  mirrorPublicTitleKey,
  parseBoolFlag,
  normalizeNullableDateTime,
  getLogoMeta,
} from "../config/initConfig.js";

const router = express.Router();
const STORE_HASH_AS_BINARY = true;
const ALLOWED_ROLES = new Set(["admin", "voter", "showroom"]);

// PUBLIC TEXTS
router.get("/admin/public-texts", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT pageKey, lang, html FROM publicTexts");

    const result = {};
    for (const key of PUBLIC_TEXT_PAGES) result[key] = { de: "", en: "" };

    const canonMap = {};
    for (const key of PUBLIC_TEXT_PAGES) canonMap[key.toLowerCase()] = key;

    for (const row of rows) {
      const rawKey = String(row.pageKey || "").trim();
      if (!rawKey) continue;

      const canonKey = canonMap[rawKey.toLowerCase()];
      if (!canonKey) continue;

      const lang = normalizeLang(row.lang);
      if (lang !== "de" && lang !== "en") continue;

      result[canonKey][lang] = cleanHtml(row.html || "");
    }

    if (result.systemTitle && result.appTitle) {
      if (!result.systemTitle.de && result.appTitle.de) result.systemTitle.de = result.appTitle.de;
      if (!result.systemTitle.en && result.appTitle.en) result.systemTitle.en = result.appTitle.en;
      if (!result.appTitle.de && result.systemTitle.de) result.appTitle.de = result.systemTitle.de;
      if (!result.appTitle.en && result.systemTitle.en) result.appTitle.en = result.systemTitle.en;
    }

    res.json(result);
  } catch (e) {
    console.error("GET /admin/public-texts error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.put("/admin/public-texts", requireAuth, requireAdmin, async (req, res) => {
  const body = req.body || {};
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const updated = [];

    for (const pageKey of PUBLIC_TEXT_PAGES) {
      const block = body[pageKey];
      if (!block) continue;

      const deHtml = cleanHtml(typeof block.de === "string" ? block.de : "");
      const enHtml = cleanHtml(typeof block.en === "string" ? block.en : "");

      await conn.query(
        `INSERT INTO publicTexts (pageKey, lang, html)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE html = VALUES(html)`,
        [pageKey, "de", deHtml]
      );
      await conn.query(
        `INSERT INTO publicTexts (pageKey, lang, html)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE html = VALUES(html)`,
        [pageKey, "en", enHtml]
      );

      updated.push(pageKey);

      const mirrorKey = mirrorPublicTitleKey(pageKey);
      if (mirrorKey) {
        await conn.query(
          `INSERT INTO publicTexts (pageKey, lang, html)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE html = VALUES(html)`,
          [mirrorKey, "de", deHtml]
        );
        await conn.query(
          `INSERT INTO publicTexts (pageKey, lang, html)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE html = VALUES(html)`,
          [mirrorKey, "en", enHtml]
        );
        if (!updated.includes(mirrorKey)) updated.push(mirrorKey);
      }
    }

    await conn.commit();
    res.json({ ok: true, updated });
  } catch (e) {
    console.error("PUT /admin/public-texts error:", e);
    try { await conn.rollback(); } catch {}
    res.status(500).json({ code: "INTERNAL" });
  } finally {
    conn.release();
  }
});

// ADMIN CONFIG
router.get("/admin/config", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const meta = await getLogoMeta();

    res.json({
      defaultLanguage: runtimeConfig.DEFAULT_LANG,
      siteLogoUrl: meta.hasLogo ? SITE_LOGO_PATH : "",
      hasLogo: meta.hasLogo,
      logoMimeType: meta.mimeType,
      logoSize: meta.size,

      researchVerifierOffset: runtimeConfig.RESEARCH_VERIFIER_OFFSET,
      researchHideQr: runtimeConfig.RESEARCH_HIDE_QR,
      votingQrOnlyLastBallot: runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT,
      verifierShowAllBallots: runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS,

      votingHideBallotAfterSubmit: runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT,
      votingShowInvalidVoteButton: runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON,
      votingDisableSubmitOnInvalid: runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID,
      votingDisableInvalidButtonWhenValid:
        runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID,

      votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,
      votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
      verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

      verifierReportUseSimpleView: runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW,

      appMode: APP_MODE,
      verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
    });
  } catch (e) {
    console.error("GET /admin/config error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.put("/admin/config", requireAuth, requireAdmin, async (req, res) => {
  let {
    defaultLanguage,
    researchVerifierOffset,
    researchHideQr,
    votingQrOnlyLastBallot,
    verifierShowAllBallots,
    votingHideBallotAfterSubmit,

    votingShowInvalidVoteButton,
    votingDisableSubmitOnInvalid,
    votingDisableInvalidButtonWhenValid,

    votingEnablePublicReport,
    votingInvalidVoteCheckbox,
    verifierRequireUsernameConfirm,

    verifierReportUseSimpleView,

    verifierBaseUrl,
  } = req.body ?? {};

  const parseBool = (value, current) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(v)) return true;
      if (["0", "false", "no", "off"].includes(v)) return false;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    return current;
  };

  let newDefaultLang = runtimeConfig.DEFAULT_LANG;
  if (typeof defaultLanguage === "string" && defaultLanguage.trim()) {
    newDefaultLang = normalizeLang(defaultLanguage);
  }

  const newResearchVerifierOffset = parseBool(
    researchVerifierOffset,
    runtimeConfig.RESEARCH_VERIFIER_OFFSET
  );
  const newResearchHideQr = parseBool(researchHideQr, runtimeConfig.RESEARCH_HIDE_QR);
  const newVotingQrOnlyLastBallot = parseBool(
    votingQrOnlyLastBallot,
    runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT
  );
  const newVerifierShowAllBallots = parseBool(
    verifierShowAllBallots,
    runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS
  );
  const newVotingHideBallotAfterSubmit = parseBool(
    votingHideBallotAfterSubmit,
    runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT
  );

  const newVotingShowInvalidVoteButton = parseBool(
    votingShowInvalidVoteButton,
    runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON
  );
  const newVotingDisableSubmitOnInvalid = parseBool(
    votingDisableSubmitOnInvalid,
    runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID
  );
  const newVotingDisableInvalidButtonWhenValid = parseBool(
    votingDisableInvalidButtonWhenValid,
    runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID
  );

  const newVotingEnablePublicReport = parseBool(
    votingEnablePublicReport,
    runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT
  );

  const newVotingInvalidVoteCheckbox = parseBool(
    votingInvalidVoteCheckbox,
    runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX
  );

  const newVerifierRequireUsernameConfirm = parseBool(
    verifierRequireUsernameConfirm,
    runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM
  );

  const newVerifierReportUseSimpleView = parseBool(
    verifierReportUseSimpleView,
    runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW
  );

  let newVerifierBaseUrl = runtimeConfig.VERIFIER_BASE_URL;
  if (verifierBaseUrl !== undefined) {
    if (verifierBaseUrl === null) newVerifierBaseUrl = "";
    else if (typeof verifierBaseUrl === "string") newVerifierBaseUrl = verifierBaseUrl.trim();
  }

  try {
    if (newDefaultLang !== runtimeConfig.DEFAULT_LANG) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('defaultLanguage', ?, 'Standard language of the application (de/en)')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newDefaultLang]
      );
      runtimeConfig.DEFAULT_LANG = newDefaultLang;
    }

    if (newResearchVerifierOffset !== runtimeConfig.RESEARCH_VERIFIER_OFFSET) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('researchVerifierOffset', ?, 'If set, verifier display is offset by one (research mode)')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newResearchVerifierOffset ? "1" : "0"]
      );
      runtimeConfig.RESEARCH_VERIFIER_OFFSET = newResearchVerifierOffset;
    }

    if (newResearchHideQr !== runtimeConfig.RESEARCH_HIDE_QR) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('researchHideQr', ?, 'If set, QR code is hidden in the voting/verifier UI (research mode)')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newResearchHideQr ? "1" : "0"]
      );
      runtimeConfig.RESEARCH_HIDE_QR = newResearchHideQr;
    }

    if (newVotingQrOnlyLastBallot !== runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingQrOnlyLastBallot', ?, 'If set, the verifier QR code in the voting UI is only shown after the last ballot of a voter')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newVotingQrOnlyLastBallot ? "1" : "0"]
      );
      runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT = newVotingQrOnlyLastBallot;
    }

    if (newVerifierShowAllBallots !== runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('verifierShowAllBallots', ?, 'If set, verifier lookup shows all ballots of a voter instead of only the QR ballot / first/second pair')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newVerifierShowAllBallots ? "1" : "0"]
      );
      runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS = newVerifierShowAllBallots;
    }

    if (newVotingHideBallotAfterSubmit !== runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingHideBallotAfterSubmit', ?, 'If set, hide the ballot/selection UI after submitting a vote (show only verification/finish area).')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal)`,
        [newVotingHideBallotAfterSubmit ? "1" : "0"]
      );
      runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT = newVotingHideBallotAfterSubmit;
    }

    if (newVotingShowInvalidVoteButton !== runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingShowInvalidVoteButton', ?, 'If set, the voting UI shows a dedicated "invalid vote" button (instead of one combined button).')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVotingShowInvalidVoteButton ? "1" : "0"]
      );
      runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON = newVotingShowInvalidVoteButton;
    }

    if (newVotingDisableSubmitOnInvalid !== runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingDisableSubmitOnInvalid', ?, 'If set, the normal "submit vote" button is disabled when the current selection is invalid (only relevant when votingShowInvalidVoteButton=1).')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVotingDisableSubmitOnInvalid ? "1" : "0"]
      );
      runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID = newVotingDisableSubmitOnInvalid;
    }

    if (
      newVotingDisableInvalidButtonWhenValid !==
      runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID
    ) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingDisableInvalidButtonWhenValid', ?, 'If set, the dedicated "invalid vote" button is disabled when the current selection is valid (only relevant when votingShowInvalidVoteButton=1).')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVotingDisableInvalidButtonWhenValid ? "1" : "0"]
      );
      runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID =
        newVotingDisableInvalidButtonWhenValid;
    }

    if (newVotingEnablePublicReport !== runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingEnablePublicReport', ?, 'If set, anyone (also not logged in) can create a problem report ticket from the voting UI.')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVotingEnablePublicReport ? "1" : "0"]
      );
      runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT = newVotingEnablePublicReport;
    }

    if (newVotingInvalidVoteCheckbox !== runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('votingInvalidVoteCheckbox', ?, 'If set, voting UI shows an explicit checkbox to vote invalid.')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVotingInvalidVoteCheckbox ? "1" : "0"]
      );
      runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX = newVotingInvalidVoteCheckbox;
    }

    if (
      newVerifierRequireUsernameConfirm !==
      runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM
    ) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('verifierRequireUsernameConfirm', ?, 'If set, verifier requires confirming the userName before lookup.')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVerifierRequireUsernameConfirm ? "1" : "0"]
      );
      runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM = newVerifierRequireUsernameConfirm;
    }

    if (newVerifierReportUseSimpleView !== runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('verifierReportUseSimpleView', ?, 'If set, the verifier "Problem melden" button opens the simple report view instead of the popup.')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVerifierReportUseSimpleView ? "1" : "0"]
      );
      runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW = newVerifierReportUseSimpleView;
    }

    if (newVerifierBaseUrl !== runtimeConfig.VERIFIER_BASE_URL) {
      await pool.query(
        `INSERT INTO config (cKey, cVal, description)
         VALUES ('verifierBaseUrl', ?, 'Base URL (scheme+host) of the verifier app, used to generate verifier links/QR codes')
         ON DUPLICATE KEY UPDATE cVal = VALUES(cVal), description = VALUES(description)`,
        [newVerifierBaseUrl]
      );
      runtimeConfig.VERIFIER_BASE_URL = newVerifierBaseUrl;
    }

    res.json({
      ok: true,
      defaultLanguage: runtimeConfig.DEFAULT_LANG,
      researchVerifierOffset: runtimeConfig.RESEARCH_VERIFIER_OFFSET,
      researchHideQr: runtimeConfig.RESEARCH_HIDE_QR,
      votingQrOnlyLastBallot: runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT,
      verifierShowAllBallots: runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS,
      votingHideBallotAfterSubmit: runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT,
      votingShowInvalidVoteButton: runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON,
      votingDisableSubmitOnInvalid: runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID,
      votingDisableInvalidButtonWhenValid:
        runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID,
      votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,
      votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
      verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,
      verifierReportUseSimpleView: runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW,
      appMode: APP_MODE,
      verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
    });
  } catch (e) {
    console.error("PUT /admin/config error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// LOGO
router.get("/admin/logo", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const meta = await getLogoMeta();
    res.json({
      hasLogo: meta.hasLogo,
      mimeType: meta.mimeType,
      size: meta.size,
      siteLogoUrl: meta.hasLogo ? SITE_LOGO_PATH : "",
    });
  } catch (e) {
    console.error("GET /admin/logo error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

async function handleAdminLogoUpload(req, res) {
  const file = req.file;
  if (!file) return res.status(400).json({ code: "NO_FILE" });

  const allowed = new Set([
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/svg+xml",
    "image/gif",
    "image/webp",
  ]);

  if (!allowed.has(file.mimetype)) {
    return res.status(400).json({ code: "BAD_MIME", mimeType: file.mimetype });
  }

  try {
    await pool.query(
      `INSERT INTO images (imgKey, mimeType, data)
       VALUES ('site-logo', ?, ?)
       ON DUPLICATE KEY UPDATE
         mimeType = VALUES(mimeType),
         data     = VALUES(data)`,
      [file.mimetype, file.buffer]
    );

    res.json({
      ok: true,
      mimeType: file.mimetype,
      size: file.size,
      siteLogoUrl: SITE_LOGO_PATH,
    });
  } catch (e) {
    console.error("ADMIN /admin/logo upload error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
}

router.post("/admin/logo", requireAuth, requireAdmin, upload.single("file"), handleAdminLogoUpload);
router.put("/admin/logo", requireAuth, requireAdmin, upload.single("file"), handleAdminLogoUpload);

router.delete("/admin/logo", requireAuth, requireAdmin, async (_req, res) => {
  try {
    await pool.query("DELETE FROM images WHERE imgKey = 'site-logo'");
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/logo error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

async function handleSiteLogo(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT mimeType, data FROM images WHERE imgKey = 'site-logo' LIMIT 1"
    );
    if (!rows.length) return res.status(404).send("NO_LOGO");

    const row = rows[0];
    const mimeType = row.mimeType || "image/png";

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=3600");

    await logEvent(req, {
      component: "voting",
      eventType: "SITE_LOGO_VIEW",
      details: { mimeType },
    });

    return res.send(row.data);
  } catch (e) {
    console.error("GET site logo error:", e);
    return res.status(500).send("INTERNAL");
  }
}

router.get("/logo", handleSiteLogo);
router.get("/api/logo", handleSiteLogo);

// USERS
function generatePassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let pw = "";
  for (let i = 0; i < length; i++) pw += alphabet[bytes[i] % alphabet.length];
  return pw;
}

function generateUsernameSuffix(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function normalizeSuffixLength(n) {
  const x = Number(n);
  if (x === 4 || x === 5 || x === 6) return x;
  return 4;
}

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, userName, role, isActive FROM users ORDER BY id ASC"
    );
    const users = rows.map((u) => ({
      id: u.id,
      username: u.userName,
      role: u.role,
      isActive: u.isActive,
    }));
    res.json(users);
  } catch (e) {
    console.error("GET /admin/users error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.patch("/admin/users/:id/active", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ code: "BAD_ID" });

  const { isActive } = req.body ?? {};
  const flag = isActive ? 1 : 0;

  if (id === req.user.id && flag === 0) return res.status(400).json({ code: "CANNOT_DEACTIVATE_SELF" });

  try {
    const [result] = await pool.query("UPDATE users SET isActive = ? WHERE id = ?", [flag, id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: "USER_NOT_FOUND" });
    res.json({ ok: true, isActive: flag });
  } catch (e) {
    console.error("PATCH /admin/users/:id/active error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/admin/users/batch", requireAuth, requireAdmin, async (req, res) => {
  let { prefix, count, role, suffixLength } = req.body ?? {};

  prefix = String(prefix || "user").trim();
  count = Number(count) || 1;
  role = String(role || "voter").toLowerCase();
  suffixLength = normalizeSuffixLength(suffixLength);

  if (!ALLOWED_ROLES.has(role)) role = "voter";
  if (!prefix) return res.status(400).json({ code: "BAD_PREFIX" });
  if (count < 1 || count > 500) return res.status(400).json({ code: "BAD_COUNT" });

  const created = [];
  const usedInBatch = new Set();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const MAX_TRIES_PER_USER = 60;

    for (let i = 0; i < count; i++) {
      let tries = 0;

      while (tries < MAX_TRIES_PER_USER) {
        tries += 1;

        const username = `${prefix}${generateUsernameSuffix(suffixLength)}`;
        if (usedInBatch.has(username)) continue;

        const [exists] = await conn.query(
          "SELECT id FROM users WHERE userName=? LIMIT 1",
          [username]
        );
        if (exists.length) continue;

        const password = generatePassword(10);
        const hash = await argon2.hash(password, {
          type: argon2.argon2id,
          timeCost: 3,
          memoryCost: 19456,
          parallelism: 1,
        });
        const valueForDb = STORE_HASH_AS_BINARY ? Buffer.from(hash) : hash;

        try {
          await conn.query(
            "INSERT INTO users (userName, pwHash, role, isActive) VALUES (?, ?, ?, 1)",
            [username, valueForDb, role]
          );
        } catch (e) {
          if (e && e.code === "ER_DUP_ENTRY") continue;
          throw e;
        }

        usedInBatch.add(username);
        created.push({ username, password });
        break;
      }

      if (tries >= MAX_TRIES_PER_USER) {
        throw new Error(
          `Could not generate unique username for prefix='${prefix}' after ${MAX_TRIES_PER_USER} tries`
        );
      }
    }

    await conn.commit();
    return res.status(201).json({ created });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error("POST /admin/users/batch error:", e);
    return res.status(500).json({ code: "INTERNAL" });
  } finally {
    conn.release();
  }
});

router.delete("/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ code: "BAD_ID" });
  if (id === req.user.id) return res.status(400).json({ code: "CANNOT_DELETE_SELF" });

  try {
    const [result] = await pool.query("UPDATE users SET isActive = 0 WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: "USER_NOT_FOUND" });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/users/:id error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// LOGS
router.get("/admin/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    let limit = Number(req.query.limit) || 200;
    if (!Number.isFinite(limit) || limit <= 0) limit = 200;
    if (limit > 1000) limit = 1000;

    const raw = String(req.query.raw || "0") === "1";

    const where = [];
    const params = [];

    const component = typeof req.query.component === "string" ? req.query.component : "";
    const level = typeof req.query.level === "string" ? req.query.level : "";

    if (component) {
      where.push("l.component = ?");
      params.push(component);
    } else if (!raw) {
      where.push("l.component IN ('voting','verifier')");
    }

    if (level) {
      where.push("l.level = ?");
      params.push(level);
    }

    if (!raw) {
      where.push("l.eventType IN (?)");
      params.push(Array.from(VOTER_AUDIT_EVENT_TYPES));
    }

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT
         l.id,
         l.userId,
         u.userName AS userName,
         l.component,
         l.eventType,
         l.level,
         l.userAgent,
         l.details,
         l.createdAt
       FROM logs l
       LEFT JOIN users u ON u.id = l.userId
       ${whereSql}
       ORDER BY l.createdAt DESC, l.id DESC
       LIMIT ?`,
      [...params, limit]
    );

    const safeParse = (s) => {
      try { return typeof s === "string" ? JSON.parse(s) : null; } catch { return null; }
    };

    const out = rows.map((r) => {
      const parsedDetails = safeParse(r.details);
      const usernameFallback = parsedDetails?.username || parsedDetails?.userName || null;

      return {
        id: r.id,
        userId: r.userId,
        username: r.userName || usernameFallback,
        component: r.component,
        eventCode: r.eventType,
        eventType: raw ? r.eventType : getAuditLabelDe(r.eventType),
        level: r.level,
        userAgent: r.userAgent,
        details: r.details,
        createdAt: r.createdAt,
      };
    });

    res.json(out);
  } catch (e) {
    console.error("GET /admin/logs error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// ELECTIONS
router.get("/admin/elections", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,
              slug,
              nameDe,
              nameEn,
              descriptionDe,
              descriptionEn,
              startsAt,
              endsAt,
              isActive,
              createdAt,
              updatedAt
         FROM elections
        ORDER BY
          startsAt IS NULL ASC,
          startsAt ASC,
          id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /admin/elections error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/admin/elections", requireAuth, requireAdmin, async (req, res) => {
  let {
    slug,
    nameDe,
    nameEn,
    descriptionDe,
    descriptionEn,
    startsAt,
    endsAt,
    isActive,
  } = req.body ?? {};

  slug = String(slug || "").trim();
  nameDe = String(nameDe || "").trim();
  nameEn = nameEn != null ? String(nameEn).trim() : "";
  descriptionDe = String(descriptionDe || "").trim();
  descriptionEn = descriptionEn != null ? String(descriptionEn).trim() : descriptionDe || "";

  if (!slug || !nameDe || !descriptionDe || !descriptionEn) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  const startsAtVal = normalizeNullableDateTime(startsAt);
  const endsAtVal = normalizeNullableDateTime(endsAt);
  const isActiveFlag = parseBoolFlag(isActive, 1);

  try {
    const [result] = await pool.query(
      `INSERT INTO elections
         (slug, nameDe, nameEn, descriptionDe, descriptionEn, startsAt, endsAt, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [slug, nameDe, nameEn || null, descriptionDe, descriptionEn, startsAtVal, endsAtVal, isActiveFlag]
    );

    res.status(201).json({
      id: result.insertId,
      slug,
      nameDe,
      nameEn: nameEn || null,
      descriptionDe,
      descriptionEn,
      startsAt: startsAtVal,
      endsAt: endsAtVal,
      isActive: isActiveFlag,
    });
  } catch (e) {
    console.error("POST /admin/elections error:", e);
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ code: "SLUG_EXISTS" });
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.patch("/admin/elections/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ code: "BAD_ID" });

  let { slug, nameDe, nameEn, descriptionDe, descriptionEn, startsAt, endsAt, isActive } =
    req.body ?? {};

  const fields = [];
  const params = [];

  if (typeof slug === "string") {
    const s = slug.trim();
    if (!s) return res.status(400).json({ code: "BAD_INPUT", detail: "slug_empty" });
    fields.push("slug = ?");
    params.push(s);
  }
  if (typeof nameDe === "string") {
    const v = nameDe.trim();
    if (!v) return res.status(400).json({ code: "BAD_INPUT", detail: "nameDe_empty" });
    fields.push("nameDe = ?");
    params.push(v);
  }
  if (typeof nameEn === "string") {
    fields.push("nameEn = ?");
    params.push(nameEn.trim() || null);
  }
  if (typeof descriptionDe === "string") {
    const v = descriptionDe.trim();
    if (!v) return res.status(400).json({ code: "BAD_INPUT", detail: "descriptionDe_empty" });
    fields.push("descriptionDe = ?");
    params.push(v);
  }
  if (typeof descriptionEn === "string") {
    const v = descriptionEn.trim();
    if (!v) return res.status(400).json({ code: "BAD_INPUT", detail: "descriptionEn_empty" });
    fields.push("descriptionEn = ?");
    params.push(v);
  }
  if (startsAt !== undefined) {
    fields.push("startsAt = ?");
    params.push(normalizeNullableDateTime(startsAt));
  }
  if (endsAt !== undefined) {
    fields.push("endsAt = ?");
    params.push(normalizeNullableDateTime(endsAt));
  }
  if (isActive !== undefined) {
    fields.push("isActive = ?");
    params.push(parseBoolFlag(isActive));
  }

  if (!fields.length) return res.status(400).json({ code: "NO_FIELDS" });

  try {
    const [result] = await pool.query(
      `UPDATE elections SET ${fields.join(", ")} WHERE id = ?`,
      [...params, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ code: "ELECTION_NOT_FOUND" });
    res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /admin/elections/:id error:", e);
    if (e && e.code === "ER_DUP_ENTRY") return res.status(400).json({ code: "SLUG_EXISTS" });
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.delete("/admin/elections/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ code: "BAD_ID" });

  try {
    const [result] = await pool.query("DELETE FROM elections WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ code: "ELECTION_NOT_FOUND" });
    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/elections/:id error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// BALLOTS (admin)
router.get("/admin/ballots", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.titleDe,
         b.titleEn,
         b.descriptionDe,
         b.descriptionEn,
         b.minChoices,
         b.maxChoices,
         b.ballotType,
         b.electionID AS electionId,
         e.slug AS electionSlug,
         e.nameDe AS electionNameDe,
         e.nameEn AS electionNameEn
       FROM ballots b
       LEFT JOIN elections e ON e.id = b.electionID
       ORDER BY b.id ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /admin/ballots error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/admin/ballots", requireAuth, requireAdmin, async (req, res) => {
  let { titleDe, titleEn, descriptionDe, descriptionEn, minChoices, maxChoices, ballotType, electionId } =
    req.body ?? {};

  titleDe = String(titleDe || "").trim();
  titleEn = String(titleEn || "").trim();
  descriptionDe = String(descriptionDe || "").trim();
  descriptionEn = String(descriptionEn || "").trim();
  minChoices = Number(minChoices);
  maxChoices = Number(maxChoices);

  ballotType = String(ballotType || "simple").trim().toLowerCase();
  if (!["simple", "first", "second"].includes(ballotType)) ballotType = "simple";

  if (
    !titleDe ||
    !titleEn ||
    !Number.isFinite(minChoices) ||
    !Number.isFinite(maxChoices) ||
    minChoices < 0 ||
    maxChoices < 1 ||
    minChoices > maxChoices
  ) {
    return res.status(400).json({ code: "BAD_INPUT" });
  }

  let electionIdNum = null;

  if (ballotType === "simple") {
    electionIdNum = null;
  } else {
    const parsed = Number(electionId);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({
        code: "BAD_ELECTION",
        message: "FIRST/SECOND ballots require a valid numeric electionId",
      });
    }
    electionIdNum = parsed;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (electionIdNum !== null) {
      const [[election]] = await conn.query(
        "SELECT id FROM elections WHERE id = ? LIMIT 1",
        [electionIdNum]
      );
      if (!election) {
        await conn.rollback();
        return res.status(400).json({ code: "BAD_ELECTION", message: "Election with given id does not exist" });
      }
    }

    const [result] = await conn.query(
      `INSERT INTO ballots
         (electionID, ballotType, titleDe, titleEn, descriptionDe, descriptionEn, minChoices, maxChoices)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [electionIdNum, ballotType, titleDe, titleEn, descriptionDe, descriptionEn, minChoices, maxChoices]
    );

    const ballotId = result.insertId;

    await conn.query(
      `INSERT INTO choices
         (ballotID, sortIndex, labelDe, labelEn, technicalNone)
       VALUES (?, 0, 'kein', 'none', 1)`,
      [ballotId]
    );

    await conn.commit();

    return res.status(201).json({
      id: ballotId,
      titleDe,
      titleEn,
      descriptionDe,
      descriptionEn,
      minChoices,
      maxChoices,
      ballotType,
      electionId: electionIdNum,
    });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error("POST /admin/ballots error:", e);

    if (e && (e.code === "ER_NO_REFERENCED_ROW" || e.code === "ER_NO_REFERENCED_ROW_2")) {
      return res.status(400).json({
        code: "BAD_ELECTION",
        message: "Foreign key constraint failed: electionId must reference an existing election or be null",
      });
    }

    return res.status(500).json({
      code: "INTERNAL",
      message: "Ballot creation failed",
      ...(process.env.NODE_ENV !== "production" ? { detail: e.message, sqlCode: e.code } : {}),
    });
  } finally {
    conn.release();
  }
});

router.delete("/admin/ballots/:id", requireAuth, requireAdmin, async (req, res) => {
  const ballotId = Number(req.params.id);
  if (!Number.isFinite(ballotId)) return res.status(400).json({ code: "BAD_ID" });

  try {
    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS c FROM userChoices WHERE ballotsID=?",
      [ballotId]
    );
    if (row.c > 0) return res.status(400).json({ code: "HAS_VOTES" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM choices WHERE ballotID=?", [ballotId]);
      const [result] = await conn.query("DELETE FROM ballots WHERE id=?", [ballotId]);
      await conn.commit();

      if (result.affectedRows === 0) return res.status(404).json({ code: "BALLOT_NOT_FOUND" });
      res.json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error("DELETE /admin/ballots/:id error:", e);
      res.status(500).json({ code: "INTERNAL" });
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error("DELETE /admin/ballots/:id outer error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.get("/admin/ballots/:id/choices", requireAuth, requireAdmin, async (req, res) => {
  const ballotId = Number(req.params.id);
  if (!Number.isFinite(ballotId)) return res.status(400).json({ code: "BAD_BALLOT" });

  try {
    const [rows] = await pool.query(
      `SELECT id,
              ballotID AS ballotId,
              labelDe,
              labelEn,
              sortIndex,
              technicalNone
         FROM choices
        WHERE ballotID = ?
        ORDER BY sortIndex ASC`,
      [ballotId]
    );
    res.json(rows);
  } catch (e) {
    console.error("GET /admin/ballots/:id/choices error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.post("/admin/ballots/:id/choices", requireAuth, requireAdmin, async (req, res) => {
  const ballotId = Number(req.params.id);
  if (!Number.isFinite(ballotId)) return res.status(400).json({ code: "BAD_BALLOT" });

  let { labelDe, labelEn } = req.body ?? {};
  labelDe = String(labelDe || "").trim();
  labelEn = String(labelEn || "").trim();
  if (!labelDe || !labelEn) return res.status(400).json({ code: "BAD_INPUT" });

  const conn = await pool.getConnection();
  try {
    const [[ballot]] = await conn.query("SELECT id FROM ballots WHERE id=? LIMIT 1", [ballotId]);
    if (!ballot) return res.status(404).json({ code: "BALLOT_NOT_FOUND" });

    const [[idxRow]] = await conn.query(
      "SELECT COALESCE(MAX(sortIndex), -1) AS maxIdx FROM choices WHERE ballotID=?",
      [ballotId]
    );
    const nextIndex = Number(idxRow.maxIdx ?? -1) + 1;

    const [result] = await conn.query(
      `INSERT INTO choices
         (ballotID, sortIndex, labelDe, labelEn, technicalNone)
       VALUES (?, ?, ?, ?, 0)`,
      [ballotId, nextIndex, labelDe, labelEn]
    );

    res.status(201).json({
      id: result.insertId,
      ballotId,
      labelDe,
      labelEn,
      sortIndex: nextIndex,
      technicalNone: 0,
    });
  } catch (e) {
    console.error("POST /admin/ballots/:id/choices error:", e);
    res.status(500).json({ code: "INTERNAL" });
  } finally {
    conn.release();
  }
});

router.delete("/admin/choices/:id", requireAuth, requireAdmin, async (req, res) => {
  const choiceId = Number(req.params.id);
  if (!Number.isFinite(choiceId)) return res.status(400).json({ code: "BAD_CHOICE" });

  try {
    const [[choice]] = await pool.query(
      "SELECT id, technicalNone FROM choices WHERE id=? LIMIT 1",
      [choiceId]
    );
    if (!choice) return res.status(404).json({ code: "CHOICE_NOT_FOUND" });

    if (choice.technicalNone === 1) return res.status(400).json({ code: "CANNOT_DELETE_NONE" });

    const [[row]] = await pool.query(
      "SELECT COUNT(*) AS c FROM userChoices WHERE choiceID=?",
      [choiceId]
    );
    if (row.c > 0) return res.status(400).json({ code: "HAS_VOTES" });

    const [result] = await pool.query("DELETE FROM choices WHERE id=?", [choiceId]);
    if (result.affectedRows === 0) return res.status(404).json({ code: "CHOICE_NOT_FOUND" });

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /admin/choices/:id error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

// TICKETS (admin)
router.get("/admin/tickets", requireAuth, requireAdmin, async (req, res) => {
  try {
    const onlyOpen = String(req.query.onlyOpen || "0") === "1";

    const where = [];
    const params = [];
    if (onlyOpen) where.push("t.resolved = 0");

    const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT
         t.id,
         t.userId,
         u.userName AS userName,
         t.ballotId,
         t.electionId AS ticketElectionId,
         b.titleDe AS ballotTitleDe,
         b.titleEn AS ballotTitleEn,
         b.ballotType,
         COALESCE(t.electionId, b.electionID) AS electionId,
         e.slug AS electionSlug,
         e.nameDe AS electionNameDe,
         e.nameEn AS electionNameEn,
         t.contact,
         t.message,
         t.createdAt,
         t.resolved,
         t.resolvedAt
       FROM tickets t
       LEFT JOIN users u     ON u.id = t.userId
       LEFT JOIN ballots b   ON b.id = t.ballotId
       LEFT JOIN elections e ON e.id = COALESCE(t.electionId, b.electionID)
       ${whereSql}
       ORDER BY t.createdAt DESC, t.id DESC`,
      params
    );

    res.json(rows);
  } catch (e) {
    console.error("GET /admin/tickets error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

router.patch("/admin/tickets/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ code: "BAD_ID" });

  const { resolved } = req.body ?? {};
  const resolvedFlag = resolved ? 1 : 0;

  try {
    const [result] = await pool.query(
      `UPDATE tickets
          SET resolved  = ?,
              resolvedAt = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
        WHERE id = ?`,
      [resolvedFlag, resolvedFlag, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ code: "TICKET_NOT_FOUND" });
    res.json({ ok: true, resolved: resolvedFlag });
  } catch (e) {
    console.error("PATCH /admin/tickets/:id error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
