<template>
  <section class="panel">
    <h3 class="sub">{{ t("admin.users.newHeading") }}</h3>

    <p v-if="accounts.length === 0" class="hint">{{ t("admin.users.noNew") }}</p>

    <div v-else class="new-actions">
      <button type="button" class="btn-secondary" @click="emit('copyAll')">
        {{ t("admin.users.copyAll") }}
      </button>
    </div>

    <table v-if="accounts.length" class="table">
      <thead>
        <tr>
          <th>{{ t("admin.users.colUsername") }}</th>
          <th>{{ t("admin.users.colPassword") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="acc in accounts" :key="String(acc.username)">
          <td>{{ acc.username }}</td>
          <td><code>{{ acc.password }}</code></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{ accounts: any[] }>();

const emit = defineEmits<{ (e: "copyAll"): void }>();
</script>

<style scoped>
.panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}
.sub {
  margin: 0 0 0.5rem;
}
.new-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}
.btn-secondary {
  padding: 0.5rem 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid #d1d5db;
  background: #ffffff;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-secondary:hover {
  background: #f3f4f6;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.table th,
.table td {
  padding: 0.5rem 0.4rem;
  border-bottom: 1px solid #e5e7eb;
}
.table th {
  text-align: left;
  font-weight: 600;
}
.hint {
  color: #6b7280;
}
</style>
