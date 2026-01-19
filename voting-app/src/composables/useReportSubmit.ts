// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed } from "vue";
import { api } from "../lib/api";

async function readResponseError(r: Response): Promise<string> {
  try {
    const ct = r.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await r.json();
      return j?.detail || j?.message || j?.code || JSON.stringify(j);
    }
    const txt = await r.text();
    return txt || `${r.status} ${r.statusText}`;
  } catch {
    return `${r.status} ${r.statusText}`;
  }
}

async function postTicket(payload: any): Promise<Response> {
  const endpoints = ["/tickets", "/public/tickets", "/voting/tickets"];
  if (payload?.token) endpoints.push("/verifier/tickets");

  let last: Response | null = null;

  for (const path of endpoints) {
    const r = await api(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    last = r;
    if (r.status === 404) continue;
    return r;
  }

  return last ?? new Response(null, { status: 500, statusText: "No endpoint" });
}

export function useReportSubmit(t: (k: string) => unknown) {
  const contact = ref("");
  const message = ref("");
  const submitting = ref(false);

  const errKey = ref<string | null>(null);
  const successKey = ref<string | null>(null);

  const err = computed(() => (errKey.value ? (t(errKey.value) as string) : ""));
  const success = computed(() =>
    successKey.value ? (t(successKey.value) as string) : ""
  );

  async function submitReport(args: {
    enabled: boolean;
    disabledText: string;
    context: string;
    token?: string;
    lang: string;
  }) {
    errKey.value = null;
    successKey.value = null;

    if (!args.enabled) {
      errKey.value = "verify.report.disabled";
      return;
    }

    const msg = message.value.trim();
    if (!msg) {
      errKey.value = "verify.report.validationError";
      return;
    }

    submitting.value = true;
    try {
      const payload = {
        context: args.context || "voting",
        token: args.token || undefined,
        contact: contact.value.trim() || null,
        message: msg,
        lang: args.lang,
        pageUrl: typeof window !== "undefined" ? window.location.href : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      };

      const r = await postTicket(payload);

      if (!r.ok) {
        const details = await readResponseError(r);
        console.error("report submit failed:", r.status, details);
        errKey.value = "verify.report.error";
        return;
      }

      successKey.value = "verify.report.success";
      message.value = "";
    } catch (e) {
      console.error("submitReport error:", e);
      errKey.value = "verify.report.error";
    } finally {
      submitting.value = false;
    }
  }

  return {
    contact,
    message,
    submitting,
    err,
    success,
    submitReport,
  };
}