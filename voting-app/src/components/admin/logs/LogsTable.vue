<template>
  <section class="table-wrapper">
    <table class="logs-table">
      <thead>
        <tr>
          <th>{{ t("admin.logs.colTime") }}</th>
          <th>{{ t("admin.logs.colUserId") }}</th>
          <th>{{ t("admin.logs.colComponent") }}</th>
          <th>{{ t("admin.logs.colEvent") }}</th>
          <th>{{ t("admin.logs.colLevel") }}</th>
          <th>{{ t("admin.logs.colUserAgent") }}</th>
          <th>{{ t("admin.logs.colDetails") }}</th>
        </tr>
      </thead>

      <tbody>
        <template v-for="entry in entries" :key="entry.id">
          <tr>
            <td>{{ formatDate(entry.createdAt) }}</td>
            <td>{{ entry.userId ?? "–" }}</td>
            <td>{{ entry.component }}</td>
            <td>{{ entry.eventType }}</td>
            <td>
              <span :class="['badge', 'badge-' + String(entry.level).toLowerCase()]">
                {{ entry.level }}
              </span>
            </td>
            <td class="ua-cell" :title="entry.userAgent || ''">
              {{ truncatedUserAgent(entry.userAgent) }}
            </td>
            <td>
              <button
                v-if="entry.details"
                type="button"
                class="link-btn"
                @click="$emit('toggle-details', entry.id)"
              >
                {{
                  openedDetailsId === entry.id
                    ? t("admin.logs.detailsClose")
                    : t("admin.logs.detailsShow")
                }}
              </button>
              <span v-else>–</span>
            </td>
          </tr>

          <tr v-if="openedDetailsId === entry.id && entry.details">
            <td colspan="7" class="details-cell">
              <pre>{{ prettyDetails(entry.details) }}</pre>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { LogEntry } from "../../../composables/useAdminLogs";

const { t } = useI18n();

defineProps<{
  entries: LogEntry[];
  openedDetailsId: number | null;
}>();

defineEmits<{
  (e: "toggle-details", id: number): void;
}>();

function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function truncatedUserAgent(ua: string | null): string {
  if (!ua) return "–";
  if (ua.length <= 70) return ua;
  return ua.slice(0, 67) + "…";
}

function prettyDetails(details: unknown): string {
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}
</script>

<style scoped>
.table-wrapper {
  overflow: auto;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.logs-table thead {
  background: #e5e7eb;
}

.logs-table th,
.logs-table td {
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

.ua-cell {
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.details-cell {
  background: #f3f4f6;
}

.details-cell pre {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New", monospace;
  font-size: 0.8rem;
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* bekannte Level */
.badge-info {
  background: #e0f2f1;
  color: #00695c;
}

.badge-warn {
  background: #fef9c3;
  color: #854d0e;
}

.badge-error {
  background: #fee2e2;
  color: #b91c1c;
}

/* Link-Button für Details */
.link-btn {
  border: none;
  background: none;
  padding: 0;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}
</style>
