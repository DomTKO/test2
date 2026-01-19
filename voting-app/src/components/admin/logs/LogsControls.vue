<template>
  <div class="controls">
    <div class="filters">
      <label class="filter">
        <span class="label">{{ t("admin.logs.filterComponentLabel") }}</span>
        <select v-model="componentModel">
          <option value="">{{ t("admin.logs.componentAll") }}</option>
          <option value="voting">{{ t("admin.logs.componentVoting") }}</option>
          <option value="verifier">{{ t("admin.logs.componentVerifier") }}</option>
          <option value="admin-api">{{ t("admin.logs.componentAdminApi") }}</option>
        </select>
      </label>

      <label class="filter">
        <span class="label">{{ t("admin.logs.filterLevelLabel") }}</span>
        <select v-model="levelModel">
          <option value="">{{ t("admin.logs.levelAll") }}</option>
          <option value="INFO">INFO</option>
          <option value="WARN">WARN</option>
          <option value="ERROR">ERROR</option>
        </select>
      </label>
    </div>

    <div class="buttons">
      <button type="button" class="btn" @click="emit('reload')" :disabled="loading">
        {{ loading ? t("common.loading") : t("admin.logs.reload") }}
      </button>

      <button
        type="button"
        class="btn btn-secondary"
        @click="emit('download')"
        :disabled="!canDownload"
      >
        {{ t("admin.logs.downloadJson") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = defineProps<{
  filterComponent: string;
  filterLevel: string;
  loading: boolean;
  canDownload: boolean;
}>();

const emit = defineEmits<{
  (e: "update:filterComponent", v: string): void;
  (e: "update:filterLevel", v: string): void;
  (e: "reload"): void;
  (e: "download"): void;
}>();

const componentModel = computed({
  get: () => props.filterComponent ?? "",
  set: (v: string) => emit("update:filterComponent", v),
});

const levelModel = computed({
  get: () => props.filterLevel ?? "",
  set: (v: string) => emit("update:filterLevel", v),
});
</script>

<style scoped>
.controls {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.filter {
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
}

.filter select {
  min-width: 130px;
  padding: 0.25rem 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-size: 0.9rem;
  background: #ffffff;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.btn {
  padding: 0.45rem 0.9rem;
  border-radius: 0.6rem;
  border: 0;
  background: #00897b;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
}

.btn:hover {
  background: #00695c;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
}

.btn:active {
  transform: translateY(1px);
  box-shadow: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
  box-shadow: none;
}

.btn-secondary {
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #111827;
  box-shadow: none;
}

.btn-secondary:hover {
  background: #f3f4f6;
}

@media (max-width: 768px) {
  .controls {
    align-items: flex-start;
  }
}
</style>
