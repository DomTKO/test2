<template>
  <article class="card">
    <header class="card-header">
      <div>
        <h3 class="card-title">{{ t("admin.settings.researchTitle") }}</h3>
        <p class="card-subtitle">{{ t("admin.settings.researchSubtitle") }}</p>
      </div>
    </header>

    <div class="card-body">
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.manipulation") }}</h4>
        <p class="hint">{{ t("admin.settings.manipulationNote") }}</p>

        <div class="field-group">
          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="researchVerifierOffset" />
            <span>{{ t("admin.settings.researchVerifierOffsetLabel") }}</span>
          </label>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="researchHideQr" />
            <span>{{ t("admin.settings.researchHideQrLabel") }}</span>
          </label>
        </div>
      </section>
    </div>

    <footer class="card-footer card-footer-actions">
      <button type="button" class="btn primary" :disabled="savingResearch" @click="save">
        {{
          savingResearch
            ? (t("common.saving") as string)
            : (t("admin.settings.researchSaveButton") as string)
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

const { researchVerifierOffset, researchHideQr, savingResearch, saveResearch } = ctx;
const { t } = useI18n();

async function save() {
  await saveResearch({
    saveErrorText: t("admin.settings.saveError") as string,
    saveOkText: t("admin.settings.saveResearchSuccess") as string,
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
.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.hint {
  font-size: 0.85rem;
  color: #6b7280;
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
</style>
