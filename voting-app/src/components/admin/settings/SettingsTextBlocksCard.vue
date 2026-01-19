<template>
  <article class="card">
    <header class="card-header">
      <div>
        <h3 class="card-title">{{ t("admin.settings.textBlocksTitle") }}</h3>
        <p class="card-subtitle">{{ t("admin.settings.textBlocksSubtitle") }}</p>
      </div>
    </header>

    <div class="card-body">
      <!-- Home -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.block.home.title") }}</h4>
        <p class="hint">{{ t("admin.settings.block.home.hint") }}</p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.de", "Deutsch (de)") }}</span>
            <textarea v-model="blocks.home.de" class="input textarea" rows="4" />
          </label>

          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.en", "English (en)") }}</span>
            <textarea v-model="blocks.home.en" class="input textarea" rows="4" />
          </label>
        </div>
      </section>

      <!-- Login -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.block.login.title") }}</h4>
        <p class="hint">{{ t("admin.settings.block.login.hint") }}</p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.de", "Deutsch (de)") }}</span>
            <textarea v-model="blocks.login.de" class="input textarea" rows="4" />
          </label>

          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.en", "English (en)") }}</span>
            <textarea v-model="blocks.login.en" class="input textarea" rows="4" />
          </label>
        </div>
      </section>

      <!-- Verifier -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.block.verify.title") }}</h4>
        <p class="hint">{{ t("admin.settings.block.verify.hint") }}</p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.de", "Deutsch (de)") }}</span>
            <textarea v-model="blocks.verify.de" class="input textarea" rows="4" />
          </label>

          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.en", "English (en)") }}</span>
            <textarea v-model="blocks.verify.en" class="input textarea" rows="4" />
          </label>
        </div>
      </section>

      <!-- Voting Info -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.block.votingInfo.title") }}</h4>
        <p class="hint">{{ t("admin.settings.block.votingInfo.hint") }}</p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.de", "Deutsch (de)") }}</span>
            <textarea v-model="blocks.votingInfo.de" class="input textarea" rows="3" />
          </label>

          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.en", "English (en)") }}</span>
            <textarea v-model="blocks.votingInfo.en" class="input textarea" rows="3" />
          </label>
        </div>
      </section>
    </div>

    <footer class="card-footer card-footer-actions">
      <button type="button" class="btn primary" :disabled="savingTexts" @click="save">
        {{
          savingTexts
            ? (t("common.saving") as string)
            : (t("admin.settings.saveButton") as string)
        }}
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useI18n } from "vue-i18n";
import { AdminSettingsKey } from "../../../composables/useAdminSettings";

const ctx = inject(AdminSettingsKey);
if (!ctx) throw new Error("AdminSettingsKey not provided");

const { blocks, savingTexts, saveTexts } = ctx;
const { t } = useI18n();

function safeT(key: string, fallback: string): string {
  const v = t(key) as string;
  return v === key ? fallback : v;
}

async function save() {
  await saveTexts({
    saveErrorText: t("admin.settings.saveError") as string,
    saveOkText: t("admin.settings.saveTextsSuccess") as string,
    loadErrorText: t("admin.settings.loadError") as string,
  });
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
.card-title {
  margin: 0 0 0.15rem;
  font-size: 1rem;
  font-weight: 600;
}
.card-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #6b7280;
}
.card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
.block {
  border-radius: 0.75rem;
  border: 1px dashed #e5e7eb;
  padding: 0.7rem 0.8rem;
  background: #f9fafb;
}
.block-title {
  margin: 0 0 0.2rem;
  font-size: 0.95rem;
  font-weight: 600;
}
.field-group {
  margin-top: 0.5rem;
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
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.input:focus {
  outline: 2px solid #0ea5e9;
  outline-offset: 1px;
}
.textarea {
  resize: vertical;
  min-height: 90px;
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
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.hint {
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
