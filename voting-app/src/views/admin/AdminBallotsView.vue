<template>
  <section class="admin-ballots">
    <h2>{{ t("admin.ballots.title") }}</h2>
    <p class="intro">{{ t("admin.ballots.intro") }}</p>

    <p v-if="errorText" class="error">{{ errorText }}</p>
    <p v-if="loading" class="hint">{{ t("common.loading") }}</p>

    <div class="cards">
      <BallotCreateCard
        :saving="savingBallot"
        :resetKey="createResetKey"
        :onCreateSimple="handleCreateSimple"
        :onCreatePair="handleCreatePair"
      />

      <BallotCard
        v-for="b in ballots"
        :key="b.id"
        :ballot="b"
        :choicesLoading="choicesLoadingIds.has(b.id)"
        :addingChoice="addingChoiceIds.has(b.id)"
        :deletingBallot="deletingBallotIds.has(b.id)"
        :deletingChoiceIds="deletingChoiceIds"
        :onAddChoice="addChoice"
        :onDeleteChoice="deleteChoice"
        :onDeleteBallot="deleteBallot"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import BallotCreateCard from "../../components/admin/ballots/BallotCreateCard.vue";
import BallotCard from "../../components/admin/ballots/BallotCard.vue";

import { useAdminBallots } from "../../composables/useAdminBallots";
import type { Draft, ElectionText } from "../../composables/useAdminBallots";

const { t } = useI18n();

const {
  ballots,
  loading,
  errorKey,

  savingBallot,
  choicesLoadingIds,
  addingChoiceIds,
  deletingChoiceIds,
  deletingBallotIds,

  loadBallots,
  createSimpleBallot,
  createPairBallots,
  addChoice,
  deleteChoice,
  deleteBallot,
} = useAdminBallots();

const errorText = computed(() => (errorKey.value ? (t(errorKey.value) as string) : ""));

const createResetKey = ref(0);

async function handleCreateSimple(draft: Draft): Promise<boolean> {
  const ok = await createSimpleBallot(draft);
  if (ok) createResetKey.value++;
  return ok;
}

async function handleCreatePair(
  election: ElectionText,
  first: Draft,
  second: Draft
): Promise<boolean> {
  const ok = await createPairBallots(election, first, second);
  if (ok) createResetKey.value++;
  return ok;
}

onMounted(() => {
  loadBallots();
});
</script>

<style scoped>
.admin-ballots {
  flex: 1;
}

.intro {
  margin-bottom: 1rem;
  color: #4b5563;
}

.error {
  color: #b91c1c;
  margin-bottom: 0.75rem;
}

.hint {
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

@media (min-width: 900px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
