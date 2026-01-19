<template>
  <div class="tabs">
    <button
      type="button"
      class="tab"
      :class="{ 'tab-active': activeTab === 'new' }"
      @click="emit('update:activeTab', 'new')"
    >
      {{ t("admin.users.tabNew") }}
    </button>

    <button
      type="button"
      class="tab"
      :class="{ 'tab-active': activeTab === 'existing' }"
      @click="emit('update:activeTab', 'existing')"
    >
      {{ t("admin.users.tabExisting") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{ activeTab: "new" | "existing" }>();

const emit = defineEmits<{
  (e: "update:activeTab", v: "new" | "existing"): void;
}>();
</script>

<style scoped>
.tabs {
  display: inline-flex;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: #e5e7eb;
  padding: 0.15rem;
}
.tab {
  border: 0;
  background: transparent;
  padding: 0.35rem 0.9rem;
  border-radius: 999px;
  font-size: 0.9rem;
  cursor: pointer;
}
.tab-active {
  background: #111827;
  color: #fff;
}
</style>
