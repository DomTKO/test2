<template>
  <div class="actions-row">
    <button type="button" class="btn-report-trigger" @click="$emit('report')">
      {{ t("verify.report.title") }}
    </button>

    <button type="button" class="btn-confirm" @click="$emit('confirm')">
      {{ t("verify.confirmButton") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineEmits<{
  (e: "report"): void;
  (e: "confirm"): void;
}>();
</script>

<style scoped>
.actions-row {
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-report-trigger {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid #4b5563;
  background: #111827;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.btn-confirm {
  padding: 0.45rem 1rem;
  border-radius: 999px;
  border: 1px solid #059669;
  background: #00897b;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
}
</style>
