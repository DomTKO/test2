// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref } from "vue";
import { api } from "../lib/api";
import { toBool } from "../lib/parse.ts";

export function useVotingConfig() {
  const VITE_VERIFIER_BASE_URL = String(
    (import.meta as any).env?.VITE_VERIFIER_BASE_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");

  const verifierBaseUrl = ref(VITE_VERIFIER_BASE_URL);

  const researchHideQr = ref(false);
  const qrOnlyLastBallot = ref(false);
  const votingHideBallotAfterSubmit = ref(false);

  const votingShowInvalidVoteButton = ref(false);
  const votingDisableSubmitOnInvalid = ref(false);
  const votingDisableInvalidButtonWhenValid = ref(false);

  const votingInvalidVoteCheckbox = ref(false);

  async function refreshVotingConfig() {
    try {
      const r = await api(`/config/voting?ts=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!r.ok) throw new Error("config fetch failed");

      const cfg: any = await r.json();

      researchHideQr.value = toBool(cfg.researchHideQr);
      qrOnlyLastBallot.value = toBool(cfg.qrOnlyLastBallot);
      votingHideBallotAfterSubmit.value = toBool(cfg.votingHideBallotAfterSubmit);

      const fromCfg =
        typeof cfg.verifierBaseUrl === "string" ? cfg.verifierBaseUrl.trim() : "";
      verifierBaseUrl.value = String(fromCfg || VITE_VERIFIER_BASE_URL)
        .trim()
        .replace(/\/+$/, "");

      votingShowInvalidVoteButton.value = toBool(cfg.votingShowInvalidVoteButton);
      votingDisableSubmitOnInvalid.value = toBool(cfg.votingDisableSubmitOnInvalid);
      votingDisableInvalidButtonWhenValid.value = toBool(cfg.votingDisableInvalidButtonWhenValid);

      votingInvalidVoteCheckbox.value = toBool(cfg.votingInvalidVoteCheckbox);
    } catch {
      researchHideQr.value = false;
      qrOnlyLastBallot.value = false;
      votingHideBallotAfterSubmit.value = false;

      verifierBaseUrl.value = VITE_VERIFIER_BASE_URL;

      votingShowInvalidVoteButton.value = false;
      votingDisableSubmitOnInvalid.value = false;
      votingDisableInvalidButtonWhenValid.value = false;

      votingInvalidVoteCheckbox.value = false;
    }
  }

  return {
    VITE_VERIFIER_BASE_URL,
    verifierBaseUrl,

    researchHideQr,
    qrOnlyLastBallot,
    votingHideBallotAfterSubmit,

    votingShowInvalidVoteButton,
    votingDisableSubmitOnInvalid,
    votingDisableInvalidButtonWhenValid,

    votingInvalidVoteCheckbox,

    refreshVotingConfig,
  };
}
