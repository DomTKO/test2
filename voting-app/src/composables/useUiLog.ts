// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import type { ComputedRef, Ref } from "vue";

type UiLogPayload = {
  action: string;
  at: string;
  ballotId: number | null;
  ballotIds: number[];
  route: string;
  page: string;
  isPair: boolean;
  selectionLocked: boolean;
  locked: boolean;
  selectedCounts: Record<number, number>;
  extra?: Record<string, unknown>;
};

export function useUiLog(opts: {
  api: (path: string, init?: RequestInit) => Promise<Response>;
  route: { fullPath: string };
  ballotId: ComputedRef<number>;
  currentBallots: Ref<Array<{ id: number }>>;
  selectedByBallot: Ref<Record<number, number[]>>;
  isPair: ComputedRef<boolean>;
  selectionLocked: Ref<boolean>;
  locked: ComputedRef<boolean>;
}) {
  const UI_LOG_ENDPOINT = "/voting/log";

  function buildSelectedCounts(): Record<number, number> {
    const counts: Record<number, number> = {};
    for (const b of opts.currentBallots.value) {
      counts[b.id] = (opts.selectedByBallot.value[b.id] ?? []).length;
    }
    return counts;
  }

  function buildUiLog(action: string, extra?: Record<string, unknown>): UiLogPayload {
    const rid = Number.isFinite(opts.ballotId.value) ? opts.ballotId.value : null;
    return {
      action,
      at: new Date().toISOString(),
      ballotId: rid,
      ballotIds: opts.currentBallots.value.map((b) => b.id),
      route: opts.route.fullPath,
      page: "voting",
      isPair: opts.isPair.value,
      selectionLocked: opts.selectionLocked.value,
      locked: opts.locked.value,
      selectedCounts: buildSelectedCounts(),
      extra,
    };
  }

  function emitUiLog(action: string, extra?: Record<string, unknown>) {
    const payload = buildUiLog(action, extra);

    window.dispatchEvent(new CustomEvent("app:voter-ui-log", { detail: payload }));

    void opts
      .api(`${UI_LOG_ENDPOINT}?ts=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
      .catch(() => {});
  }

  return { emitUiLog };
}
