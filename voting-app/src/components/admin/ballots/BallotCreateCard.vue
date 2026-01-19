<template>
  <!-- Plus-Kachel -->
  <article v-if="!open" class="card card-add" @click="open = true">
    <button type="button" class="add-button">
      <span class="add-icon">＋</span>
      <span>{{ t("admin.ballots.addBallot") }}</span>
    </button>
  </article>

  <!-- Create-Form -->
  <article v-else class="card card-edit">
    <header class="card-header">
      <h3 class="card-title">{{ t("admin.ballots.newBallotTitle") }}</h3>
    </header>

    <div class="card-body">
      <!-- Modus-switch -->
      <div class="mode-toggle">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'simple' }"
          @click="mode = 'simple'"
        >
          {{ t("admin.ballots.modeSimple") }}
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'pair' }"
          @click="mode = 'pair'"
        >
          {{ t("admin.ballots.modePair") }}
        </button>
      </div>

      <!-- Simple -->
      <div v-if="mode === 'simple'">
        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ t("admin.ballots.titleDe") }}</span>
            <input v-model="simple.titleDe" type="text" class="input" />
          </label>

          <label class="field-stack">
            <span class="label">{{ t("admin.ballots.titleEn") }}</span>
            <input v-model="simple.titleEn" type="text" class="input" />
          </label>
        </div>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ t("admin.ballots.descDe") }}</span>
            <textarea v-model="simple.descriptionDe" class="input textarea" rows="2" />
          </label>

          <label class="field-stack">
            <span class="label">{{ t("admin.ballots.descEn") }}</span>
            <textarea v-model="simple.descriptionEn" class="input textarea" rows="2" />
          </label>
        </div>

        <div class="field-group rules-row">
          <label class="field-inline">
            <span class="label">{{ t("admin.ballots.minChoices") }}</span>
            <input v-model.number="simple.minChoices" type="number" min="0" class="input small" />
          </label>

          <label class="field-inline">
            <span class="label">{{ t("admin.ballots.maxChoices") }}</span>
            <input v-model.number="simple.maxChoices" type="number" min="1" class="input small" />
          </label>
        </div>
      </div>

      <!-- Pair -->
      <div v-else class="pair-form">
        <div class="pair-column pair-column-election">
          <h4 class="pair-column-title">{{ t("admin.ballots.electionGroupTitle") }}</h4>

          <div class="field-group">
            <label class="field-stack">
              <span class="label">{{ t("admin.ballots.electionTitleDe") }}</span>
              <input v-model="election.titleDe" type="text" class="input" />
            </label>

            <label class="field-stack">
              <span class="label">{{ t("admin.ballots.electionTitleEn") }}</span>
              <input v-model="election.titleEn" type="text" class="input" />
            </label>
          </div>
        </div>

        <div class="pair-columns-row">
          <!-- First -->
          <div class="pair-column">
            <h4 class="pair-column-title">{{ t("admin.ballots.firstVote") }}</h4>

            <div class="field-group">
              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.titleDe") }}</span>
                <input v-model="first.titleDe" type="text" class="input" />
              </label>

              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.titleEn") }}</span>
                <input v-model="first.titleEn" type="text" class="input" />
              </label>
            </div>

            <div class="field-group">
              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.descDe") }}</span>
                <textarea v-model="first.descriptionDe" class="input textarea" rows="2" />
              </label>

              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.descEn") }}</span>
                <textarea v-model="first.descriptionEn" class="input textarea" rows="2" />
              </label>
            </div>

            <div class="field-group rules-row">
              <label class="field-inline">
                <span class="label">{{ t("admin.ballots.minChoices") }}</span>
                <input v-model.number="first.minChoices" type="number" min="0" class="input small" />
              </label>

              <label class="field-inline">
                <span class="label">{{ t("admin.ballots.maxChoices") }}</span>
                <input v-model.number="first.maxChoices" type="number" min="1" class="input small" />
              </label>
            </div>
          </div>

          <!-- Second -->
          <div class="pair-column">
            <h4 class="pair-column-title">{{ t("admin.ballots.secondVote") }}</h4>

            <div class="field-group">
              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.titleDe") }}</span>
                <input v-model="second.titleDe" type="text" class="input" />
              </label>

              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.titleEn") }}</span>
                <input v-model="second.titleEn" type="text" class="input" />
              </label>
            </div>

            <div class="field-group">
              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.descDe") }}</span>
                <textarea v-model="second.descriptionDe" class="input textarea" rows="2" />
              </label>

              <label class="field-stack">
                <span class="label">{{ t("admin.ballots.descEn") }}</span>
                <textarea v-model="second.descriptionEn" class="input textarea" rows="2" />
              </label>
            </div>

            <div class="field-group rules-row">
              <label class="field-inline">
                <span class="label">{{ t("admin.ballots.minChoices") }}</span>
                <input v-model.number="second.minChoices" type="number" min="0" class="input small" />
              </label>

              <label class="field-inline">
                <span class="label">{{ t("admin.ballots.maxChoices") }}</span>
                <input v-model.number="second.maxChoices" type="number" min="1" class="input small" />
              </label>
            </div>
          </div>
        </div>

        <p class="hint pair-hint">{{ t("admin.ballots.pairHelp") }}</p>
      </div>
    </div>

    <footer class="card-footer card-footer-actions">
      <button type="button" class="btn ghost" @click="close" :disabled="saving">
        {{ t("common.back") }}
      </button>

      <button type="button" class="btn primary" @click="submit" :disabled="saving">
        {{ saving ? t("common.saving") : t("admin.ballots.createButton") }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { Draft, ElectionText } from "../../../composables/useAdminBallots";

const { t } = useI18n();

const props = defineProps<{
  saving: boolean;
  resetKey: number;
  onCreateSimple: (draft: Draft) => Promise<boolean>;
  onCreatePair: (election: ElectionText, first: Draft, second: Draft) => Promise<boolean>;
}>();

const open = ref(false);
const mode = ref<"simple" | "pair">("simple");

const emptyDraft = (): Draft => ({
  titleDe: "",
  titleEn: "",
  descriptionDe: "",
  descriptionEn: "",
  minChoices: 1,
  maxChoices: 1,
});

const simple = ref<Draft>(emptyDraft());
const election = ref<ElectionText>({ titleDe: "", titleEn: "" });
const first = ref<Draft>(emptyDraft());
const second = ref<Draft>(emptyDraft());

function resetAll() {
  mode.value = "simple";
  simple.value = emptyDraft();
  election.value = { titleDe: "", titleEn: "" };
  first.value = emptyDraft();
  second.value = emptyDraft();
}

function close() {
  open.value = false;
  resetAll();
}

async function submit() {
  if (props.saving) return;

  if (mode.value === "simple") {
    const ok = await props.onCreateSimple({ ...simple.value });
    if (ok) close();
    return;
  }

  const ok = await props.onCreatePair(
    { ...election.value },
    { ...first.value },
    { ...second.value }
  );
  if (ok) close();
}

watch(
  () => props.resetKey,
  () => {
    if (open.value) close();
  }
);
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

.card-add {
  border-style: dashed;
  border-color: #9ca3af;
  background: #f9fafb;
  display: flex;
  align-items: stretch;
  justify-content: center;
  cursor: pointer;
}
.card-add:hover {
  background: #f3f4f6;
}

.add-button {
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.95rem;
  cursor: pointer;
  color: #111827;
}
.add-icon {
  font-size: 1.4rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}
.card-title {
  margin: 0 0 0.4rem;
  font-size: 1rem;
  font-weight: 600;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.card-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.card-footer-actions {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.6rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
@media (min-width: 700px) {
  .field-group {
    flex-direction: row;
  }
}
.field-stack {
  flex: 1;
}
.field-inline {
  display: flex;
  flex-direction: column;
}
.rules-row {
  gap: 0.75rem;
}

.label {
  display: block;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0.15rem;
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

.textarea {
  resize: vertical;
}
.input.small {
  max-width: 120px;
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
.btn.ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #374151;
}
.btn.ghost:hover {
  background: #f3f4f6;
}

.mode-toggle {
  display: inline-flex;
  padding: 0.15rem;
  border-radius: 999px;
  background: #f3f4f6;
  margin-bottom: 0.6rem;
}
.mode-btn {
  border: 0;
  background: transparent;
  padding: 0.25rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #4b5563;
}
.mode-btn.active {
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.12);
  color: #111827;
}

/* Pair */
.pair-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.25rem;
}
.pair-columns-row {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
@media (min-width: 800px) {
  .pair-columns-row {
    flex-direction: row;
    align-items: stretch;
  }
}
.pair-column {
  flex: 1;
  border-radius: 0.7rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 0.7rem 0.8rem;
}
.pair-column-title {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
.hint {
  font-size: 0.85rem;
  color: #6b7280;
}
.pair-hint {
  margin: 0;
}
</style>
