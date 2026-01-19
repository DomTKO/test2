<!-- src/views/LoginView.vue -->
<template>
  <section class="login-box">
    <!-- dynamischer Infoblock aus der DB -->
    <section v-if="loginHtml" class="info-box" v-html="loginHtml"></section>

    <!-- Login-Card zentriert darunter -->
    <div class="login-card-wrapper">
      <div class="d-flex align-center justify-center" style="min-height: 60vh">
        <v-card elevation="2" max-width="500" class="w-100 pa-6">
          <v-card-title class="text-h6 mb-2">
            {{ $t("login.title") }}
          </v-card-title>

          <v-form @submit.prevent="submit" ref="formRef">
            <v-text-field
              v-model="username"
              :label="$t('login.username')"
              autocomplete="username"
              prepend-inner-icon="mdi-account"
              :disabled="loading"
              :rules="[rules.required]"
              autofocus
            />

            <v-text-field
              v-model="password"
              :label="$t('login.password')"
              :type="showPw ? 'text' : 'password'"
              autocomplete="current-password"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPw = !showPw"
              :disabled="loading"
              :rules="[rules.required]"
            />

            <v-alert
              v-if="errorText"
              type="error"
              density="comfortable"
              color="#FFCDD2"
              class="mb-3"
            >
              {{ errorText }}
            </v-alert>

            <v-btn
              type="submit"
              color="#004D40"
              size="large"
              :loading="loading"
              :disabled="!canSubmit || loading"
              block
            >
              {{ $t("login.submit") }}
            </v-btn>
          </v-form>
        </v-card>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { api } from "../lib/api";
import { useDynamicContent } from "../composables/useDynamicContent";

type VuetifyValidateResult = boolean | { valid: boolean };

type VuetifyForm = {
  validate?: () => Promise<VuetifyValidateResult> | VuetifyValidateResult;
};

const router = useRouter();
const { t, locale } = useI18n();

const username = ref("");
const password = ref("");
const loading = ref(false);

const errorKey = ref<string | null>(null);
const errorText = computed(() =>
  errorKey.value ? (t(errorKey.value) as string) : ""
);

const showPw = ref(false);
const formRef = ref<VuetifyForm | null>(null);

const rules = {
  required: (v: string) =>
    (!!v && v.trim().length > 0) || (t("common.required") as string),
};

const canSubmit = computed(
  () => username.value.trim().length > 0 && password.value.trim().length > 0
);

const { html: loginHtml } = useDynamicContent({
  key: "login",
  locale,
});

function isFormValid(res: VuetifyValidateResult | undefined): boolean {
  if (res === undefined) return true;

  if (typeof res === "boolean") return res;
  if (res && typeof res === "object" && "valid" in res) return !!res.valid;

  return true;
}

async function submit() {
  errorKey.value = null;

  const res = await formRef.value?.validate?.();
  if (!isFormValid(res)) return;

  loading.value = true;
  try {
    const r = await api("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value.trim(),
        password: password.value,
      }),
    });

    if (!r.ok) {
      const isJson = (r.headers.get("content-type") || "").includes("json");
      const payload = isJson ? await r.json() : null;
      const code = payload?.code;

      errorKey.value = code === "INACTIVE" ? "login.inactive" : "login.invalid";
      return;
    }

    await router.push({ name: "home" });
  } catch {
    errorKey.value = "login.invalid";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-box {
  max-width: 960px;
  margin: 1.25rem auto;
  padding: 0 1rem;
}

.info-box {
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 0.9rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
  color: #111827;
  font-size: 0.95rem;
}

.info-box :deep(h1),
.info-box :deep(h2),
.info-box :deep(h3) {
  margin-top: 0;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.info-box :deep(p) {
  margin: 0.25rem 0;
}

.info-box :deep(a) {
  color: #0369a1;
  text-decoration: underline;
}

.login-card-wrapper {
  max-width: 500px;
  margin: 0 auto;
}
</style>
