<template>
  <div v-if="ballots.length" class="ballot-list">
    <article v-for="b in ballots" :key="b.id" class="ballot-card">
      <header class="ballot-header">
        <h3 class="ballot-title">{{ b.title }}</h3>
        <p v-if="b.description" class="ballot-desc">{{ b.description }}</p>

        <p class="status" :class="isBallotValid(b) ? 'status-valid' : 'status-invalid'">
          {{ isBallotValid(b) ? t("verify.validLabel") : t("verify.invalidLabel") }}
        </p>
      </header>

      <ul
        class="choices"
        v-if="(optionsByBallot[b.id] ?? []).length"
      >
        <li v-for="opt in optionsByBallot[b.id] ?? []" :key="opt.id">
          <label
            class="choice"
            :class="{ selected: (selectedByBallot[b.id] ?? new Set()).has(opt.id) }"
            @click="$emit('optionClick', { ballotId: b.id, optionId: opt.id })"
          >
            <span class="ballotbox" aria-hidden="true">
              <svg viewBox="0 0 24 24" class="cross">
                <circle cx="12" cy="12" r="10" class="ring" />
                <path d="M7 7 L17 17 M17 7 L7 17" class="x" />
              </svg>
            </span>
            <span class="label">{{ opt.label }}</span>
          </label>
        </li>
      </ul>

      <p v-else class="hint">
        {{ t("verify.noChoices") }}
      </p>
    </article>
  </div>

  <p v-else class="hint">
    {{ t("verify.noChoices") }}
  </p>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

type Ballot = {
  id: number;
  title: string;
  description: string;
  minChoices?: number;
  maxChoices?: number;
};

type BallotChoice = { id: number; label: string; sortIndex: number };

const { t } = useI18n();

defineProps<{
  ballots: Ballot[];
  optionsByBallot: Record<number, BallotChoice[]>;
  selectedByBallot: Record<number, Set<number>>;
  isBallotValid: (b: Ballot) => boolean;
}>();

defineEmits<{
  (e: "optionClick", payload: { ballotId: number; optionId: number }): void;
}>();
</script>

<style scoped>
.hint {
  color: #6b7280;
}

.ballot-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.ballot-card {
  padding: 0.75rem 0;
  border-top: 1px solid #e5e7eb;
}
.ballot-card:first-child {
  border-top: 0;
}

.ballot-header {
  margin-bottom: 0.4rem;
}

.ballot-title {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 600;
}

.ballot-desc {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  color: #4b5563;
}

/* Badge */
.status {
  display: inline-block;
  margin: 0.25rem 0 0;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-weight: 600;
  font-size: 0.9rem;
}
.status-valid {
  background: #e0f2f1;
  color: #00695c;
}
.status-invalid {
  background: #fee2e2;
  color: #991b1b;
}

.choices {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.choice.selected {
  border-color: #1d4ed8;
  background: #eef2ff;
}

.label {
  color: #111827;
  font-size: 1rem;
  line-height: 1.25rem;
}

.ballotbox {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 32px;
  border-radius: 999px;
}
.cross {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.ring {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 2.2;
}
.x {
  stroke: #1d4ed8;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 28 28;
  stroke-dashoffset: 28;
  transition: stroke-dashoffset 0.18s ease-out;
}
.choice.selected .x {
  stroke-dashoffset: 0;
}
.choice.selected .ring {
  stroke: #1d4ed8;
}
</style>
