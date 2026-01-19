<template>
  <AppHeader />

  <div class="layout">
    <AdminPanel
      v-if="showAdminPanel"
      :visible="showAdminPanel"
      class="admin-column"
    />

    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/AppHeader.vue";
import AdminPanel from "./components/AdminPanel.vue";
import { getJson } from "./lib/api";

type MeResponse = {
  id: number;
  username: string;
  role: "admin" | "voter";
};

const route = useRoute();

const userRole = ref<MeResponse["role"] | null>(null);
const isAdmin = computed(() => userRole.value === "admin");

// Auf diesen Routen soll das AdminPanel sichtbar sein
const ADMIN_ROUTES = ["home", "admin-users", "admin-ballots", "admin-settings", "admin-logs", "admin-tickets"];

const showAdminPanel = computed(() => {
  const name = String(route.name || "");
  return isAdmin.value && ADMIN_ROUTES.includes(name);
});

async function loadMe() {
  try {
    const me = await getJson<MeResponse>("/auth/me");
    userRole.value = me.role;
  } catch {
    userRole.value = null;
  }
}

onMounted(loadMe);

watch(
  () => route.fullPath,
  () => {
    loadMe();
  }
);
</script>

<style scoped>
.layout {
  max-width: 1200px; 
  width: 100%;
  margin: 1.25rem auto;
  padding: 0 1rem;
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  box-sizing: border-box;
}


.admin-column {
  flex: 0 0 260px;
}

.content {
  flex: 1;
  min-width: 0;
}

@media (max-width: 768px) {
  .layout {
    flex-direction: column;
    align-items: stretch;
    max-width: 100%;
    margin: 0;
    padding: 0.75rem 1rem 1.25rem;
  }

  .admin-column {
    flex: none;
  }

  .content {
    width: 100%;
    flex: none;
  }
}
</style>
