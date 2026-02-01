// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import jwt from "jsonwebtoken";
import { pool } from "../db/pool.js";
import { JWT_SECRET } from "../config/env.js";

export const VOTER_AUDIT_EVENT_TYPES = new Set([
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "LOGIN_INACTIVE",
  "LOGOUT",
  "VOTE_ABORT",
  "VOTE_CAST",

  "UI_BACK",
  "UI_NAV",
  "UI_BALLOT_OPEN",
  "UI_CONTINUE",
  "UI_EDIT",
  "UI_SUBMIT",
  "UI_SUBMIT_INVALID",
  "UI_NEXT_BALLOT",
  "UI_FINISH_LOGOUT",

  "VERIFIER_SESSION_CREATED",
  "VERIFIER_SESSION_STOPPED",
  "VERIFIER_SESSION_CLAIMED",
  "VERIFIER_LOOKUP",

  "TICKET_CREATED",
  "PUBLIC_TICKET_CREATED",
  "PUBLIC_TICKET_CREATE_ERROR",
]);

const VOTER_AUDIT_LABELS_DE = {
  LOGIN_SUCCESS: "Login erfolgreich",
  LOGIN_FAILED: "Login fehlgeschlagen",
  LOGIN_INACTIVE: "Login abgelehnt (Account deaktiviert)",
  LOGOUT: "Abgemeldet",
  VOTE_ABORT: "Wahl abgebrochen",
  VOTE_CAST: "Stimme abgegeben",

  UI_BACK: "Zurück",
  UI_NAV: "Navigation",
  UI_BALLOT_OPEN: "Stimmzettel geöffnet",
  UI_CONTINUE: "Auswahl bestätigt",
  UI_EDIT: "Auswahl bearbeiten",
  UI_SUBMIT: "Stimme bestätigt",
  UI_SUBMIT_INVALID: "Ungültig abgestimmt",
  UI_NEXT_BALLOT: "Nächster Stimmzettel",
  UI_FINISH_LOGOUT: "Wahl beendet",

  VERIFIER_SESSION_CREATED: "QR-Verifizierung geöffnet",
  VERIFIER_SESSION_STOPPED: "QR-Verifizierung beendet",
  VERIFIER_SESSION_CLAIMED: "Verifier geöffnet (QR gescannt)",
  VERIFIER_LOOKUP: "Stimme im Verifier angezeigt",

  TICKET_CREATED: "Problem gemeldet (Verifier)",
  PUBLIC_TICKET_CREATED: "Problem gemeldet",
  PUBLIC_TICKET_CREATE_ERROR: "Problem melden fehlgeschlagen",
};

export function getAuditLabelDe(eventType) {
  return VOTER_AUDIT_LABELS_DE[eventType] || eventType;
}

export function extractUserFromReq(req) {
  if (req.user && Number.isFinite(Number(req.user.id))) {
    return { id: Number(req.user.id), role: req.user.role };
  }
  const token = req.cookies?.access_token;
  if (!token) return null;

  try {
    const p = jwt.verify(token, JWT_SECRET);
    const id = Number(p.sub);
    if (!Number.isFinite(id)) return null;
    return { id, role: p.role };
  } catch {
    return null;
  }
}

function shouldPersistVoterAudit({ component, eventType, role, userId }) {
  if (component === "admin-api") return false;
  if (role === "admin") return false;

  if (!VOTER_AUDIT_EVENT_TYPES.has(eventType)) return false;


  if (eventType !== "LOGIN_FAILED" && (userId == null || userId === "")) {
    return false;
  }

  return true;
}

//Schreibt einen Eintrag in die Tabelle `logs`.
export async function logEvent(
  req,
  { component, eventType, level = "INFO", details = null, userId }
) {
  try {
    const fromReq = extractUserFromReq(req);
    const effectiveUserId =
      userId !== undefined ? userId : fromReq ? fromReq.id : null;

    const role = fromReq?.role || null;

    if (
      !shouldPersistVoterAudit({
        component,
        eventType,
        role,
        userId: effectiveUserId,
      })
    ) {
      return;
    }

    const userAgent = req.headers["user-agent"] || null;

    let detailsObj = null;
    if (details && typeof details === "object") {
      detailsObj = Array.isArray(details) ? { list: details } : { ...details };
    } else if (details != null) {
      detailsObj = { value: details };
    } else {
      detailsObj = {};
    }

    await pool.query(
      `INSERT INTO logs (userId, component, eventType, level, userAgent, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        effectiveUserId,
        component,
        eventType,
        level,
        userAgent,
        detailsObj ? JSON.stringify(detailsObj) : null,
      ]
    );
  } catch (e) {
    console.error("logEvent error:", e);
  }
}
