<template>
  <li class="ticket-card" :class="{ resolved: !!ticket.resolved }">
    <header class="ticket-header">
      <div class="ticket-header-main">
        <span
          class="status-pill"
          :class="ticket.resolved ? 'status-resolved' : 'status-open'"
        >
          {{
            ticket.resolved
              ? t("admin.tickets.statusResolved")
              : t("admin.tickets.statusOpen")
          }}
        </span>
        <span class="ticket-id">#{{ ticket.id }}</span>
      </div>

      <div class="ticket-meta">
        <span class="meta-item">
          {{ t("admin.tickets.createdAt") }}:
          {{ formatDateTime(ticket.createdAt) }}
        </span>
        <span v-if="ticket.resolved && ticket.resolvedAt" class="meta-item">
          ({{ formatDateTime(ticket.resolvedAt) }})
        </span>
      </div>
    </header>

    <div class="ticket-body">
      <p class="line">
        <strong>{{ t("admin.tickets.userLabel") }}:</strong>
        <span>{{ ticket.userName || "–" }}</span>
      </p>

      <p class="line">
        <strong>{{ t("admin.tickets.ballotLabel") }}:</strong>

        <span v-if="ticket.ballotId">
          {{ ticket.ballotTitleDe || ticket.ballotTitleEn || "#" + ticket.ballotId }}
        </span>

        <span v-else>
          {{ preferredElectionName(ticket) || ticket.electionSlug || "–" }}
        </span>
      </p>

      <p class="line" v-if="ticket.contact">
        <strong>{{ t("admin.tickets.contactLabel") }}:</strong>
        <span>{{ ticket.contact }}</span>
      </p>

      <p class="line message">
        <strong>{{ t("admin.tickets.messageLabel") }}:</strong>
        <span>{{ ticket.message }}</span>
      </p>
    </div>

    <footer class="ticket-footer">
      <button
        type="button"
        class="btn"
        :class="ticket.resolved ? 'btn-secondary' : 'btn-primary'"
        @click="emit('toggleResolved', ticket)"
        :disabled="updating"
      >
        {{
          ticket.resolved
            ? t("admin.tickets.markOpen")
            : t("admin.tickets.markResolved")
        }}
      </button>
    </footer>
  </li>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();

defineProps<{
  ticket: any;
  updating: boolean;
}>();

const emit = defineEmits<{
  (e: "toggleResolved", ticket: any): void;
}>();

function formatDateTime(iso: any): string {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function preferredElectionName(ticket: any): string | null {
  const current = String(locale.value || "de").toLowerCase();
  if (current.startsWith("en")) return ticket?.electionNameEn || ticket?.electionNameDe || null;
  return ticket?.electionNameDe || ticket?.electionNameEn || null;
}
</script>

<style scoped>
.ticket-card {
  border-radius: 0.9rem;
  border: 1px solid #e5e7eb;
  background: #ffffff;
  padding: 0.8rem 1rem;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
}

.ticket-card.resolved {
  opacity: 0.8;
  background: #f9fafb;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.ticket-header-main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ticket-id {
  font-size: 0.85rem;
  color: #6b7280;
}

.ticket-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  font-size: 0.8rem;
  color: #6b7280;
}

.meta-item {
  white-space: nowrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  font-size: 0.8rem;
  font-weight: 600;
}

.status-open {
  background: #fee2e2;
  color: #991b1b;
}

.status-resolved {
  background: #dcfce7;
  color: #166534;
}

.ticket-body {
  border-top: 1px dashed #e5e7eb;
  padding-top: 0.5rem;
  margin-top: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.line {
  font-size: 0.9rem;
  color: #111827;
}

.line strong {
  display: inline-block;
  min-width: 5.5rem;
}

.message {
  margin-top: 0.2rem;
}

.ticket-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.btn {
  border-radius: 0.7rem;
  border: 0;
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #00897b;
  color: #ffffff;
}

.btn-primary:hover {
  background: #00695c;
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover {
  background: #d1d5db;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
