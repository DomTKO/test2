<template>
  <article class="card">
    <header class="card-header">
      <div>
        <h3 class="card-title">{{ t("admin.settings.logoTitle") }}</h3>
        <p class="card-subtitle">{{ t("admin.settings.logoSubtitle") }}</p>
      </div>
    </header>

    <div class="card-body">
      <!-- Logo -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.logoFieldTitle") }}</h4>
        <p class="hint">{{ t("admin.settings.logoFieldHint") }}</p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ t("admin.settings.logoUrlLabel") }}</span>

            <input
              :key="logoInputResetKey"
              type="file"
              accept="image/*"
              class="input"
              @change="onFileChange"
            />

            <p class="hint">{{ t("admin.settings.logoUrlPlaceholder") }}</p>
          </label>

          <div class="field-stack" v-if="hasLogo || logoPreviewUrl">
            <span class="label">
              {{ t("admin.settings.logoPreviewLabel") }}
            </span>

            <div class="logo-preview">
              <img
                :src="logoPreviewUrl"
                :alt="safeT('admin.settings.logoPreviewAlt', 'Logo preview')"
                class="logo-preview-img"
                @error="onLogoError"
                @load="onLogoLoad"
              />

              <p v-if="logoLoadError" class="hint error">
                {{ t("admin.settings.logoLoadError") }}
              </p>

              <label class="hint" v-if="hasLogo">
                <input type="checkbox" v-model="deleteLogo" />
                {{ t("admin.settings.removeLogo") }}
              </label>
            </div>
          </div>
        </div>
      </section>

      <!-- App Titel -->
      <section class="block">
        <h4 class="block-title">
          {{ safeT("admin.settings.appTitle.title", "App Titel") }}
        </h4>

        <p class="hint">
          {{
            safeT(
              "admin.settings.appTitle.hint",
              "Dieser Titel wird im Header der App angezeigt (pro Sprache)."
            )
          }}
        </p>

        <div class="field-group">
          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.de", "Deutsch (de)") }}</span>
            <input
              v-model="appTitleDe"
              type="text"
              class="input"
              :placeholder="safeT('admin.settings.appTitle.placeholderDe', 'z.B. Voting-App')"
            />
          </label>

          <label class="field-stack">
            <span class="label">{{ safeT("admin.settings.lang.en", "English (en)") }}</span>
            <input
              v-model="appTitleEn"
              type="text"
              class="input"
              :placeholder="safeT('admin.settings.appTitle.placeholderEn', 'e.g. Voting App')"
            />
          </label>
        </div>
      </section>

      <!-- Sonstige Erscheinungsbild -->
      <section class="block">
        <h4 class="block-title">{{ t("admin.settings.appearanceOther.title") }}</h4>
        <p class="hint">{{ t("admin.settings.appearanceOther.hint") }}</p>

        <div class="field-group field-group-vertical">
          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="votingHideBallotAfterSubmit" />
            <span>{{ t("admin.settings.appearanceOther.votingHideAfterSubmit") }}</span>
          </label>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="votingQrOnlyLastBallot" />
            <span>{{ t("admin.settings.appearanceOther.votingQrOnlyLastBallot") }}</span>
          </label>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="verifierShowAllBallots" />
            <span>{{ t("admin.settings.appearanceOther.verifierShowAllBallots") }}</span>
          </label>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="verifierReportUseSimpleView" />
            <span>{{ t("admin.settings.appearanceOther.verifierReportUseSimpleView") }}</span>
          </label>

          <div class="divider"></div>

          <label class="field-stack checkbox-row">
            <input type="checkbox" v-model="votingShowInvalidVoteButton" />
            <span>{{ t("admin.settings.appearanceOther.votingShowInvalidVoteButton") }}</span>
          </label>

          <label class="field-stack checkbox-row dependent" :class="{ disabled: invalidVoteDepsDisabled }">
            <input
              type="checkbox"
              v-model="votingDisableSubmitOnInvalid"
              :disabled="invalidVoteDepsDisabled"
            />
            <span>{{ t("admin.settings.appearanceOther.votingDisableSubmitOnInvalid") }}</span>
          </label>

          <label class="field-stack checkbox-row dependent" :class="{ disabled: invalidVoteDepsDisabled }">
            <input
              type="checkbox"
              v-model="votingDisableInvalidButtonWhenValid"
              :disabled="invalidVoteDepsDisabled"
            />
            <span>{{ t("admin.settings.appearanceOther.votingDisableInvalidButtonWhenValid") }}</span>
          </label>
        </div>
      </section>
    </div>

    <footer class="card-footer card-footer-actions">
      <button type="button" class="btn primary" :disabled="savingBranding" @click="save">
        {{
          savingBranding
            ? (t("common.saving") as string)
            : (t("admin.settings.appearanceSaveButton") as string)
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

const {
  logoInputResetKey,
  hasLogo,
  logoPreviewUrl,
  logoLoadError,
  deleteLogo,

  appTitleDe,
  appTitleEn,

  votingHideBallotAfterSubmit,
  votingQrOnlyLastBallot,
  verifierShowAllBallots,
  verifierReportUseSimpleView,

  votingShowInvalidVoteButton,
  votingDisableSubmitOnInvalid,
  votingDisableInvalidButtonWhenValid,

  invalidVoteDepsDisabled,
  savingBranding,

  onLogoError,
  onLogoLoad,
  setSelectedLogoFile,
  saveBrandingAndAppearance,
} = ctx;

const { t } = useI18n();

function safeT(key: string, fallback: string): string {
  const v = t(key) as string;
  return v === key ? fallback : v;
}

function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0] || null;
  setSelectedLogoFile(file);
}

async function save() {
  await saveBrandingAndAppearance({
    saveErrorText: t("admin.settings.saveError") as string,
    saveOkText: t("admin.settings.saveAppearanceSuccess") as string,
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
.field-group.field-group-vertical {
  flex-direction: column;
}
@media (min-width: 700px) {
  .field-group.field-group-vertical {
    flex-direction: column;
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
.error {
  color: #b91c1c;
}
.logo-preview {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  align-items: flex-start;
}
.logo-preview-img {
  max-height: 40px;
  max-width: 180px;
  object-fit: contain;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  padding: 0.25rem 0.4rem;
  background: #ffffff;
}
.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
}
.divider {
  height: 1px;
  background: #e5e7eb;
  margin: 0.35rem 0;
}
.checkbox-row.dependent {
  padding-left: 1.15rem;
  border-left: 3px solid #e5e7eb;
  margin-left: 0.25rem;
}
.checkbox-row.dependent.disabled {
  opacity: 0.55;
}
</style>
