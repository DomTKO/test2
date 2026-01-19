<template>
  <form class="form" @submit.prevent="emit('submit')">
    <div class="form-row">
      <label>
        <span class="label">{{ t("admin.users.usernamePrefixLabel") }}</span>
        <input
          :value="prefix"
          @input="emit('update:prefix', ($event.target as HTMLInputElement).value)"
          type="text"
          class="input"
          :placeholder="t('admin.users.usernamePrefixPlaceholder') as string"
        />
      </label>

      <label>
        <span class="label">{{ t("admin.users.countLabel") }}</span>
        <input
          :value="count"
          @input="emit('update:count', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="1"
          max="500"
          class="input"
        />
        <span class="help">{{ t("admin.users.countHelp") }}</span>
      </label>

      <label>
        <span class="label">{{ t("admin.users.suffixLengthLabel") }}</span>
        <select
          :value="suffixLength"
          @change="emit('update:suffixLength', Number(($event.target as HTMLSelectElement).value))"
          class="input"
        >
          <option :value="4">4</option>
          <option :value="5">5</option>
          <option :value="6">6</option>
        </select>
        <span class="help">{{ t("admin.users.suffixLengthHelp") }}</span>
      </label>
    </div>

    <div class="form-row">
      <label>
        <span class="label">{{ t("admin.users.roleLabel") }}</span>
        <select
          :value="role"
          @change="emit('update:role', ($event.target as HTMLSelectElement).value)"
          class="input"
        >
          <option value="voter">{{ t("admin.users.role.voter") }}</option>
          <option value="admin">{{ t("admin.users.role.admin") }}</option>
          <option value="showroom">{{ t("admin.users.role.showroom") }}</option>
        </select>
      </label>
    </div>

    <button class="btn-primary-wide" type="submit" :disabled="creating">
      {{ creating ? t("common.saving") : t("admin.users.createButton") }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
  prefix: string;
  count: number;
  suffixLength: number;
  role: string;
  creating: boolean;
}>();

const emit = defineEmits<{
  (e: "update:prefix", v: string): void;
  (e: "update:count", v: number): void;
  (e: "update:suffixLength", v: number): void;
  (e: "update:role", v: string): void;
  (e: "submit"): void;
}>();
</script>

<style scoped>
.form {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
}
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
}
.input {
  width: 100%;
  min-width: 0;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  font-size: 0.95rem;
}
.help {
  display: block;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.15rem;
}
.btn-primary-wide {
  margin-top: 0.5rem;
  display: block;
  width: 100%;
  padding: 0.9rem 1.2rem;
  border-radius: 0.8rem;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  color: #fff;
  background: #00897b;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}
.btn-primary-wide:hover {
  background: #00695c;
}
.btn-primary-wide:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
