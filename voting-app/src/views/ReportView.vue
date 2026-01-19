<template>
  <section class="box">
    <h2 class="title">{{ t("verify.report.title") }}</h2>

    <p v-if="loading" class="hint">{{ t("common.loading") }}</p>

    <template v-else>
      <p v-if="!enabled" class="error">
        {{ disabledText }}
      </p>

      <template v-else>
        <p class="intro">{{ t("verify.report.intro") }}</p>

        <p v-if="success" class="status-msg status-ok">{{ success }}</p>
        <p v-if="err" class="status-msg status-error">{{ err }}</p>

        <form class="report-form" @submit.prevent="onSubmit">
          <label class="field">
            <span class="field-label">
              {{ t("verify.report.contactLabel") }}
              <span class="optional">{{ t("verify.report.optional") }}</span>
            </span>
            <input
              v-model="contact"
              type="text"
              class="input"
              :placeholder="t('verify.report.contactPlaceholder') as string"
              autocomplete="email"
            />
          </label>

          <label class="field">
            <span class="field-label">{{ t("verify.report.messageLabel") }}</span>
            <textarea
              v-model="message"
              class="input textarea"
              rows="4"
              :placeholder="t('verify.report.messagePlaceholder') as string"
            ></textarea>
          </label>

          <div class="actions">
            <button type="submit" class="btn primary" :disabled="submitting">
              {{
                submitting
                  ? (t("common.saving") as string)
                  : (t("verify.report.submit") as string)
              }}
            </button>
          </div>
        </form>
      </template>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

import { useReportConfig } from "../composables/useReportConfig";
import { useReportSubmit } from "../composables/useReportSubmit";

const route = useRoute();
const { t, locale } = useI18n();

const context = computed(() => String(route.query.context ?? "voting").trim());
const token = computed(() => String(route.query.token ?? "").trim());

const { loading, enabled, disabledText, loadConfig } = useReportConfig(t);
const { contact, message, submitting, err, success, submitReport } = useReportSubmit(t);

async function onSubmit() {
  await submitReport({
    enabled: enabled.value,
    disabledText: disabledText.value,
    context: context.value,
    token: token.value || undefined,
    lang: String(locale.value),
  });
}

onMounted(loadConfig);

watch(
  () => locale.value,
  () => loadConfig()
);
</script>

<style scoped>
.box {
  max-width: 560px;
  margin: 1.25rem auto;
  padding: 1rem;
}

.title {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  font-weight: 700;
}

.intro {
  margin: 0 0 0.75rem;
  color: #4b5563;
}

.hint {
  color: #6b7280;
}

.error {
  color: #b91c1c;
}

.report-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.optional {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border-radius: 0.55rem;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  background: #fff;
}

.textarea {
  min-height: 110px;
  resize: vertical;
}

.actions {
  display: flex;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.btn {
  border-radius: 0.6rem;
  border: 1px solid #d1d5db;
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  cursor: pointer;
  background: #fff;
}

.btn.primary {
  border: 0;
  background: #00897b;
  color: #fff;
  font-weight: 700;
}

.btn.primary:hover {
  background: #00695c;
}

.btn[disabled] {
  opacity: 0.6;
  cursor: default;
}

.status-msg {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
}

.status-ok {
  color: #166534;
}

.status-error {
  color: #b91c1c;
}
</style>
