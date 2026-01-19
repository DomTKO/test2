<template>
  <article class="card">
    <header class="card-header">
      <div>
        <h3 class="card-title">{{ t("admin.settings.misc.title") }}</h3>
        <p class="card-subtitle">{{ t("admin.settings.misc.subtitle") }}</p>
      </div>
    </header>

    <div class="card-body">
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.publicReport.title") }}</h4>
        <p class="hint">{{ t("admin.settings.publicReport.hint") }}</p>

        <div class="field-group field-group-vertical">
          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="votingEnablePublicReport" />
            <span>{{ t("admin.settings.publicReport.enableLabel") }}</span>
          </label>

          <div class="copy-row" :class="{ disabled: !votingEnablePublicReport }">
            <input
              class="input mono"
              :value="publicReportUrl"
              readonly
              :disabled="!votingEnablePublicReport"
              :aria-label="t('admin.settings.publicReport.ariaLabel')"
            />

            <button
              type="button"
              class="btn secondary"
              :disabled="!votingEnablePublicReport"
              @click="copy"
            >
              {{
                copied
                  ? t("admin.settings.publicReport.copied")
                  : t("admin.settings.publicReport.copy")
              }}
            </button>
          </div>

          <p class="hint" :class="{ disabledText: !votingEnablePublicReport }">
            {{
              votingEnablePublicReport
                ? t("admin.settings.publicReport.linkHintEnabled")
                : t("admin.settings.publicReport.linkHintDisabled")
            }}
          </p>
        </div>
      </section>

      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.misc.otherFlagsTitle") }}</h4>

        <div class="field-group field-group-vertical">
          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="votingInvalidVoteCheckbox" />
            <span>{{ t("admin.settings.misc.votingInvalidVoteCheckbox") }}</span>
          </label>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="verifierRequireUsernameConfirm" />
            <span>{{ t("admin.settings.misc.verifierRequireUsernameConfirm") }}</span>
          </label>
        </div>

        <p class="hint">{{ t("admin.settings.misc.otherFlagsHint") }}</p>
      </section>
    </div>

    <footer class="card-footer card-footer-actions">
      <button type="button" class="btn primary" :disabled="savingMisc" @click="save">
        {{ savingMisc ? t("common.saving") : t("admin.settings.misc.saveButton") }}
      </button>
    </footer>
  </article>
</template>

<script setup>
import { inject } from "vue";
import { useI18n } from "vue-i18n";
import { AdminSettingsKey } from "../../../composables/useAdminSettings";

const ctx = inject(AdminSettingsKey);
if (!ctx) throw new Error("AdminSettingsKey not provided");

const {
  votingEnablePublicReport,
  publicReportUrl,
  copied,
  savingMisc,
  copyPublicReportLink,
  saveMisc,
  votingInvalidVoteCheckbox,
  verifierRequireUsernameConfirm,
} = ctx;

const { t } = useI18n();

async function copy() {
  await copyPublicReportLink(
    String(t("admin.settings.publicReport.copySuccess")),
    String(t("admin.settings.publicReport.copyFailed"))
  );
}

async function save() {
  await saveMisc({
    saveErrorText: String(t("admin.settings.saveError")),
    saveOkText: String(t("admin.settings.misc.savedSuccess")),
    loadErrorText: String(t("admin.settings.loadError")),
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
.field-group.field-group-vertical {
  flex-direction: column;
}
.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.copy-row {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}
.copy-row .input {
  flex: 1;
}
.copy-row.disabled {
  opacity: 0.55;
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
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
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
.btn.secondary {
  background: #eef2ff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}
.btn.secondary:hover {
  background: #e0e7ff;
}
.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.hint {
  font-size: 0.85rem;
  color: #6b7280;
}
.disabledText {
  opacity: 0.65;
}
</style>
