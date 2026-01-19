<template>
  <section
    v-if="votingInvalidVoteCheckbox"
    class="invalid-box"
    :class="{ checked: invalidChecked }"
  >
    <label class="invalid-row">
      <input
        class="invalid-check"
        type="checkbox"
        :checked="invalidChecked"
        :disabled="disabled"
        @change="onInvalidChange"
      />
      <span class="invalid-text">{{ t("vote.invalidVoteCheckboxLabel") }}</span>
    </label>
    <p class="invalid-hint">{{ t("vote.invalidVoteCheckboxHint") }}</p>
  </section>

  <BallotChoicesList
    :ballotId="ballotId"
    :choices="choices"
    :selectedIds="selectedIds"
    :disabled="disabled || (votingInvalidVoteCheckbox && invalidChecked)"
    @toggle="emit('toggle', $event)"
  />
</template>

<script setup>
import { useI18n } from "vue-i18n";
import BallotChoicesList from "./BallotChoiceList.vue";

const props = defineProps({
  ballotId: { type: Number, required: true },
  choices: { type: Array, required: true },
  selectedIds: { type: Array, required: true },
  disabled: { type: Boolean, required: true },

  votingInvalidVoteCheckbox: { type: Boolean, default: false },
  invalidChecked: { type: Boolean, default: false },
});

const emit = defineEmits(["toggle", "set-invalid"]);

const { t } = useI18n();

function onInvalidChange(e) {
  const checked = !!e?.target?.checked;
  emit("set-invalid", { ballotId: props.ballotId, checked });
}
</script>

<style scoped>
.invalid-box {
  border-radius: 0.85rem;
  border: 1px solid #777777;
  background: #dfdfdf;
  padding: 0.75rem 0.85rem;
  margin-bottom: 0.75rem;
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
