<template>
  <div class="toolbar">
    <label class="filter-toggle">
      <input
        type="checkbox"
        :checked="modelValue"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <span>{{ t("admin.tickets.filterOpenOnly") }}</span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{ modelValue: boolean }>();

const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
}>();
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.6rem;
}

.filter-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #374151;
}
.filter-toggle input {
  cursor: pointer;
}
</style>