<template>
  <article class="card">
    <header class="card-header">
      <div>
        <div class="title-lines">
          <div class="title-de">{{ ballot.titleDe }}</div>
          <div class="title-en">{{ ballot.titleEn }}</div>
        </div>

        <p v-if="ballot.descriptionDe || ballot.descriptionEn" class="desc">
          {{ ballot.descriptionDe || ballot.descriptionEn }}
        </p>

        <p v-if="ballotTypeLabel(ballot)" class="meta">
          {{ ballotTypeLabel(ballot) }}
        </p>

        <p v-if="ballot.electionId != null && ballotElectionLabel(ballot)" class="election-line">
          <span class="election-badge">{{ ballotElectionLabel(ballot) }}</span>
        </p>

        <p class="rules">
          {{
            t("admin.ballots.rulesSummary", {
              min: ballot.minChoices,
              max: ballot.maxChoices,
            })
          }}
        </p>
      </div>

      <button
        type="button"
        class="icon-btn"
        @click="onDeleteBallot(ballot.id)"
        :disabled="deletingBallot"
        :title="t('admin.ballots.delete') as string"
      >
        {{ t("admin.ballots.delete") }}
      </button>
    </header>

    <div class="card-body">
      <div class="choices-header">
        <h4 class="choices-title">{{ t("admin.ballots.choicesTitle") }}</h4>
        <span v-if="choicesLoading" class="hint">{{ t("common.loading") }}</span>
      </div>

      <p v-if="!choicesLoading && ballot.choices.length === 0" class="hint">
        {{ t("admin.ballots.noChoices") }}
      </p>

      <ul v-else class="choices-list">
        <li v-for="c in ballot.choices" :key="c.id" class="choice-row">
          <div class="choice-labels">
            <div class="choice-line">
              <span class="chip">DE</span>
              <span>{{ c.labelDe }}</span>
            </div>
            <div class="choice-line">
              <span class="chip">EN</span>
              <span>{{ c.labelEn }}</span>
            </div>
          </div>

          <button
            type="button"
            class="icon-btn"
            @click="onDeleteChoice(ballot.id, c.id)"
            :disabled="deletingChoiceIds.has(c.id)"
            :title="t('admin.ballots.deleteChoice') as string"
          >
            ✕
          </button>
        </li>
      </ul>

      <form class="choice-form" @submit.prevent="submitChoice">
        <div class="choice-inputs">
          <label class="field-inline grow">
            <span class="label small-label">{{ t("admin.ballots.choiceDe") }}</span>
            <input v-model="draftDe" type="text" class="input" />
          </label>

          <label class="field-inline grow">
            <span class="label small-label">{{ t("admin.ballots.choiceEn") }}</span>
            <input v-model="draftEn" type="text" class="input" />
          </label>
        </div>

        <button type="submit" class="btn small primary" :disabled="addingChoice">
          {{ t("admin.ballots.addChoice") }}
        </button>
      </form>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { Ballot } from "../../../composables/useAdminBallots";

const { t } = useI18n();

const props = defineProps<{
  ballot: Ballot;

  choicesLoading: boolean;
  addingChoice: boolean;
  deletingBallot: boolean;
  deletingChoiceIds: Set<number>;

  onAddChoice: (ballotId: number, labelDe: string, labelEn: string) => Promise<boolean>;
  onDeleteChoice: (ballotId: number, choiceId: number) => Promise<boolean>;
  onDeleteBallot: (ballotId: number) => Promise<boolean>;
}>();

const draftDe = ref("");
const draftEn = ref("");

function ballotTypeLabel(b: Ballot): string {
  const type = b.ballotType;
  if (type === "first") return t("admin.ballots.typeFirst") as string;
  if (type === "second") return t("admin.ballots.typeSecond") as string;
  if (!type || type === "simple") return t("admin.ballots.typeSimple") as string;
  return String(type);
}

function ballotElectionLabel(b: Ballot): string {
  const nameDe = b.electionNameDe;
  const nameEn = b.electionNameEn;

  if (nameDe && nameDe.trim()) return nameDe;
  if (nameEn && nameEn.trim()) return nameEn;

  if (b.electionId != null) {
    return t("admin.ballots.electionGroupShort", { id: b.electionId }) as string;
  }
  return "";
}

async function submitChoice() {
  if (props.addingChoice) return;

  const ok = await props.onAddChoice(props.ballot.id, draftDe.value, draftEn.value);
  if (ok) {
    draftDe.value = "";
    draftEn.value = "";
  }
}
</script>

<style scoped>
.card {
  border-radius: 0.9rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 0.9rem 1rem;
  box-shadow: 0 3px 12px rgba(15, 23, 42, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}

.title-lines {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.title-de {
  font-weight: 600;
}
.title-en {
  font-size: 0.9rem;
  color: #4b5563;
}

.desc {
  margin: 0.15rem 0;
  font-size: 0.9rem;
  color: #4b5563;
}

.meta {
  margin: 0.1rem 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.rules {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}

.election-line {
  margin: 0.1rem 0 0.25rem;
}
.election-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #e0f2f1;
  color: #00897b;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.icon-btn {
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.2rem 0.5rem;
}
.icon-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.choices-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.choices-title {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.choices-list {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: center;
  padding: 0.4rem 0.5rem;
  border-radius: 0.6rem;
  background: #f9fafb;
}

.choice-labels {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.9rem;
}
.choice-line {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.6rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #e5e7eb;
  color: #374151;
}

.choice-form {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.choice-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
@media (min-width: 640px) {
  .choice-inputs {
    flex-direction: row;
  }
}

.field-inline {
  display: flex;
  flex-direction: column;
}
.field-inline.grow {
  flex: 1;
}

.label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.15rem;
}
.small-label {
  font-size: 0.8rem;
}

.input {
  width: 100%;
  min-width: 0;
  padding: 0.45rem 0.6rem;
  border-radius: 0.55rem;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
}
.input:focus {
  outline: 2px solid #0ea5e9;
  outline-offset: 1px;
}

.btn {
  border-radius: 0.6rem;
  border: 0;
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn.primary {
  background: #00897b;
  color: #ffffff;
}
.btn.primary:hover {
  background: #00695c;
}
.btn.small {
  padding: 0.35rem 0.8rem;
  font-size: 0.85rem;
}

.hint {
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
