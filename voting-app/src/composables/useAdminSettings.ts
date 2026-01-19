// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, onBeforeUnmount, type InjectionKey } from "vue";
import { api, getJson } from "../lib/api";

type vAlertType = "success" | "error";

type BlockKey = "home" | "login" | "verify" | "votingInfo" | "systemTitle";

type BlockState = {
  de: string;
  en: string;
};

type BlocksResponse = {
  home?: { de?: string; en?: string };
  login?: { de?: string; en?: string };
  verify?: { de?: string; en?: string };
  votingInfo?: { de?: string; en?: string };
  systemTitle?: { de?: string; en?: string };
};

type AdminConfigResponse = {
  hasLogo?: unknown;
  siteLogoUrl?: string;

  appTitleDe?: unknown;
  appTitleEn?: unknown;

  researchVerifierOffset?: unknown;
  researchHideQr?: unknown;

  verifierShowAllBallots?: unknown;
  verifierReportUseSimpleView?: unknown;
  votingHideBallotAfterSubmit?: unknown;
  votingQrOnlyLastBallot?: unknown;

  votingShowInvalidVoteButton?: unknown;
  votingDisableSubmitOnInvalid?: unknown;
  votingDisableInvalidButtonWhenValid?: unknown;

  votingEnablePublicReport?: unknown;

  votingInvalidVoteCheckbox?: unknown;
  verifierRequireUsernameConfirm?: unknown;
};

function toBool(v: unknown): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1) return true;
  if (v === 0) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(s)) return true;
    if (["0", "false", "no", "off"].includes(s)) return false;
  }
  return false;
}

function toStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

async function readResponseError(r: Response): Promise<string> {
  try {
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json();
      return j?.detail || j?.message || j?.code || JSON.stringify(j);
    }
    const txt = await r.text();
    return txt || `${r.status} ${r.statusText}`;
  } catch {
    return `${r.status} ${r.statusText}`;
  }
}

async function apiCompat(path: string, init?: RequestInit): Promise<Response> {
  const first = await api(path, init as any);
  if (first.status !== 404) return first;

  if (!path.startsWith("/api/")) {
    const second = await api(`/api${path}`, init as any);
    if (second.status !== 404) return second;
    return second;
  }
  return first;
}

async function getJsonCompat<T>(path: string): Promise<T> {
  try {
    return await getJson<T>(path);
  } catch {
    const r = await apiCompat(path);
    if (!r.ok) throw new Error(await readResponseError(r));
    return (await r.json()) as T;
  }
}

