<template>
  <section class="admin-users">
    <h2>{{ t("admin.users.title") }}</h2>
    <p class="intro">{{ t("admin.users.intro") }}</p>

    <UsersBatchCreateForm
      :prefix="prefix"
      :count="count"
      :suffixLength="suffixLength"
      :role="role"
      :creating="creating"
      @update:prefix="(v) => (prefix = v)"
      @update:count="(v) => (count = v)"
      @update:suffixLength="(v) => (suffixLength = v)"
      @update:role="(v) => (role = v)"
      @submit="createBatch"
    />

    <p v-if="createErrorText" class="error">{{ createErrorText }}</p>
    <p v-if="createStatusText" class="status">{{ createStatusText }}</p>

    <UsersTabs :activeTab="activeTab" @update:activeTab="(v) => (activeTab = v)" />

    <UsersNewAccountsPanel
      v-if="activeTab === 'new'"
      :accounts="newAccounts"
      @copyAll="copyAll"
    />

    <UsersExistingUsersPanel
      v-else
      :users="existingUsers"
      :loading="existingLoading"
      :errorText="existingErrorText"
      :currentUserId="currentUserId"
      :togglingIds="togglingIds"
      @toggleActive="onToggleActive"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAdminUsers } from "../../composables/useAdminUsers";

import UsersBatchCreateForm from "../../components/admin/users/UsersBatchCreateForm.vue";
import UsersTabs from "../../components/admin/users/UsersTabs.vue";
import UsersNewAccountsPanel from "../../components/admin/users/UsersNewAccountsPanel.vue";
import UsersExistingUsersPanel from "../../components/admin/users/UsersExistingUsersPanel.vue";

const { t } = useI18n();

const {
  prefix,
  count,
  suffixLength,
  role,

  creating,
  createError,
  createStatus,
  newAccounts,

  activeTab,

  existingUsers,
  existingLoading,
  existingError,
  currentUserId,
  togglingIds,

  createBatch,
  copyAll,
  toggleActive,
} = useAdminUsers();

const createErrorText = computed(() => {
  if (!createError.value) return "";
  if (createError.value === "VALIDATION") return t("admin.users.validationError") as string;
  if (createError.value === "COPY_FAILED") return t("admin.users.copyAllError") as string;
  return t("admin.users.createError") as string;
});

const createStatusText = computed(() => {
  if (!createStatus.value) return "";
  if (createStatus.value === "COPIED") return t("admin.users.copyAllSuccess") as string;
  if (createStatus.value === "CREATED") {
    return t("admin.users.createSuccess", { n: newAccounts.value.length }) as string;
  }
  return "";
});

const existingErrorText = computed(() => {
  if (!existingError.value) return "";
  if (existingError.value === "UPDATE_FAILED") return t("admin.users.updateActiveError") as string;
  return t("admin.users.existingLoadError") as string;
});

async function onToggleActive(payload: { user: any; checked: boolean; before: number }) {
  await toggleActive(payload.user, payload.checked);

  if (existingError.value === "UPDATE_FAILED") {
    const id = Number(payload.user?.id);
    const idx = existingUsers.value.findIndex((u: any) => Number(u?.id) === id);
    if (idx !== -1) {
      existingUsers.value[idx] = { ...existingUsers.value[idx], isActive: payload.before };
    }
  }
}
</script>

<style scoped>
.admin-users {
  flex: 1;
}

.intro {
  margin-bottom: 1rem;
  color: #4b5563;
}

.error {
  color: #b91c1c;
  margin: 0.25rem 0;
}
.status {
  color: #166534;
  margin: 0.25rem 0;
}
</style>
