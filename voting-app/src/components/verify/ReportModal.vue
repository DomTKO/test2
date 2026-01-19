<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="$emit('update:modelValue', false)">
    <section class="report-modal" role="dialog" aria-modal="true">
      <header class="report-header">
        <h3 class="report-title">{{ t("verify.report.title") }}</h3>
        <button
          type="button"
          class="report-close"
          @click="$emit('update:modelValue', false)"
          aria-label="Schließen"
        >
          ×
        </button>
      </header>

      <p class="report-intro">{{ t("verify.report.intro") }}</p>

      <p v-if="success" class="status-msg status-ok">{{ success }}</p>
      <p v-if="error" class="status-msg status-error">{{ error }}</p>

      <form class="report-form" @submit.prevent="$emit('submit')">
        <label class="field">
          <span class="field-label">
            {{ t("verify.report.contactLabel") }}
            <span class="optional">{{ t("verify.report.optional") }}</span>
          </span>

          <input
            :value="contact"
            @input="$emit('update:contact', ($event.target as HTMLInputElement).value)"
            type="text"
            class="input"
            :placeholder="t('verify.report.contactPlaceholder') as string"
          />
        </label>

        <label class="field">
          <span class="field-label">{{ t("verify.report.messageLabel") }}</span>

          <textarea
            :value="message"
            @input="$emit('update:message', ($event.target as HTMLTextAreaElement).value)"
            class="input textarea"
            rows="3"
            :placeholder="t('verify.report.messagePlaceholder') as string"
          ></textarea>
        </label>

        <button type="submit" class="btn-report" :disabled="submitting">
          {{ submitting ? (t("common.saving") as string) : (t("verify.report.submit") as string) }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{
  modelValue: boolean;
  contact: string;
  message: string;
  submitting: boolean;
  error: string;
  success: string;
}>();

defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "update:contact", v: string): void;
  (e: "update:message", v: string): void;
  (e: "submit"): void;
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

.report-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 500;
}

.optional {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  background: #ffffff;
}

.textarea {
  min-height: 90px;
}

.btn-report {
  margin-top: 0.25rem;
  align-self: flex-start;
  padding: 0.5rem 1rem;
  border-radius: 0.8rem;
  border: 0;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: #ffffff;
  background: #00897b;
}

.btn-report[disabled] {
  opacity: 0.6;
  cursor: default;
}

.status-msg {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}
.status-ok {
  color: #166534;
}
.status-error {
  color: #b91c1c;
}
</style>
