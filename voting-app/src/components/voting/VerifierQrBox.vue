<template>
  <section class="verify-box" aria-live="polite">
    <h2 class="verify-title">{{ t("vote.verifyTitle") }}</h2>
    <p class="verify-text">{{ t("vote.verifyInstruction") }}</p>

    <div class="verify-layout">
      <div class="qr-wrapper">
        <template v-if="qrScanned">
          <svg class="qr-checkmark" viewBox="0 0 52 52" aria-hidden="true">
            <circle class="qr-checkmark-circle" cx="26" cy="26" r="24" fill="none" />
            <path class="qr-checkmark-check" fill="none" d="M14 27 L22 35 L38 19" />
          </svg>
          <button type="button" class="btn-rescan" @click="$emit('rescan')">
            {{ t("vote.verifyRescan") }}
          </button>
        </template>

        <canvas v-else ref="qrCanvas"></canvas>
      </div>

      <div class="verify-meta">
        <p v-if="qrScanned" class="verify-info">
          {{ t("vote.verifyTokenStopped") }}
        </p>

        <p v-else-if="secondsToRefresh !== null" class="verify-info">
          {{ t("vote.verifyTokenRefresh", { seconds: secondsToRefresh ?? 0 }) }}
        </p>

        <p v-if="windowValidUntil">
          {{ t("vote.verifyWindowUntil") }}
          <strong>{{ new Date(windowValidUntil).toLocaleTimeString() }}</strong>
        </p>

        <p v-if="verifierErr" class="error">{{ verifierErr }}</p>

        <div v-if="verifyUrl" class="verify-url">
          <p class="verify-url-label">Link (dev):</p>
          <a :href="verifyUrl" target="_blank" rel="noopener noreferrer">{{ verifyUrl }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import QRCode from "qrcode";

const props = defineProps<{
  verifyUrl: string;
  qrScanned: boolean;
  secondsToRefresh: number | null;
  windowValidUntil: string | null;
  verifierErr: string;
}>();

defineEmits<{ (e: "rescan"): void }>();

const { t } = useI18n();

const qrCanvas = ref<HTMLCanvasElement | null>(null);

async function updateQr() {
  if (!qrCanvas.value) return;
  if (!props.verifyUrl) return;
  if (props.qrScanned) return;

  try {
    await QRCode.toCanvas(qrCanvas.value, props.verifyUrl, { width: 220, margin: 1 });
  } catch (e) {
    console.error("QR-Code render error:", e);
  }
}

onMounted(async () => {
  await nextTick();
  await updateQr();
});

watch(
  () => props.verifyUrl,
  async () => {
    await nextTick();
    await updateQr();
  }
);

watch(
  () => props.qrScanned,
  async () => {
    await nextTick();
    await updateQr();
  }
);
</script>

<style scoped>
.error {
  color: #b91c1c;
}

.verify-box {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e5e7eb;
}
.verify-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.verify-text {
  margin: 0 0 0.75rem;
  color: #4b5563;
}
.verify-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
}
.qr-wrapper {
  width: 220px;
  height: 220px;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: #ffffff;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.06);
}
.verify-meta {
  flex: 1;
  min-width: 160px;
  font-size: 0.95rem;
  color: #4b5563;
}
.verify-info {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
  color: #6b7280;
}

/* Checkmark */
.qr-checkmark {
  width: 96px;
  height: 96px;
  overflow: visible;
}
.qr-checkmark-circle {
  padding: 1px;
  stroke: #16a34a;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  animation: qr-checkmark-circle 0.6s ease-out forwards;
}
.qr-checkmark-check {
  stroke: #16a34a;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: qr-checkmark-check 0.4s ease-out 0.4s forwards;
}
@keyframes qr-checkmark-circle {
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes qr-checkmark-check {
  to {
    stroke-dashoffset: 0;
  }
}

.btn-rescan {
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  border: 1px solid #d1d5db;
  background: #f9fafb;
  color: #4b5563;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.05s ease, box-shadow 0.15s ease;
}
.btn-rescan:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
}
.btn-rescan:active {
  transform: translateY(1px);
  box-shadow: none;
}

.verify-url {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  word-break: break-all;
}
.verify-url-label {
  margin: 0 0 0.15rem;
  color: #6b7280;
}
</style>
