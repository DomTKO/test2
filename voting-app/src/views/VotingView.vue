<template>
  <section v-if="loading" class="box">{{ t("common.loading") }}</section>
  <section v-else-if="err" class="box error">{{ err }}</section>

  <section v-else-if="currentBallots.length" class="box">
    <template v-if="showBallotUi">
      <VotingHeader
        :combinedTitle="combinedTitle"
        :isPair="isPair"
        :description="currentBallots[0]?.description ?? null"
        :minChoices="currentBallots[0]?.minChoices ?? 0"
        :maxChoices="currentBallots[0]?.maxChoices ?? 0"
        :votingInfoHtml="votingInfoHtml"
      />

      <SimpleBallot
        v-if="!isPair"
        :ballotId="currentBallots[0].id"
        :choices="choicesByBallot[currentBallots[0].id] ?? []"
        :selectedIds="selectedByBallot[currentBallots[0].id] ?? []"
        :disabled="locked || selectionLocked"
        :votingInvalidVoteCheckbox="votingInvalidVoteCheckbox"
        :invalidChecked="invalidChecked"
        @toggle="onToggle"
        @set-invalid="onSetInvalid"
      />

      <PairBallots
        v-else
        :ballots="currentBallots"
        :choicesByBallot="choicesByBallot"
        :selectedByBallot="selectedByBallot"
        :invalidByBallot="invalidByBallot"
        :votingInvalidVoteCheckbox="votingInvalidVoteCheckbox"
        :disabled="locked || selectionLocked"
        @toggle="onToggle"
        @set-invalid="onSetInvalid"
      />

      <section v-if="showInvalidWarningBox" class="invalid-warning-box" role="alert">
        Wenn sie Ihre stimme jetzt abgeben wird sie als ungültig makiert.
      </section>

      <p
        v-if="validationMsg && !(votingInvalidVoteCheckbox && invalidChecked) && !selectionLocked"
        class="hint error"
      >
        {{ validationMsg }}
      </p>

      <VoteActions
        v-if="!locked"
        :selectionLocked="selectionLocked"
        :submitting="submitting"
        :isInvalid="isInvalid"
        :votingShowInvalidVoteButton="votingShowInvalidVoteButton"
        :votingDisableSubmitOnInvalid="votingDisableSubmitOnInvalid"
        :votingDisableInvalidButtonWhenValid="votingDisableInvalidButtonWhenValid"
        :votingInvalidVoteCheckbox="votingInvalidVoteCheckbox"
        :invalidChecked="invalidChecked"
        @back="goBack"
        @edit="editSelection"
        @continue="proceedToConfirm"
        @submit="submit"
      />
    </template>

    <p v-if="apiMsg" :class="apiOk ? 'success' : 'error'">{{ apiMsg }}</p>

    <VerifierQrBox
      v-if="locked && verifierToken && verifierSessionId && !researchHideQr"
      :verifyUrl="verifyUrl"
      :qrScanned="qrScanned"
      :secondsToRefresh="secondsToRefresh"
      :windowValidUntil="windowValidUntil"
      :verifierErr="verifierErr"
      @rescan="handleRescan"
    />

    <VotingPostActions
      v-if="locked"
      :label="hasNextBallot ? t('vote.nextBallot') : t('vote.finishAndLogout')"
      @action="handleNextOrLogout"
    />
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { api } from "../lib/api";

import VotingHeader from "../components/voting/VotingHeader.vue";
import SimpleBallot from "../components/voting/SimpleBallot.vue";
import PairBallots from "../components/voting/PairBallots.vue";
import VoteActions from "../components/voting/VoteActions.vue";
import VerifierQrBox from "../components/voting/VerifierQrBox.vue";
import VotingPostActions from "../components/voting/PostVoteActions.vue";

import { useVotingData } from "../composables/useVotingData.ts";
import { useVotingConfig } from "../composables/useVotingConfig.ts";
import { useUiLog } from "../composables/useUiLog.ts";
import { useVerifierSession } from "../composables/useVerifierSession.ts";

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const ballotId = computed(() => Number(route.params.id));

const selectionLocked = ref(false);
const submitting = ref(false);

const apiMsgKey = ref<string | null>(null);
const apiMsg = computed(() => (apiMsgKey.value ? (t(apiMsgKey.value) as string) : ""));

const apiOk = ref(false);
const locked = computed(() => apiOk.value);

const {
  loading,
  err,
  currentBallots,
  allBallots,
  votedIds,
  choicesByBallot,
  selectedByBallot,
  votingInfoHtml,
  isPair,
  combinedTitle,
  hasNextBallot,
  validationMsg,
  isInvalid,
  loadVotingData,
  resetVotingData,
  applyToggle,
} = useVotingData({ ballotId, locale, t });

const {
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
} = useVotingConfig();

const showBallotUi = computed(() => {
  return !(locked.value && votingHideBallotAfterSubmit.value);
});

const { emitUiLog } = useUiLog({
  api,
  route,
  ballotId,
  currentBallots,
  selectedByBallot,
  isPair,
  selectionLocked,
  locked,
});

const {
  verifierSessionId,
  verifierToken,
  tokenValidUntil,
  windowValidUntil,
  verifierErr,
  qrScanned,
  secondsToRefresh,
  verifyUrl,
  startSession,
  stopSession,
  rescanSession,
  clearAllTimers,
} = useVerifierSession({
  api,
  t,
  verifierBaseUrl,
  viteFallbackBaseUrl: VITE_VERIFIER_BASE_URL,
  onUiLog: (action, extra) => emitUiLog(action, extra),
});

const invalidByBallot = ref<Record<string, boolean>>({});

