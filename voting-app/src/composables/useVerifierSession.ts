// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, type Ref } from "vue";

type VerifierSessionResponse = {
  id: number;
  token: string;
  tokenValidUntil: string;
  windowValidUntil: string;
};

export function useVerifierSession(opts: {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  t: any;
  verifierBaseUrl: Ref<string>;
  viteFallbackBaseUrl: string;
  onUiLog?: (action: string, extra?: Record<string, unknown>) => void;
}) {
  const verifierSessionId = ref<number | null>(null);
  const verifierToken = ref<string | null>(null);
  const tokenValidUntil = ref<string | null>(null);
  const windowValidUntil = ref<string | null>(null);
  const verifierErr = ref("");

  const qrScanned = ref(false);
  const secondsToRefresh = ref<number | null>(null);

  let refreshTimer: number | null = null;
  let logoutTimer: number | null = null;
  let statusPollTimer: number | null = null;
  let countdownTimer: number | null = null;

  const verifyUrl = computed(() => {
    const token = verifierToken.value;
    if (!token) return "";

    const base = String(
      opts.verifierBaseUrl.value || opts.viteFallbackBaseUrl || window.location.origin
    )
      .trim()
      .replace(/\/+$/, "");

    return `${base}/verify?token=${encodeURIComponent(token)}`;
  });

  function stopQrRotation() {
    if (refreshTimer !== null) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
    secondsToRefresh.value = null;
  }

  function clearAllTimers() {
    stopQrRotation();

    if (logoutTimer !== null) {
      window.clearTimeout(logoutTimer);
      logoutTimer = null;
    }
    if (statusPollTimer !== null) {
      window.clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
  }

  function getEffectiveTokenEnd(): number | null {
    const tokenEnd = tokenValidUntil.value
      ? new Date(tokenValidUntil.value).getTime()
      : null;
    const windowEnd = windowValidUntil.value
      ? new Date(windowValidUntil.value).getTime()
      : null;

    if (tokenEnd === null && windowEnd === null) return null;
    if (tokenEnd === null) return windowEnd!;
    if (windowEnd === null) return tokenEnd;
    return Math.min(tokenEnd, windowEnd);
  }

  function setupCountdownTimer() {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }

    const endInitial = getEffectiveTokenEnd();
    if (endInitial === null) {
      secondsToRefresh.value = null;
      return;
    }

    const update = () => {
      const end = getEffectiveTokenEnd();
      if (end === null) {
        secondsToRefresh.value = null;
        return;
      }
      const diffMs = end - Date.now();
      secondsToRefresh.value = diffMs <= 0 ? 0 : Math.ceil(diffMs / 1000);
    };

    update();
    countdownTimer = window.setInterval(update, 1000);
  }

  function setupStatusPollTimer() {
    if (!verifierSessionId.value) return;

    if (statusPollTimer !== null) {
      window.clearInterval(statusPollTimer);
      statusPollTimer = null;
    }

    statusPollTimer = window.setInterval(async () => {
      const id = verifierSessionId.value;
      if (!id) return;

      try {
        const r = await opts.api(`/verifier/session/${id}/status`);
        if (!r.ok) {
          if (statusPollTimer !== null) {
            window.clearInterval(statusPollTimer);
            statusPollTimer = null;
          }
          return;
        }
        const data = (await r.json()) as { lookedUp?: boolean };
        if (data.lookedUp) {
          qrScanned.value = true;
          stopQrRotation();
          if (statusPollTimer !== null) {
            window.clearInterval(statusPollTimer);
            statusPollTimer = null;
          }
        }
      } catch {
        // ignore
      }
    }, 3000);
  }

  function setupRefreshTimer() {
    if (!verifierSessionId.value) return;

    if (refreshTimer !== null) {
      window.clearInterval(refreshTimer);
      refreshTimer = null;
    }

    refreshTimer = window.setInterval(async () => {
      try {
        const id = verifierSessionId.value;
        if (!id) return;

        const r = await opts.api(`/verifier/session/${id}/refresh`, { method: "POST" });
        if (!r.ok) {
          clearAllTimers();
          verifierErr.value = opts.t("vote.verifierExpired") as string;
          return;
        }

        const data = (await r.json()) as VerifierSessionResponse;
        verifierToken.value = data.token;
        tokenValidUntil.value = data.tokenValidUntil;
        windowValidUntil.value = data.windowValidUntil;

        setupCountdownTimer();
        setupLogoutTimer();
      } catch {
        clearAllTimers();
        verifierErr.value = opts.t("vote.verifierExpired") as string;
      }
    }, 30_000);
  }

  function setupLogoutTimer() {
    if (!windowValidUntil.value) return;

    if (logoutTimer !== null) {
      window.clearTimeout(logoutTimer);
      logoutTimer = null;
    }

    const end = new Date(windowValidUntil.value).getTime();
    const diff = end - Date.now();
    if (diff <= 0) {
      clearAllTimers();
      verifierErr.value = opts.t("vote.verifierExpired") as string;
      return;
    }

    logoutTimer = window.setTimeout(() => {
      clearAllTimers();
      verifierErr.value = opts.t("vote.verifierExpired") as string;
    }, diff);
  }

  async function startSession(ballotId: number) {
    verifierErr.value = "";
    qrScanned.value = false;

    const r = await opts.api("/verifier/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ballotId }),
    });

    if (!r.ok) {
      verifierErr.value = opts.t("vote.verifierError") as string;
      return;
    }

    const data = (await r.json()) as VerifierSessionResponse;
    verifierSessionId.value = data.id;
    verifierToken.value = data.token;
    tokenValidUntil.value = data.tokenValidUntil;
    windowValidUntil.value = data.windowValidUntil;

    opts.onUiLog?.("verifier_open", { sessionId: data.id, ballotId });

    setupRefreshTimer();
    setupLogoutTimer();
    setupStatusPollTimer();
    setupCountdownTimer();
  }

  async function stopSession(reason: string) {
    clearAllTimers();

    const id = verifierSessionId.value;
    if (id) {
      try {
        await opts.api(`/verifier/session/${id}/stop`, { method: "POST" });
      } catch {
      }
      opts.onUiLog?.("verifier_close", { reason });
    }

    verifierSessionId.value = null;
    verifierToken.value = null;
    tokenValidUntil.value = null;
    windowValidUntil.value = null;
    secondsToRefresh.value = null;
    qrScanned.value = false;
  }

  async function rescanSession(ballotId: number) {
    verifierErr.value = "";
    qrScanned.value = false;

    await stopSession("rescan_clicked");
    await startSession(ballotId);
  }

  return {
    verifierSessionId,
    verifierToken,
    tokenValidUntil,
    windowValidUntil,
    verifierErr,

    qrScanned,
    secondsToRefresh,
    verifyUrl,

    startSession,
    stopSession,
    rescanSession,
    clearAllTimers,
  };
}
