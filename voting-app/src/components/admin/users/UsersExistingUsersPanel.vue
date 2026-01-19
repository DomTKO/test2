<template>
  <section class="panel">
    <h3 class="sub">{{ t("admin.users.existingHeading") }}</h3>

    <p v-if="loading" class="hint">{{ t("common.loading") }}</p>
    <p v-else-if="errorText" class="error">{{ errorText }}</p>
    <p v-else-if="users.length === 0" class="hint">{{ t("admin.users.noExisting") }}</p>

    <table v-else class="table">
      <thead>
        <tr>
          <th>{{ t("admin.users.colUsername") }}</th>
          <th>{{ t("admin.users.colRole") }}</th>
          <th class="col-actions">{{ t("admin.users.colActive") }}</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="u in users"
          :key="Number(u.id)"
          :class="{ 'row-inactive': u.isActive === 0 }"
        >
          <td>
            {{ u.username }}
            <span v-if="currentUserId != null && u.id === currentUserId" class="you">
              {{ t("admin.users.youSuffix") }}
            </span>
          </td>

          <td>{{ roleLabel(u.role) }}</td>

          <td class="col-actions">
            <label class="active-toggle">
              <input
                type="checkbox"
                :checked="u.isActive === 1"
                :disabled="togglingIds.has(u.id) || (currentUserId != null && u.id === currentUserId)"
                @change="(ev) => onToggle(u, ev)"
              />
              <span class="active-label">
                {{ u.isActive === 1 ? t("admin.users.activeLabel") : t("admin.users.inactiveLabel") }}
              </span>
            </label>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = defineProps<{
  users: any[];
  loading: boolean;
  errorText: string;
  currentUserId: number | null;
  togglingIds: Set<number>;
}>();

const emit = defineEmits<{
  (e: "toggleActive", payload: { user: any; checked: boolean; before: number }): void;
}>();

function roleLabel(r: any) {
  if (r === "admin") return t("admin.users.role.admin") as string;
  if (r === "showroom") return t("admin.users.role.showroom") as string;
  return t("admin.users.role.voter") as string;
}

function onToggle(user: any, ev: Event) {
  const input = ev.target as HTMLInputElement;
  const checked = !!input.checked;

  if (props.currentUserId != null && user?.id === props.currentUserId) {
    input.checked = true;
    return;
  }

  emit("toggleActive", { user, checked, before: user?.isActive === 1 ? 1 : 0 });
}
</script>

<style scoped>
.panel {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
}
.sub {
  margin: 0 0 0.5rem;
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
.col-actions {
  width: 200px;
}
.row-inactive {
  opacity: 0.6;
}
.hint {
  color: #6b7280;
}
.error {
  color: #b91c1c;
}
.you {
  margin-left: 0.25rem;
  font-size: 0.8rem;
  color: #6b7280;
}
.active-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}
.active-label {
  color: #4b5563;
}
</style>