export function useAdminSettings() {
  //Public texts
  const blocks = ref<Record<BlockKey, BlockState>>({
    home: { de: "", en: "" },
    login: { de: "", en: "" },
    verify: { de: "", en: "" },
    votingInfo: { de: "", en: "" },
    systemTitle: { de: "", en: "" },
  });

  // Logo
  const hasLogo = ref(false);
  const logoPreviewUrl = ref("");
  const selectedFile = ref<File | null>(null);
  const deleteLogo = ref(false);
  const logoLoadError = ref(false);
  const logoInputResetKey = ref(0);

  // App title (UI)
  const appTitleDe = ref("");
  const appTitleEn = ref("");

  // Research flags
  const researchVerifierOffset = ref(false);
  const researchHideQr = ref(false);

  // Appearance flags
  const votingHideBallotAfterSubmit = ref(false);
  const votingQrOnlyLastBallot = ref(false);
  const verifierShowAllBallots = ref(false);
  const verifierReportUseSimpleView = ref(false);

  // Invalid vote flags
  const votingShowInvalidVoteButton = ref(false);
  const votingDisableSubmitOnInvalid = ref(true);
  const votingDisableInvalidButtonWhenValid = ref(false);

  // Misc flags
  const votingEnablePublicReport = ref(false);

  const votingInvalidVoteCheckbox = ref(false);
  const verifierRequireUsernameConfirm = ref(false);

  const invalidVoteDepsDisabled = computed(
    () => !votingShowInvalidVoteButton.value
  );

  // Loading / saving
  const loading = ref(false);
  const savingTexts = ref(false);
  const savingBranding = ref(false);
  const savingResearch = ref(false);
  const savingMisc = ref(false);

  // v-alert
  const vAlert = ref<{ type: vAlertType; message: string } | null>(null);
  let vAlertTimer: number | null = null;

  function showvAlert(type: vAlertType, message: string) {
    vAlert.value = { type, message };
    if (vAlertTimer !== null) window.clearTimeout(vAlertTimer);
    vAlertTimer = window.setTimeout(() => {
      vAlert.value = null;
      vAlertTimer = null;
    }, 4000);
  }

  // Copy report link
  const publicReportUrl = computed(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    const hash = String(window.location.hash || "");
    const useHashRouter = hash.startsWith("#/") || hash.includes("#/");
    return useHashRouter ? `${origin}/#/report` : `${origin}/report`;
  });

  const copied = ref(false);
  let copiedTimer: number | null = null;

  async function copyPublicReportLink(successMsg: string, failBaseMsg: string) {
    if (!votingEnablePublicReport.value) return;

    const text = publicReportUrl.value;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        ta.style.top = "-9999px";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      copied.value = true;
      if (copiedTimer !== null) window.clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(() => {
        copied.value = false;
        copiedTimer = null;
      }, 1400);

      showvAlert("success", successMsg);
    } catch (e: any) {
      showvAlert(
        "error",
        failBaseMsg + (e?.message ? ` (${String(e.message)})` : "")
      );
    }
  }

  function revokeBlobIfNeeded() {
    if (logoPreviewUrl.value && logoPreviewUrl.value.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(logoPreviewUrl.value);
      } catch {
        // ignore
      }
    }
  }

  function onLogoError() {
    logoLoadError.value = true;
  }
  function onLogoLoad() {
    logoLoadError.value = false;
  }

  function setSelectedLogoFile(file: File | null) {
    selectedFile.value = file;
    deleteLogo.value = false;
    logoLoadError.value = false;

    revokeBlobIfNeeded();

    if (file) {
      logoPreviewUrl.value = URL.createObjectURL(file);
    } else if (hasLogo.value) {
      logoPreviewUrl.value = "/api/logo?ts=" + Date.now();
    } else {
      logoPreviewUrl.value = "";
    }
  }

  function buildConfigPayload() {
    return {
      appTitleDe: appTitleDe.value,
      appTitleEn: appTitleEn.value,

      researchVerifierOffset: researchVerifierOffset.value,
      researchHideQr: researchHideQr.value,

      verifierShowAllBallots: verifierShowAllBallots.value,
      verifierReportUseSimpleView: verifierReportUseSimpleView.value,
      votingHideBallotAfterSubmit: votingHideBallotAfterSubmit.value,
      votingQrOnlyLastBallot: votingQrOnlyLastBallot.value,

      votingShowInvalidVoteButton: votingShowInvalidVoteButton.value,
      votingDisableSubmitOnInvalid: votingDisableSubmitOnInvalid.value,
      votingDisableInvalidButtonWhenValid:
        votingDisableInvalidButtonWhenValid.value,

      votingEnablePublicReport: votingEnablePublicReport.value,

      votingInvalidVoteCheckbox: votingInvalidVoteCheckbox.value,
      verifierRequireUsernameConfirm: verifierRequireUsernameConfirm.value,
    };
  }

  async function saveSystemTitle() {
    const de = (appTitleDe.value || "").trim();
    const en = (appTitleEn.value || "").trim() || de;

    blocks.value.systemTitle.de = de;
    blocks.value.systemTitle.en = en;

    const payload: Partial<BlocksResponse> = {
      systemTitle: { de, en },
    };

    const r = await apiCompat("/admin/public-texts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!r.ok) throw new Error(await readResponseError(r));
  }

  async function load(opts: { loadErrorText: string }) {
    loading.value = true;

    logoLoadError.value = false;
    deleteLogo.value = false;
    selectedFile.value = null;

    // Texte + systemTitle
    try {
      const textData = await getJsonCompat<BlocksResponse>("/admin/public-texts");
      const keys: BlockKey[] = [
        "home",
        "login",
        "verify",
        "votingInfo",
        "systemTitle",
      ];

      for (const key of keys) {
        blocks.value[key].de = (textData[key]?.de ?? "").toString().trim();
        blocks.value[key].en = (textData[key]?.en ?? "").toString().trim();
      }

      appTitleDe.value = blocks.value.systemTitle.de.trim();
      appTitleEn.value = blocks.value.systemTitle.en.trim();
      if (!appTitleEn.value && appTitleDe.value)
        appTitleEn.value = appTitleDe.value;
    } catch (e: any) {
      showvAlert(
        "error",
        opts.loadErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    }

    // Config + Logo
    try {
      const cfg = await getJsonCompat<AdminConfigResponse>("/admin/config");

      hasLogo.value = toBool(cfg?.hasLogo);

      if (cfg?.siteLogoUrl) {
        logoPreviewUrl.value = String(cfg.siteLogoUrl) + "?ts=" + Date.now();
      } else {
        logoPreviewUrl.value = hasLogo.value ? "/api/logo?ts=" + Date.now() : "";
      }

      const cfgTitleDe = toStr(cfg?.appTitleDe).trim();
      const cfgTitleEn = toStr(cfg?.appTitleEn).trim();
      if (cfgTitleDe) appTitleDe.value = cfgTitleDe;
      if (cfgTitleEn || cfgTitleDe) appTitleEn.value = cfgTitleEn || cfgTitleDe;

      researchVerifierOffset.value = toBool(cfg?.researchVerifierOffset);
      researchHideQr.value = toBool(cfg?.researchHideQr);

      verifierShowAllBallots.value = toBool(cfg?.verifierShowAllBallots);
      verifierReportUseSimpleView.value = toBool(cfg?.verifierReportUseSimpleView);
      votingHideBallotAfterSubmit.value = toBool(cfg?.votingHideBallotAfterSubmit);
      votingQrOnlyLastBallot.value = toBool(cfg?.votingQrOnlyLastBallot);

      votingShowInvalidVoteButton.value = toBool(cfg?.votingShowInvalidVoteButton);
      votingDisableSubmitOnInvalid.value = toBool(cfg?.votingDisableSubmitOnInvalid);
      votingDisableInvalidButtonWhenValid.value = toBool(
        cfg?.votingDisableInvalidButtonWhenValid
      );

      votingEnablePublicReport.value = toBool(cfg?.votingEnablePublicReport);
      votingInvalidVoteCheckbox.value = toBool(cfg?.votingInvalidVoteCheckbox);
      verifierRequireUsernameConfirm.value = toBool(cfg?.verifierRequireUsernameConfirm);
    } catch (e: any) {
      hasLogo.value = false;
      logoPreviewUrl.value = "";

      researchVerifierOffset.value = false;
      researchHideQr.value = false;

      verifierShowAllBallots.value = false;
      verifierReportUseSimpleView.value = false;
      votingHideBallotAfterSubmit.value = false;
      votingQrOnlyLastBallot.value = false;

      votingShowInvalidVoteButton.value = false;
      votingDisableSubmitOnInvalid.value = true;
      votingDisableInvalidButtonWhenValid.value = false;

      votingEnablePublicReport.value = false;

      votingInvalidVoteCheckbox.value = false;
      verifierRequireUsernameConfirm.value = false;

      showvAlert(
        "error",
        opts.loadErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    } finally {
      loading.value = false;
    }
  }

  async function saveTexts(opts: {
    saveErrorText: string;
    saveOkText: string;
    loadErrorText: string;
  }) {
    savingTexts.value = true;

    try {
      const payload: BlocksResponse = {
        home: { de: blocks.value.home.de, en: blocks.value.home.en },
        login: { de: blocks.value.login.de, en: blocks.value.login.en },
        verify: { de: blocks.value.verify.de, en: blocks.value.verify.en },
        votingInfo: {
          de: blocks.value.votingInfo.de,
          en: blocks.value.votingInfo.en,
        },
        systemTitle: {
          de: (appTitleDe.value || "").trim(),
          en:
            (appTitleEn.value || "").trim() ||
            (appTitleDe.value || "").trim(),
        },
      };

      const r = await apiCompat("/admin/public-texts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        showvAlert("error", opts.saveErrorText + ` (${await readResponseError(r)})`);
        return;
      }

      showvAlert("success", opts.saveOkText);
      await load({ loadErrorText: opts.loadErrorText });
    } catch (e: any) {
      showvAlert(
        "error",
        opts.saveErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    } finally {
      savingTexts.value = false;
    }
  }

  async function saveBrandingAndAppearance(opts: {
    saveErrorText: string;
    saveOkText: string;
    loadErrorText: string;
  }) {
    savingBranding.value = true;

    try {
      // Logo
      if (deleteLogo.value) {
        const rDel = await apiCompat("/admin/logo", { method: "DELETE" });
        if (!rDel.ok) {
          showvAlert("error", opts.saveErrorText + ` (${await readResponseError(rDel)})`);
          return;
        }
        hasLogo.value = false;
        revokeBlobIfNeeded();
        logoPreviewUrl.value = "";
        selectedFile.value = null;
        deleteLogo.value = false;
        logoInputResetKey.value++;
      } else if (selectedFile.value) {
        const form = new FormData();
        form.append("file", selectedFile.value);

        const rUp = await apiCompat("/admin/logo", { method: "PUT", body: form });
        if (!rUp.ok) {
          showvAlert("error", opts.saveErrorText + ` (${await readResponseError(rUp)})`);
          return;
        }
        hasLogo.value = true;
        revokeBlobIfNeeded();
        logoPreviewUrl.value = "/api/logo?ts=" + Date.now();
        selectedFile.value = null;
        logoInputResetKey.value++;
      }

      // App Titel (systemTitle)
      await saveSystemTitle();

      // Config
      const rCfg = await apiCompat("/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfigPayload()),
      });

      if (!rCfg.ok) {
        showvAlert("error", opts.saveErrorText + ` (${await readResponseError(rCfg)})`);
        return;
      }

      showvAlert("success", opts.saveOkText);
      await load({ loadErrorText: opts.loadErrorText });
    } catch (e: any) {
      showvAlert(
        "error",
        opts.saveErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    } finally {
      savingBranding.value = false;
    }
  }

  async function saveResearch(opts: {
    saveErrorText: string;
    saveOkText: string;
    loadErrorText: string;
  }) {
    savingResearch.value = true;

    try {
      const rCfg = await apiCompat("/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfigPayload()),
      });

      if (!rCfg.ok) {
        showvAlert("error", opts.saveErrorText + ` (${await readResponseError(rCfg)})`);
        return;
      }

      showvAlert("success", opts.saveOkText);
      await load({ loadErrorText: opts.loadErrorText });
    } catch (e: any) {
      showvAlert(
        "error",
        opts.saveErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    } finally {
      savingResearch.value = false;
    }
  }

  async function saveMisc(opts: {
    saveErrorText: string;
    saveOkText: string;
    loadErrorText: string;
  }) {
    savingMisc.value = true;

    try {
      const rCfg = await apiCompat("/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConfigPayload()),
      });

      if (!rCfg.ok) {
        showvAlert("error", opts.saveErrorText + ` (${await readResponseError(rCfg)})`);
        return;
      }

      showvAlert("success", opts.saveOkText);
      await load({ loadErrorText: opts.loadErrorText });
    } catch (e: any) {
      showvAlert(
        "error",
        opts.saveErrorText + (e?.message ? ` (${String(e.message)})` : "")
      );
    } finally {
      savingMisc.value = false;
    }
  }

  onBeforeUnmount(() => {
    revokeBlobIfNeeded();
    if (vAlertTimer !== null) window.clearTimeout(vAlertTimer);
    if (copiedTimer !== null) window.clearTimeout(copiedTimer);
  });

  return {
    blocks,

    hasLogo,
    logoPreviewUrl,
    selectedFile,
    deleteLogo,
    logoLoadError,
    logoInputResetKey,

    appTitleDe,
    appTitleEn,

    researchVerifierOffset,
    researchHideQr,

    votingHideBallotAfterSubmit,
    votingQrOnlyLastBallot,
    verifierShowAllBallots,
    verifierReportUseSimpleView,

    votingShowInvalidVoteButton,
    votingDisableSubmitOnInvalid,
    votingDisableInvalidButtonWhenValid,

    votingEnablePublicReport,

    votingInvalidVoteCheckbox,
    verifierRequireUsernameConfirm,

    invalidVoteDepsDisabled,

    loading,
    savingTexts,
    savingBranding,
    savingResearch,
    savingMisc,

    vAlert,
    showvAlert,

    publicReportUrl,
    copied,

    load,
    saveTexts,
    saveBrandingAndAppearance,
    saveResearch,
    saveMisc,

    copyPublicReportLink,

    onLogoError,
    onLogoLoad,
    setSelectedLogoFile,
  };
}

export type AdminSettingsContext = ReturnType<typeof useAdminSettings>;

export const AdminSettingsKey: InjectionKey<AdminSettingsContext> =
  Symbol("AdminSettingsKey");
