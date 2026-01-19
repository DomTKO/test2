<template>
  <div class="pair-layout">
    <article v-for="b in ballots" :key="b.id" class="pair-column" :data-ballot-id="b.id">
      <header class="pair-header">
        <h2 class="pair-title">{{ b.title }}</h2>
        <p v-if="b.description" class="pair-desc">{{ b.description }}</p>
        <p class="hint">
          {{ t("vote.pickBetween", { min: b.minChoices, max: b.maxChoices }) }}
        </p>
      </header>

      <section
        v-if="votingInvalidVoteCheckbox"
        class="invalid-box"
        :class="{ checked: !!(invalidByBallot[b.id]) }"
      >
        <label class="invalid-row">
          <input
            class="invalid-check"
            type="checkbox"
            :checked="!!(invalidByBallot[b.id])"
            :disabled="disabled"
            @change="(e) => onInvalidChange(b.id, e)"
          />
          <span class="invalid-text">{{ t("vote.invalidVoteCheckboxLabel") }}</span>
        </label>
        <p class="invalid-hint">{{ t("vote.invalidVoteCheckboxHint") }}</p>
      </section>

      <BallotChoicesList
        :ballotId="b.id"
        :choices="choicesByBallot[b.id] ?? []"
        :selectedIds="selectedByBallot[b.id] ?? []"
        :disabled="disabled || (votingInvalidVoteCheckbox && !!invalidByBallot[b.id])"
        @toggle="$emit('toggle', $event)"
      />
    </article>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BallotChoicesList from "./BallotChoiceList.vue";

const { t } = useI18n();

defineProps({
  ballots: { type: Array, required: true },
  choicesByBallot: { type: Object, required: true },
  selectedByBallot: { type: Object, required: true },
  invalidByBallot: { type: Object, default: () => ({}) },
  votingInvalidVoteCheckbox: { type: Boolean, default: false },
  disabled: { type: Boolean, required: true },
});

const emit = defineEmits(["toggle", "set-invalid"]);

function onInvalidChange(ballotId, e) {
  const checked = !!e?.target?.checked;
  emit("set-invalid", { ballotId, checked });
}
</script>

<style scoped>
.pair-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}
.pair-column {
  flex: 1;
}
.pair-header {
  margin-bottom: 0.4rem;
}
.pair-title {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 600;
}
.pair-desc {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  color: #4b5563;
}
.hint {
  color: #6b7280;
}

.invalid-box {
  border-radius: 0.85rem;
  border: 1px solid #777777;
  background: #dfdfdf;
  padding: 0.75rem 0.85rem;
  margin: 0.35rem 0 0.75rem;
}
.invalid-box.checked {
  border-color: #b91c1c;
  background: #ffe4e6;
}
.invalid-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}
.invalid-check {
  width: 1.15rem;
  height: 1.15rem;
  accent-color: #b91c1c;
}
.invalid-text {
  font-weight: 500;
  color: #000000;
  font-size: 1rem;
}
.invalid-hint {
  margin: 0.35rem 0 0;
  color: #000000;
  font-size: 0.9rem;
}
</style>
