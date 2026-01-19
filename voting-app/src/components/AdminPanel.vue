<template>
  <!-- nur anzeigen, wenn vom Eltern-Component erlaubt -->
  <aside v-if="visible" class="admin-panel">
    <h3 class="heading">{{ $t("admin.panel.title") }}</h3>

    <nav class="nav">
      <RouterLink
        :to="{ name: 'admin-settings' }"
        class="link"
        active-class="link-active"
      >
        {{ $t("admin.panel.settings") }}
      </RouterLink>

      <RouterLink
        :to="{ name: 'admin-users' }"
        class="link"
        active-class="link-active"
      >
        {{ $t("admin.panel.users") }}
      </RouterLink>

      <RouterLink
        :to="{ name: 'admin-ballots' }"
        class="link"
        active-class="link-active"
      >
        {{ $t("admin.panel.ballots") }}
      </RouterLink>

      <RouterLink
        :to="{ name: 'admin-tickets' }"
        class="link"
        active-class="link-active"
      >
        {{ $t("admin.panel.tickets") }}
      </RouterLink>

      <RouterLink
        :to="{ name: 'admin-logs' }"
        class="link"
        active-class="link-active"
      >
        {{ $t("admin.panel.logs") }}
      </RouterLink>


      <Transition name="back-link">
        <RouterLink
          v-if="showBack"
          :to="{ name: 'home' }"
          class="link back-link"
        >
          {{ $t("admin.panel.back") }}
        </RouterLink>
      </Transition>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

defineProps<{
  visible?: boolean;
}>();

const route = useRoute();

const showBack = computed(() => String(route.name || "") !== "home");
</script>

<style scoped>
.admin-panel {
  width: 260px;
  padding: 1rem;
  margin-right: 1rem;
  border-radius: 0.75rem;
  background: #f8fafc;
  border: 1px solid #d1ffe7;
  box-shadow: 0 4px 10px rgba(15, 118, 110, 0.06);
}

.heading {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.link {
  display: block;
  padding: 0.45rem 0.75rem;
  border-radius: 0.6rem;
  text-decoration: none;
  color: #374151;
  font-size: 0.95rem;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.05s ease;
}

.link:hover {
  background: #daf0ef;
  color: #065e45;
}

.link-active {
  background: #00897b;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 137, 123, 0.3);
}

.back-link {
  font-weight: 500;
  margin-bottom: 0.2rem;
  background: #f3f4f6;
}

.back-link-enter-active,
.back-link-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    max-height 0.18s ease,
    margin 0.18s ease,
    padding 0.18s ease;
}

.back-link-enter-from,
.back-link-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.back-link-enter-to,
.back-link-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 40px;
  margin-bottom: 0.2rem;
}

@media (max-width: 768px) {
  .admin-panel {
    width: 100%;
    padding: 1rem;
    margin-right: 0;
    border-radius: 0.75rem;
    background: #f9fafb;
    border: 1px solid #d1ffe7;
  }
}
</style>
