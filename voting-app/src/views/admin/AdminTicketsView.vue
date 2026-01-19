<template>
  <section class="admin-tickets">
    <h2>{{ t("admin.tickets.title") }}</h2>
    <p class="intro">{{ t("admin.tickets.intro") }}</p>

    <p v-if="errorText" class="error">{{ errorText }}</p>

    <TicketsToolbar v-model="showOnlyOpen" />

    <p v-if="loading" class="hint">{{ t("common.loading") }}</p>

    <p v-else-if="!filteredTickets.length" class="hint">
      {{ t("admin.tickets.empty") }}
    </p>

    <TicketsList
      v-else
      :tickets="filteredTickets"
      :updatingIds="updatingIds"
      @toggleResolved="toggleResolved"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useAdminTickets } from "../../composables/useAdminTickets";
import TicketsToolbar from "../../components/admin/tickets/TicketsToolbar.vue";
import TicketsList from "../../components/admin/tickets/TicketsList.vue";

const { t } = useI18n();

const {
  filteredTickets,
  loading,
  errorKey,
  showOnlyOpen,
  updatingIds,
  toggleResolved,
} = useAdminTickets({ defaultOpenOnly: true });

const errorText = computed(() => {
  if (!errorKey.value) return "";
  return errorKey.value === "LOAD_FAILED"
    ? (t("admin.tickets.loadError") as string)
    : (t("admin.tickets.updateError") as string);
});
</script>

<style scoped>
.admin-tickets {
  flex: 1;
}

.intro {
  margin-bottom: 1rem;
  color: #4b5563;
}

.error {
  color: #b91c1c;
  margin-bottom: 0.75rem;
}

.hint {
  font-size: 0.9rem;
  color: #6b7280;
}
</style>