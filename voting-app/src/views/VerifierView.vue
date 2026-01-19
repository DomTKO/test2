<template>
  <section class="box">
    <section v-if="hasIntro && !sessionEnded" class="cms-block" v-html="introHtml"></section>

    <h2 v-if="!sessionEnded">{{ combinedTitle || t("verify.title") }}</h2>

    <p v-if="loading">{{ t("common.loading") }}</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <template v-else-if="!token">
      <p class="error">{{ t("verify.noToken") }}</p>
    </template>

    <template v-else>
      <p v-if="sessionEnded" class="hint">
        {{ t("verify.sessionEndedHint") }}
      </p>

      <template v-else>
        <section
          v-if="verifierRequireUsernameConfirm && !sessionToken"
          class="username-box"
        >
          <p class="hint">{{ t("verify.usernameConfirmHint") }}</p>

          <form class="username-form" @submit.prevent="confirmUsername">
            <label class="username-label" for="verify-username">
              {{ t("verify.usernameLabel") }}
            </label>

            <input
              id="verify-username"
              class="username-input"
              type="text"
              v-model="username"
              :placeholder="t('verify.usernamePlaceholder')"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
            />

            <p v-if="usernameError" class="error">{{ usernameError }}</p>

            <button class="btn-success" type="submit">
              {{ t("verify.usernameConfirmAction") }}
            </button>
          </form>
        </section>

        <template v-else>
          <VerifyBallotList
            :ballots="currentBallots"
            :optionsByBallot="optionsToShowByBallot"
            :selectedByBallot="displaySelectedIdsByBallot"
            :isBallotValid="isBallotValid"
            @optionClick="onOptionClick"
          />

          <VerifyActionsRow @report="onReport" @confirm="confirmSession" />
        </template>
      </template>

      <ReportModal
        v-model="showReportModal"
        v-model:contact="contact"
        v-model:message="message"
        :submitting="submitting"
        :error="reportError"
        :success="reportSuccess"
        @submit="submitReport"
      />

      <EditWarningModal v-model="showEditWarning" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import { useVerifyIntro } from "../composables/useVerifyIntro";
import { useVerifierFlow } from "../composables/useVerifierFlow";
import { useVerifierReport } from "../composables/useVerifierReport";

import VerifyBallotList from "../components/verify/VerifyBallotList.vue";
import VerifyActionsRow from "../components/verify/VerifyActionsRow.vue";
import ReportModal from "../components/verify/ReportModal.vue";
import EditWarningModal from "../components/verify/EditWarningModal.vue";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();

const token = computed(() => String(route.query.token ?? "").trim());

const { introHtml, hasIntro, loadIntro } = useVerifyIntro(locale);

const {
  loading,
  error,
  usernameError,

  sessionToken,
  sessionEnded,

  currentBallots,
  displaySelectedIdsByBallot,
  optionsToShowByBallot,

  verifierReportUseSimpleView,
  verifierRequireUsernameConfirm,

  combinedTitle,
  isBallotValid,
  toggleLocalSelection,

  claimAndLoad,
  loadWithExistingSession,
  confirmSession,
  openReportRouteOrModalFallback,
} = useVerifierFlow({
  routeQueryToken: token,
  router,
  t,
  locale,
});

const {
  showReportModal,
  contact,
  message,
  submitting,
  reportError,
  reportSuccess,
  openReportModal,
  submitReport,
} = useVerifierReport({ sessionToken, t });

const showEditWarning = ref(false);
const hasWarnedAboutEdit = ref(false);

const username = ref("");

function onOptionClick(payload: { ballotId: number; optionId: number }) {
  if (!hasWarnedAboutEdit.value) {
    hasWarnedAboutEdit.value = true;
    showEditWarning.value = true;
  }
  toggleLocalSelection(payload.ballotId, payload.optionId);
}

async function onReport() {
  if (verifierReportUseSimpleView.value) {
    await openReportRouteOrModalFallback();
    return;
  }
  openReportModal();
}

async function confirmUsername() {
  await claimAndLoad(username.value);
}

onMounted(async () => {
  await loadIntro();
  await claimAndLoad();
});

watch(token, async (newToken) => {
  if (!newToken) return;
  username.value = "";
  await claimAndLoad();
});

watch(
  () => locale.value,
  async () => {
    await loadIntro();
    if (sessionToken.value) {
      await loadWithExistingSession();
    }
  }
);
</script>

<style scoped>
.box {
  max-width: 760px;
  margin: 1.25rem auto;
  padding: 1rem;
}

.cms-block {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  font-size: 0.95rem;
}

.username-box {
  margin-top: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #ffffff;
}

.username-form {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.5rem;
}

.username-label {
  font-weight: 700;
}

.username-input {
  padding: 0.55rem 0.7rem;
  border-radius: 0.55rem;
  border: 1px solid #d1d5db;
}

.btn-success {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 0;
  cursor: pointer;
  background: #00897b;
}
.btn-success:hover {
  background: #00695c;
}

.error {
  color: #b91c1c;
}
.hint {
  color: #6b7280;
}
</style>
