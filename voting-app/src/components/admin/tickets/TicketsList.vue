<template>
  <ul class="ticket-list">
    <TicketCard
      v-for="ticket in tickets"
      :key="Number(ticket.id)"
      :ticket="ticket"
      :updating="updatingIds.has(Number(ticket.id))"
      @toggleResolved="emit('toggleResolved', ticket)"
    />
  </ul>
</template>

<script setup lang="ts">
import TicketCard from "./TicketCard.vue";

defineProps<{
  tickets: any[];
  updatingIds: Set<number>;
}>();

const emit = defineEmits<{
  (e: "toggleResolved", ticket: any): void;
}>();
</script>

<style scoped>
.ticket-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
