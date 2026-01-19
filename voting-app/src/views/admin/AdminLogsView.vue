<template>
  <section class="admin-logs">
    <header class="logs-header">
      <h2>{{ t("admin.logs.title") }}</h2>
      <p class="intro">{{ t("admin.logs.intro") }}</p>

      <LogsControls
        v-model:filterComponent="filterComponent"
        v-model:filterLevel="filterLevel"
        :loading="loading"
        :canDownload="logs.length > 0"
        @reload="load"
        @download="downloadJson"
      />

      <p v-if="error" class="error">{{ error }}</p>
    </header>

    <LogsTable
      v-if="filteredLogs.length > 0"
      :entries="filteredLogs"
      :openedDetailsId="openedDetailsId"
      @toggle-details="toggleDetails"
    />

    <p v-else-if="!loading" class="empty">
      {{ t("admin.logs.empty") }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import LogsControls from "../../components/admin/logs/LogsControls.vue";
import LogsTable from "../../components/admin/logs/LogsTable.vue";
import { useAdminLogs } from "../../composables/useAdminLogs";

const { t } = useI18n();

const {
  logs,
  loading,
  error,
  filterComponent,
  filterLevel,
  openedDetailsId,
  filteredLogs,
  load,
  toggleDetails,
  downloadJson,
} = useAdminLogs({ limit: 200, autoLoad: true });
</script>

<style scoped>
.admin-logs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.logs-header {
  margin-bottom: 0.5rem;
}

.logs-header h2 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
  font-weight: 600;
}

.intro {
  margin-bottom: 1rem;
  color: #4b5563;
  font-size: 0.95rem;
}

.error {
  margin-top: 0.5rem;
  color: #b91c1c;
  font-size: 0.9rem;
}

.empty {
  font-size: 0.9rem;
  color: #6b7280;
}
</style>
