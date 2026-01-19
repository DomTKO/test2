<template>
  <section class="admin-settings">
 <v-alert
  v-if="ctx.vAlert.value"
  :type="ctx.vAlert.value.type"
  variant="flat"
  :color="ctx.vAlert.value.type === 'success' ? '#daf0ef' : '#b91c1c'"
  class="floating-alert"
>
  {{ ctx.vAlert.value.message }}
</v-alert>

    <h2>{{ t("admin.settings.title") }}</h2>
    <p class="intro">{{ t("admin.settings.intro") }}</p>

    <p v-if="ctx.loading.value" class="hint">{{ t("common.loading") }}</p>

    <div class="cards">
      <SettingsTextBlocksCard />
      <SettingsBrandingAppearanceCard />
      <SettingsResearchCard />
      <SettingsMiscCard />
    </div>
  </section>
</template>

<script setup lang="ts">
import { provide, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { useAdminSettings, AdminSettingsKey } from "../../composables/useAdminSettings";

import SettingsTextBlocksCard from "../../components/admin/settings/SettingsTextBlocksCard.vue";
import SettingsBrandingAppearanceCard from "../../components/admin/settings/SettingsBrandingAppearanceCard.vue";
import SettingsResearchCard from "../../components/admin/settings/SettingsResearchCard.vue";
import SettingsMiscCard from "../../components/admin/settings/SettingsMiscCard.vue";

const { t } = useI18n();

const ctx = useAdminSettings();
provide(AdminSettingsKey, ctx);

onMounted(() => {
  ctx.load({ loadErrorText: t("admin.settings.loadError") as string });
});
</script>
<style scoped>
.admin-settings {
  flex: 1;
}

.floating-alert {
  position: fixed;
  top: 3rem;
  left: 55%;
  transform: translateX(-50%);
  max-width: 820px;
  width: calc(100% - 2.5rem);
  z-index: 2000;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  border-radius: 0.9rem;
}

.floating-alert :deep(.v-alert__content) {
  padding: 0.6rem 0.9rem;
}

.intro {
  margin-bottom: 1rem;
  color: #4b5563;
}

.hint {
  font-size: 0.9rem;
  color: #6b7280;
}

.cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}


</style>
