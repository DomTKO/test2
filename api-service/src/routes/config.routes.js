// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import express from "express";
import { APP_MODE } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { logEvent } from "../services/audit.js";
import { runtimeConfig, getLogoMeta, SITE_LOGO_PATH } from "../config/initConfig.js";

const router = express.Router();

router.get("/config/default-language", (_req, res) => {
  res.json({ defaultLanguage: runtimeConfig.DEFAULT_LANG });
});

router.get("/config/defaults", async (_req, res) => {
  try {
    const meta = await getLogoMeta();
    res.json({
      defaultLanguage: runtimeConfig.DEFAULT_LANG,
      siteLogoUrl: meta.hasLogo ? SITE_LOGO_PATH : "",
      hasLogo: meta.hasLogo,

      votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

      votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
      verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

      appMode: APP_MODE,
      verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
    });
  } catch (e) {
    console.error("GET /config/defaults error:", e);
    res.json({
      defaultLanguage: runtimeConfig.DEFAULT_LANG,
      siteLogoUrl: "",
      hasLogo: false,

      votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

      votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
      verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

      appMode: APP_MODE,
      verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
    });
  }
});

router.get("/config", async (req, res) => {
  try {
    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_CONFIG_VIEW",
      details: {
        votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

        votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
        verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

        defaultLanguage: runtimeConfig.DEFAULT_LANG,
        appMode: APP_MODE,
        verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
      },
    });
  } catch {}

  res.json({
    defaultLanguage: runtimeConfig.DEFAULT_LANG,
    votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

    votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
    verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

    appMode: APP_MODE,
    verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
  });
});

router.get("/public/config", async (req, res) => {
  try {
    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_CONFIG_VIEW",
      details: {
        votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

        votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
        verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

        defaultLanguage: runtimeConfig.DEFAULT_LANG,
        appMode: APP_MODE,
        verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
      },
    });
  } catch {}

  res.json({
    defaultLanguage: runtimeConfig.DEFAULT_LANG,
    votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

    votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,
    verifierRequireUsernameConfirm: runtimeConfig.VERIFIER_REQUIRE_USERNAME_CONFIRM,

    appMode: APP_MODE,
    verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
  });
});

router.get("/config/public-report", async (req, res) => {
  try {
    await logEvent(req, {
      component: "voting",
      eventType: "PUBLIC_REPORT_CONFIG_VIEW",
      details: { votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT },
    });
  } catch {}

  res.json({ votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT });
});

router.get("/config/voting", requireAuth, async (req, res) => {
  try {
    await logEvent(req, {
      component: req.user.role === "admin" ? "admin-api" : "voting",
      eventType: "VOTING_CONFIG_VIEW",
      userId: req.user.id,
      details: {
        researchHideQr: runtimeConfig.RESEARCH_HIDE_QR,
        qrOnlyLastBallot: runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT,
        votingHideBallotAfterSubmit: runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT,
        votingShowInvalidVoteButton: runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON,

        votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,

        votingDisableSubmitOnInvalid: runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID,
        votingDisableInvalidButtonWhenValid:
          runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID,
        votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

        appMode: APP_MODE,
        verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
      },
    });

    res.json({
      researchHideQr: runtimeConfig.RESEARCH_HIDE_QR,
      qrOnlyLastBallot: runtimeConfig.VOTING_QR_ONLY_LAST_BALLOT,
      votingHideBallotAfterSubmit: runtimeConfig.VOTING_HIDE_BALLOT_AFTER_SUBMIT,
      votingShowInvalidVoteButton: runtimeConfig.VOTING_SHOW_INVALID_VOTE_BUTTON,

      votingInvalidVoteCheckbox: runtimeConfig.VOTING_INVALID_VOTE_CHECKBOX,

      votingDisableSubmitOnInvalid: runtimeConfig.VOTING_DISABLE_SUBMIT_ON_INVALID,
      votingDisableInvalidButtonWhenValid:
        runtimeConfig.VOTING_DISABLE_INVALID_BUTTON_WHEN_VALID,
      votingEnablePublicReport: runtimeConfig.VOTING_ENABLE_PUBLIC_REPORT,

      appMode: APP_MODE,
      verifierBaseUrl: runtimeConfig.VERIFIER_BASE_URL || "",
    });
  } catch (e) {
    console.error("GET /config/voting error:", e);
    res.status(500).json({ code: "INTERNAL" });
  }
});

export default router;
