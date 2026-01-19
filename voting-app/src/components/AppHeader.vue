<template>
  <header class="app-header">
    <router-link to="/" class="brand" aria-label="Home">
      <img
        v-if="logoVisible"
        :src="logoUrl"
        alt="Logo"
        class="brand-logo"
        @error="onLogoError"
      />
    </router-link>

    <router-link to="/" class="brand-title" aria-label="Home">
      <span class="brand-main">{{ systemTitleText }}</span>
    </router-link>

    <div class="spacer"></div>

    <button
      v-if="isLoggedIn"
      type="button"
      class="logout-btn"
      @click="onLogoutClick"
    >
      {{ logoutLabel }}
    </button>

    <div class="lang-switch" role="group" aria-label="Language switch">
      <button
        class="lang-btn"
        :class="{ active: current === 'de' }"
        :aria-pressed="current === 'de'"
        @click="setLang('de')"
      >
        DE
      </button>

      <button
        class="lang-btn"
        :class="{ active: current === 'en' }"
        :aria-pressed="current === 'en'"
        @click="setLang('en')"
      >
        EN
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { api, getJson } from "../lib/api";

const router = useRouter();
const route = useRoute();
const { locale, t } = useI18n({ useScope: "global" });

// Sprache
const current = computed<"de" | "en">(() =>
  String(locale.value).toLowerCase().startsWith("en") ? "en" : "de"
);

const isLoggedIn = ref(false);

const voteLocked = ref(false);

const logoUrl = ref<string>("");
const logoVisible = ref(false);

const systemTitleHtml = ref<string>("");

const systemTitleText = computed(() => {
  const raw = (systemTitleHtml.value || "").trim();
  if (!raw) return "Voting-App";

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const txt = (doc.body.textContent || "").trim();
    return txt || "Voting-App";
  } catch {
    return "Voting-App";
  }
});

const logoutLabel = computed(() =>
  voteLocked.value
    ? (t("login.logout") as string) 
    : (t("login.abort") as string)
);

function setCookie(name: string, value: string, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

function setLang(lang: "de" | "en") {
  if (current.value === lang) return;
  (locale as any).value = lang;
  setCookie("lang", lang, 365);

  window.dispatchEvent(new CustomEvent("app-lang-changed", { detail: lang }));
}

async function checkAuth() {
  try {
    const r = await api("/auth/me");
    // @ts-ignore
    isLoggedIn.value = !!r.ok;
  } catch {
    isLoggedIn.value = false;
  }
}

function loadLogo() {
  logoUrl.value = `/api/logo?ts=${Date.now()}`;
  logoVisible.value = true;
}

function onLogoError() {
  logoVisible.value = false;
}

async function loadSystemTitle() {
  try {
    const data = await getJson<{ html?: string }>(
      `/content/systemTitle?lang=${encodeURIComponent(String(locale.value))}`
    );
    systemTitleHtml.value = (data.html || "").trim();
  } catch {
    systemTitleHtml.value = "";
  }
}

async function onLogoutClick() {
  try {
    await api("/auth/logout", { method: "POST" });
  } catch {
  }
  isLoggedIn.value = false;
  router.push({ name: "login" });
}

function handleVoteLockedEvent(ev: Event) {
  const ce = ev as CustomEvent;
  voteLocked.value = !!ce.detail;
}

onMounted(() => {
  const m = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
  const fromCookie = m
    ? decodeURIComponent(m[1]).slice(0, 2).toLowerCase()
    : "";
  if (
    (fromCookie === "de" || fromCookie === "en") &&
    fromCookie !== current.value
  ) {
    (locale as any).value = fromCookie;
  }

  checkAuth();

  loadLogo();

  loadSystemTitle();

  window.addEventListener(
    "app-voter-locked-changed",
    handleVoteLockedEvent as EventListener
  );
});

watch(
  () => route.fullPath,
  () => {
    checkAuth();
  }
);

watch(
  () => locale.value,
  () => {
    loadSystemTitle();
  }
);

watch(
  systemTitleText,
  (val) => {
    document.title = val || "Voting-App";
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener(
    "app-voter-locked-changed",
    handleVoteLockedEvent as EventListener
  );
});
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #ffffffcc;
  backdrop-filter: blur(6px);
  border-bottom: 1px solid #e5e7eb;
}

.brand {
  display: flex;
  flex-direction: column;
  text-decoration: none;
}

.brand-logo {
  height: 32px;
  margin-bottom: 0.1rem;
  object-fit: contain;
}

.brand-title {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.brand-title:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
  border-radius: 0.4rem;
}

.brand-main {
  font-weight: 800;
  font-size: 1.15rem;
  color: #111827;
  line-height: 1.1;
}

.brand-sub {
  font-weight: 500;
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1;
}

.spacer {
  flex: 1;
}

.lang-switch {
  display: flex;
  gap: 0.4rem;
}
.lang-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  padding: 0.45rem 0.75rem;
  border-radius: 0.6rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease,
    transform 0.05s ease;
}
.lang-btn:hover {
  background: #f9fafb;
}
.lang-btn:active {
  transform: translateY(1px);
}
.lang-btn.active {
  background: #00897b;
  color: #fff;
  border-color: #00695c;
  box-shadow: 0 2px 10px rgba(29, 78, 216, 0.18);
}
.lang-btn:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
}

.logout-btn {
  border: 1px solid #dc2626;
  background: #b91c1c;
  color: #ffffff;
  padding: 0.45rem 0.9rem;
  border-radius: 0.6rem;
  font-weight: 600;
  cursor: pointer;
  margin-left: 0.75rem;
  box-shadow: 0 2px 8px rgba(185, 28, 28, 0.3);
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.05s ease, box-shadow 0.15s ease;
}
.logout-btn:hover {
  background: #991b1b;
  border-color: #b91c1c;
  box-shadow: 0 3px 12px rgba(185, 28, 28, 0.45);
}
.logout-btn:active {
  transform: translateY(1px);
  box-shadow: none;
}
.logout-btn:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
}
</style>
