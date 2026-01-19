// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed } from "vue";
import type { Ref } from "vue";
import { api } from "../lib/api";

export function useVerifierReport(args: {
  sessionToken: Ref<string | null>;
  t: (key: string, params?: any) => unknown;
}) {
  const { sessionToken, t } = args;

  const showReportModal = ref(false);

  const contact = ref("");
  const message = ref("");
  const submitting = ref(false);

  const reportErrorKey = ref<string | null>(null);
  const reportSuccessKey = ref<string | null>(null);

  const reportError = computed(() =>
    reportErrorKey.value ? (t(reportErrorKey.value) as string) : ""
  );
  const reportSuccess = computed(() =>
    reportSuccessKey.value ? (t(reportSuccessKey.value) as string) : ""
  );

  function openReportModal() {
    reportErrorKey.value = null;
    reportSuccessKey.value = null;
    showReportModal.value = true;
  }

  function closeReportModal() {
    showReportModal.value = false;
  }

  async function submitReport() {
    reportErrorKey.value = null;
    reportSuccessKey.value = null;

    const currentToken = sessionToken.value;
    if (!currentToken) {
      reportErrorKey.value = "verify.noToken";
      return;
    }

    const msg = message.value.trim();
    if (!msg) {
      reportErrorKey.value = "verify.report.validationError";
      return;
    }

    submitting.value = true;
    try {
      const r = await api("/verifier/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: currentToken,
          contact: contact.value.trim() || null,
          message: msg,
        }),
      });

      if (!r.ok) {
        reportErrorKey.value = "verify.report.error";
        return;
      }

      reportSuccessKey.value = "verify.report.success";
      message.value = "";
    } catch {
      reportErrorKey.value = "verify.report.error";
    } finally {
      submitting.value = false;
    }
  }

  return {
    showReportModal,
    contact,
    message,
    submitting,
    reportError,
    reportSuccess,
    openReportModal,
    closeReportModal,
    submitReport,
  };
}
