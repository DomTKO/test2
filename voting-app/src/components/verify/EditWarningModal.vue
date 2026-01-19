<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <section class="report-modal" role="dialog" aria-modal="true">
      <header class="report-header">
        <h3 class="report-title">{{ t("verify.editWarningTitle") }}</h3>
        <button
          type="button"
          class="report-close"
          @click="$emit('update:modelValue', false)"
          aria-label="Schließen"
        >
          ×
        </button>
      </header>

      <p class="report-intro">{{ t("verify.editWarningText") }}</p>

      <button type="button" class="btn-report" @click="$emit('update:modelValue', false)">
        {{ t("verify.editWarningOk") }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{ modelValue: boolean }>();

defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.report-modal {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 0.9rem;
  padding: 1rem 1.25rem 1.25rem;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.4);
  border: 1px solid #e5e7eb;
}

.report-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.report-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.report-close {
  border: none;
  background: transparent;
  font-size: 1.3rem;
  cursor: pointer;
  color: #6b7280;
}

.report-intro {
  margin: 0.4rem 0 0.75rem;
  font-size: 0.9rem;
  color: #4b5563;
}

.btn-report {
  margin-top: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 0.8rem;
  border: 0;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: #ffffff;
  background: #00897b;
}
</style>