const invalidChecked = computed(() => {
  if (!votingInvalidVoteCheckbox.value) return false;
  for (const b of currentBallots.value) {
    if (invalidByBallot.value[String(b.id)]) return true;
  }
  return false;
});

const showInvalidWarningBox = computed(() => {
  if (!selectionLocked.value) return false;
  if (!isInvalid.value) return false;
  if (votingInvalidVoteCheckbox.value && invalidChecked.value) return false;
  return true;
});

function onSetInvalid(payload: { ballotId: number; checked: boolean }) {
  invalidByBallot.value[String(payload.ballotId)] = !!payload.checked;
  if (payload.checked) {
    selectedByBallot.value[payload.ballotId] = [];
  }
}

function onToggle(payload: { ballotId: number; choiceId: number; checked: boolean }) {
  if (locked.value || selectionLocked.value) return;
  if (votingInvalidVoteCheckbox.value && invalidByBallot.value[String(payload.ballotId)]) return;
  applyToggle(payload.ballotId, payload.choiceId, payload.checked);
}

function goBack() {
  emitUiLog("back");
  router.push({ name: "home" });
}

function proceedToConfirm() {
  apiMsgKey.value = null;
  selectionLocked.value = true;
  emitUiLog("continue");
}

function editSelection() {
  selectionLocked.value = false;
  emitUiLog("edit");
}

async function updateVotedIdsAfterSubmit() {
  const next = new Set<number>(votedIds.value);
  for (const b of currentBallots.value) next.add(b.id);
  votedIds.value = next;
  const hasRemainingAfter = allBallots.value.some((b) => !next.has(b.id));
  return { hasRemainingAfter };
}

async function submit(forceInvalid: boolean) {
  if (!currentBallots.value.length) return;

  let effectiveForceInvalid = forceInvalid;
  if (votingInvalidVoteCheckbox.value && invalidChecked.value) effectiveForceInvalid = true;

  const action = effectiveForceInvalid || isInvalid.value ? "submit_invalid" : "submit";
  emitUiLog(action, { forceInvalid: effectiveForceInvalid });

  submitting.value = true;
  apiMsgKey.value = null;
  apiOk.value = false;

  verifierErr.value = "";
  qrScanned.value = false;

  try {
    for (const b of currentBallots.value) {
      const isBallotInvalid =
        votingInvalidVoteCheckbox.value && !!invalidByBallot.value[String(b.id)];
      const choiceIds =
        effectiveForceInvalid || isBallotInvalid ? [] : selectedByBallot.value[b.id] ?? [];

      const r = await api(`/ballots/${b.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceIds }),
      });

      const isJson = (r.headers.get("content-type") || "").includes("json");
      const payload = isJson ? await r.json() : null;

      if (!r.ok) {
        if (r.status === 409 && payload?.code === "ALREADY_VOTED") {
          apiMsgKey.value = "vote.alreadyVoted";
        } else {
          apiMsgKey.value = "common.error";
        }
        apiOk.value = false;
        return;
      }
    }

    await refreshVotingConfig();
    apiOk.value = true;
    apiMsgKey.value = "vote.success";

    const { hasRemainingAfter } = await updateVotedIdsAfterSubmit();

    if (!researchHideQr.value) {
      if (!(qrOnlyLastBallot.value && hasRemainingAfter)) {
        const primary = currentBallots.value[0];
        await startSession(primary.id);
      }
    }
  } catch {
    apiOk.value = false;
    apiMsgKey.value = "common.error";
  } finally {
    submitting.value = false;
  }
}

async function handleRescan() {
  const primary = currentBallots.value[0];
  if (!primary) return;
  await rescanSession(primary.id);
}

async function forceLogout() {
  clearAllTimers();
  await stopSession("force_logout");

  try {
    await api("/auth/logout", { method: "POST" });
  } catch {}

  router.push({ name: "login" });
}

async function handleNextOrLogout() {
  if (hasNextBallot.value) {
    emitUiLog("next_ballot");

    const next = allBallots.value.find((b) => !votedIds.value.has(b.id));
    if (next) {
      clearAllTimers();
      await stopSession("next_ballot");
      router.push({ name: "ballot", params: { id: next.id } });
    }
  } else {
    emitUiLog("finish_logout");
    await forceLogout();
  }
}

async function fullLoad() {
  err.value = "";
  loading.value = true;

  invalidByBallot.value = {};

  await refreshVotingConfig();
  await loadVotingData();

  emitUiLog("ballot_open", { ballotIds: currentBallots.value.map((b) => b.id) });
}

onMounted(async () => {
  await fullLoad();
});

watch(
  () => locale.value,
  async () => {
    await fullLoad();
  }
);

watch(locked, (val) => {
  window.dispatchEvent(new CustomEvent("app:voter-locked-changed", { detail: val }));
});

watch(
  () => route.params.id,
  async () => {
    clearAllTimers();
    await stopSession("route_change");

    resetVotingData();
    selectionLocked.value = false;

    apiOk.value = false;
    apiMsgKey.value = null;

    invalidByBallot.value = {};

    await fullLoad();
  }
);

onBeforeUnmount(async () => {
  clearAllTimers();
  await stopSession("unmount");
});
</script>

<style scoped>
.box {
  max-width: 760px;
  margin: 1.25rem auto;
  padding: 1rem;
}

.hint {
  color: #6b7280;
}
.error {
  color: #b91c1c;
}
.success {
  color: #166534;
}

.invalid-warning-box {
  margin-top: 0.8rem;
  margin-bottom: 0.6rem;
  padding: 0.85rem 0.95rem;
  border-radius: 0.85rem;
  border: 2px solid #d35959;
  background: #d19696;
  color: #860000;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(146, 64, 14, 0.12);
}
</style>
