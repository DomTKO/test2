// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { pool } from "../db/pool.js";

export const runtimeConfig = {
  DEFAULT_LANG: "de",

  RESEARCH_VERIFIER_OFFSET: false,
  RESEARCH_HIDE_QR: false,
  VOTING_QR_ONLY_LAST_BALLOT: false,
  VERIFIER_SHOW_ALL_BALLOTS: false,

  VOTING_HIDE_BALLOT_AFTER_SUBMIT: false,

  VOTING_SHOW_INVALID_VOTE_BUTTON: false,
  VOTING_DISABLE_SUBMIT_ON_INVALID: true,
  VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID: false,

  VOTING_ENABLE_PUBLIC_REPORT: false,

  VERIFIER_REPORT_USE_SIMPLE_VIEW: false,
  VOTING_INVALID_VOTE_CHECKBOX: false,
  VERIFIER_REQUIRE_USERNAME_CONFIRM: false,

  // Priorität: ENV > DB > leer
  VERIFIER_BASE_URL: String(process.env.VERIFIER_BASE_URL || "").trim(),
};

export const SITE_LOGO_PATH = "/api/logo";

export const PUBLIC_TEXT_PAGES = new Set([
  "home",
  "login",
  "verify",
  "votingInfo",
  "systemTitle",
  "appTitle",
]);

export function normalizeLang(raw) {
  const langRaw = String(raw || runtimeConfig.DEFAULT_LANG)
    .slice(0, 5)
    .toLowerCase();
  if (langRaw.startsWith("en")) return "en";
  if (langRaw.startsWith("de")) return "de";
  return String(runtimeConfig.DEFAULT_LANG || "de").toLowerCase().startsWith("en")
    ? "en"
    : "de";
}

// systemTitle <-> appTitle Alias
export function normalizePublicTextKey(rawKey) {
  const k = String(rawKey || "").trim();
  const low = k.toLowerCase();
  if (low === "apptitle") return "systemTitle";
  if (low === "systemtitle") return "systemTitle";
  return k;
}

export function mirrorPublicTitleKey(key) {
  if (key === "systemTitle") return "appTitle";
  if (key === "appTitle") return "systemTitle";
  return null;
}

export function parseBoolFlag(value, current = 1) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(v)) return 1;
    if (["0", "false", "no", "off"].includes(v)) return 0;
  }
  if (typeof value === "number") {
    if (value === 1) return 1;
    if (value === 0) return 0;
  }
  return current;
}

export function normalizeNullableDateTime(val) {
  if (val == null) return null;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  return trimmed;
}

export async function getImageMeta(imgKey) {
  try {
    const [rows] = await pool.query(
      "SELECT mimeType, LENGTH(data) AS size FROM images WHERE imgKey = ? LIMIT 1",
      [imgKey]
    );
    if (!rows.length) return { hasImage: false, mimeType: null, size: 0 };
    const row = rows[0];
    return {
      hasImage: true,
      mimeType: String(row.mimeType || "image/png"),
      size: Number(row.size || 0),
    };
  } catch (e) {
    console.warn("Image meta read failed for", imgKey, ":", e?.message);
    return { hasImage: false, mimeType: null, size: 0 };
  }
}

export async function getLogoMeta() {
  const meta = await getImageMeta("site-logo");
  return { hasLogo: meta.hasImage, mimeType: meta.mimeType, size: meta.size };
}

async function readBoolConfig(key, fallback) {
  try {
    const [rows] = await pool.query(
      "SELECT cVal FROM config WHERE cKey = ? LIMIT 1",
      [key]
    );
    if (rows[0]?.cVal != null) {
      const v = String(rows[0].cVal).trim().toLowerCase();
      return v === "1" || v === "true" || v === "yes" || v === "on";
    }
    return fallback;
  } catch (e) {
    console.warn(`Config read failed for ${key}, using fallback:`, e?.message);
    return fallback;
  }
}

export async function initConfig() {
  // defaultLanguage
  try {
    const [rows] = await pool.query(
      "SELECT cVal FROM config WHERE cKey = 'defaultLanguage' LIMIT 1"
    );
    if (rows[0]?.cVal) runtimeConfig.DEFAULT_LANG = String(rows[0].cVal).slice(0, 5);
    console.log("Default language:", runtimeConfig.DEFAULT_LANG);
  } catch (e) {
    console.warn("Config read failed, using fallback 'de':", e?.message);
  }

  // verifierBaseUrl: nur aus DB, wenn ENV nicht gesetzt
  try {
    const [rows] = await pool.query(
      "SELECT cVal FROM config WHERE cKey = 'verifierBaseUrl' LIMIT 1"
    );
    const dbVal = rows[0]?.cVal != null ? String(rows[0].cVal).trim() : "";
    if (!runtimeConfig.VERIFIER_BASE_URL && dbVal) runtimeConfig.VERIFIER_BASE_URL = dbVal;
    console.log("Verifier base URL:", runtimeConfig.VERIFIER_BASE_URL || "(empty)");
  } catch (e) {
    console.warn("Config read failed for verifierBaseUrl:", e?.message);
  }

  runtimeConfig.RESEARCH_VERIFIER_OFFSET = await readBoolConfig(
    "researchVerifierOffset",
    runtimeConfig.RESEARCH_VERIFIER_OFFSET
  );
  runtimeConfig.RESEARCH_HIDE_QR = await readBoolConfig(
    "researchHideQr",
    runtimeConfig.RESEARCH_HIDE_QR
  );
  runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT = await readBoolConfig(
    "votingQrOnlyLastBallot",
    runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT
  );
  runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS = await readBoolConfig(
    "verifierShowAllBallots",
    runtimeConfig.VERIFIER_SHOW_ALL_BALLOTS
  );
  runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT = await readBoolConfig(
    "votingHideBallotAfterSubmit",
    runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT
  );
  runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON = await readBoolConfig(
    "votingShowInvalidVoteButton",
    runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON
  );
  runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID = await readBoolConfig(
    "votingDisableSubmitOnInvalid",
    runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID
  );
  runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID = await readBoolConfig(
    "votingDisableInvalidButtonWhenValid",
    runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID
  );
  runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT = await readBoolConfig(
    "votingEnablePublicReport",
    runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT
  );
  runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW = await readBoolConfig(
    "verifierReportUseSimpleView",
    runtimeConfig.VERIFIER_REPORT_USE_SIMPLE_VIEW
  );
    runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX = await readBoolConfig(
    "votingInvalidVoteCheckbox",
    runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX
  );
  runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM = await readBoolConfig(
    "verifierRequireUsernameConfirm",
    runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM
  );

}
