<template>
  <div>
    <h1>{{ combinedTitle }}</h1>

    <p v-if="!isPair && description">{{ description }}</p>

    <p v-if="!isPair" class="hint">
      {{ t("vote.pickBetween", { min: minChoices, max: maxChoices }) }}
    </p>

    <section v-if="votingInfoHtml" class="voting-info" v-html="votingInfoHtml"></section>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  combinedTitle: string;
  isPair: boolean;
  description: string | null;
  minChoices: number;
  maxChoices: number;
  votingInfoHtml: string;
}>();

const { t } = useI18n();
</script>

<style scoped>
.hint {
  color: #6b7280;
}

/* Voting-Info-Block */
.voting-info {
  margin: 0.75rem 0 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 0.95rem;
  color: #374151;
}
.voting-info :deep(p) {
  margin: 0 0 0.35rem;
}
.voting-info :deep(p:last-child) {
  margin-bottom: 0;
}
</style>
