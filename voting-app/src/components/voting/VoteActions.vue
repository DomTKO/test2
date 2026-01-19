<template>
  <div class="actions">
    <button class="ghost" type="button" @click="selectionLocked ? $emit('edit') : $emit('back')">
      {{ selectionLocked ? t("vote.editSelection") : t("common.back") }}
    </button>

    <template v-if="selectionLocked">
      <template v-if="votingInvalidVoteCheckbox">
        <button
          class="btn-success"
          type="button"
          @click="$emit('submit', !!invalidChecked)"
          :disabled="submitting"
          :aria-label="t('vote.submit')"
          :title="t('vote.submit')"
        >
          {{ submitting ? t("common.saving") : t("vote.submit") }}
        </button>
      </template>

      <template v-else>
        <template v-if="votingShowInvalidVoteButton">
          <button
            class="btn-danger btn-striped btn-invalid"
            type="button"
            @click="$emit('submit', true)"
            :disabled="submitting || (votingDisableInvalidButtonWhenValid && !isInvalid)"
            :aria-label="t('vote.submitInvalid')"
            :title="t('vote.submitInvalid')"
          >
            {{ submitting ? t("common.saving") : t("vote.submitInvalid") }}
          </button>

          <button
            class="btn-success btn-submit"
            type="button"
            @click="$emit('submit', false)"
            :disabled="submitting || (votingDisableSubmitOnInvalid && isInvalid)"
            :aria-label="t('vote.submit')"
            :title="t('vote.submit')"
          >
            {{ submitting ? t("common.saving") : t("vote.submit") }}
          </button>
        </template>

        <template v-else>
          <button
            :class="isInvalid ? 'btn-danger btn-striped' : 'btn-success'"
            type="button"
            @click="$emit('submit', false)"
            :disabled="submitting"
            :aria-label="isInvalid ? t('vote.submitInvalid') : t('vote.submit')"
            :title="isInvalid ? t('vote.submitInvalid') : t('vote.submit')"
          >
            {{
              submitting
                ? t("common.saving")
                : isInvalid
                ? t("vote.submitInvalid")
                : t("vote.submit")
            }}
          </button>
        </template>
      </template>
    </template>

    <button v-else class="btn-success" type="button" @click="$emit('continue')">
      {{ t("vote.continue") }}
    </button>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";

defineProps({
  selectionLocked: { type: Boolean, required: true },
  submitting: { type: Boolean, required: true },
  isInvalid: { type: Boolean, required: true },

  votingShowInvalidVoteButton: { type: Boolean, required: true },
  votingDisableSubmitOnInvalid: { type: Boolean, required: true },
  votingDisableInvalidButtonWhenValid: { type: Boolean, required: true },

  votingInvalidVoteCheckbox: { type: Boolean, default: false },
  invalidChecked: { type: Boolean, default: false },
});

defineEmits(["back", "edit", "continue", "submit"]);

const { t } = useI18n();
</script>

<style scoped>
.actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}
.actions .ghost {
  margin-right: auto;
}

button {
  padding: 0.55rem 0.95rem;
  border: 0;
  border-radius: 0.55rem;
  cursor: pointer;
}
button.ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
  color: #374151;
}
button.ghost:hover {
  background: #f9fafb;
}

.btn-success,
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  padding: 0.95rem 1.5rem;
  border-radius: 0.8rem;
  border: 0;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}
.btn-success {
  background: #00897b;
}
.btn-success:hover {
  background: #00695c;
}
.btn-danger {
  background: #b42318;
}
.btn-danger:hover {
  background: #8e1a12;
}

.btn-striped {
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.16) 0,
    rgba(255, 255, 255, 0.16) 8px,
    transparent 8px,
    transparent 16px
  );
}

.btn-success:focus-visible,
.btn-danger:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
}

.btn-success:disabled,
.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-invalid {
  order: 1;
}
.btn-submit {
  order: 2;
}
</style>
