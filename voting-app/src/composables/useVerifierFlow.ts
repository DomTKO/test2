// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed } from "vue";
import type { ComputedRef } from "vue";
import { api, getJson } from "../lib/api";
import { toBool } from "../lib/parse";

type VerifyChoice = {
  id: number;
  ballotId?: number;
  label: string;
  isValid: boolean;
};

type VerifyResponse = {
  ballotId: number;
  ballotIds?: number[];
  choices: VerifyChoice[];
};

type Ballot = {
  id: number;
  title: string;
  description: string;
  ballotType?: "simple" | "first" | "second" | string;
  electionId?: number | null;
  electionName?: string | null;
  minChoices?: number;
  maxChoices?: number;
};

type BallotChoice = { id: number; label: string; sortIndex: number };

export function useVerifierFlow(args: {
  routeQueryToken: ComputedRef<string>;
  router: any;
  t: (key: string, params?: any) => unknown;
  locale: { value: unknown };
}) {
  const { routeQueryToken, router, t, locale } = args;

  const sessionToken = ref<string | null>(null);

  const loading = ref(true);
  const errorKey = ref<string | null>(null);
  const error = computed(() => (errorKey.value ? (t(errorKey.value) as string) : ""));

  const usernameErrorKey = ref<string | null>(null);
  const usernameError = computed(() =>
    ifKey(usernameErrorKey.value, t)
  );

  function ifKey(k: string | null, tt: any) {
    return k ? (tt(k) as string) : "";
  }

  const confirmedUsername = ref<string>("");

  const sessionEnded = ref(false);

  const choices = ref<VerifyChoice[]>([]);
  const currentBallots = ref<Ballot[]>([]);
  const allOptionsByBallot = ref<Record<number, BallotChoice[]>>({});
  const displaySelectedIdsByBallot = ref<Record<number, Set<number>>>({});

  const researchVerifierOffset = ref(false);
  const verifierReportUseSimpleView = ref(false);
  const verifierRequireUsernameConfirm = ref(false);

  function resetKeepSession() {
    choices.value = [];
    currentBallots.value = [];
    allOptionsByBallot.value = {};
    displaySelectedIdsByBallot.value = {};
    sessionEnded.value = false;
  }

  const isPair = computed(() => {
    if (currentBallots.value.length !== 2) return false;
    const [a, b] = currentBallots.value;
    if (!a.electionId || !b.electionId) return false;
    if (a.electionId !== b.electionId) return false;
    const types = new Set([a.ballotType, b.ballotType]);
    return types.has("first") && types.has("second");
  });

  const combinedTitle = computed(() => {
    if (!currentBallots.value.length) return "";

    const electionName = currentBallots.value
      .map((b) => (b.electionName ?? "").trim())
      .find((n) => n.length > 0);

    if (electionName) return electionName;

    if (!isPair.value) return currentBallots.value[0].title;
    return currentBallots.value.map((b) => b.title).filter(Boolean).join(" / ");
  });

  const optionsToShowByBallot = computed<Record<number, BallotChoice[]>>(() => {
    const map = allOptionsByBallot.value;
    if (Object.keys(map).length) return map;

    const result: Record<number, BallotChoice[]> = {};
    const primary = currentBallots.value[0];
    if (!primary) return result;

    result[primary.id] = choices.value.map((c, idx) => ({
      id: c.id,
      label: c.label,
      sortIndex: idx,
    }));
    return result;
  });

  function computeInitialDisplaySelectedIdsForAll(
    rawChoices: VerifyChoice[],
    optsByBallot: Record<number, BallotChoice[]>,
    primaryBallotId?: number
  ) {
    const base: Record<number, Set<number>> = {};

    if (currentBallots.value.length) {
      for (const b of currentBallots.value) base[b.id] = new Set<number>();
    } else if (primaryBallotId != null) {
      base[primaryBallotId] = new Set<number>();
    }

    const choiceToBallot = new Map<number, number>();
    for (const [bidStr, opts] of Object.entries(optsByBallot)) {
      const bid = Number(bidStr);
      for (const o of opts) choiceToBallot.set(o.id, bid);
    }

    for (const c of rawChoices) {
      let bid = choiceToBallot.get(c.id);

      if (bid == null && typeof c.ballotId === "number") bid = c.ballotId;
      if (bid == null && primaryBallotId != null) bid = primaryBallotId;
      if (bid == null) continue;

      if (!base[bid]) base[bid] = new Set<number>();
      base[bid].add(c.id);
    }

    if (!researchVerifierOffset.value) {
      displaySelectedIdsByBallot.value = Object.fromEntries(
        Object.entries(base).map(([k, v]) => [Number(k), new Set(v)])
      );
      return;
    }

    const shifted: Record<number, Set<number>> = {};
    for (const [bidStr, set] of Object.entries(base)) {
      const bid = Number(bidStr);
      const opts = optsByBallot[bid] ?? [];
      if (!opts.length) {
        shifted[bid] = new Set(set);
        continue;
      }

      const order = opts.map((o) => o.id);
      const idxMap = new Map<number, number>();
      order.forEach((id, idx) => idxMap.set(id, idx));

      const dest = new Set<number>();
      for (const id of set) {
        const idx = idxMap.get(id);
        if (idx === undefined) dest.add(id);
        else dest.add(order[(idx + 1) % order.length]);
      }
      shifted[bid] = dest;
    }

    displaySelectedIdsByBallot.value = shifted;
  }

  function getVisibleSelectedCount(ballotId: number): number {
    const selectedSet = displaySelectedIdsByBallot.value[ballotId] ?? new Set<number>();
    const opts =
      optionsToShowByBallot.value[ballotId] ??
      allOptionsByBallot.value[ballotId] ??
      [];

    if (!opts.length) return 0;

    const visible = new Set<number>(opts.map((o) => o.id));
    let count = 0;
    for (const id of selectedSet) if (visible.has(id)) count++;
    return count;
  }

  function isBallotValid(ballot: Ballot): boolean {
    const n = getVisibleSelectedCount(ballot.id);
    if (n === 0) return false;

    if (typeof ballot.minChoices === "number" && n < ballot.minChoices) return false;
    if (typeof ballot.maxChoices === "number" && n > ballot.maxChoices) return false;

    return true;
  }

  function toggleLocalSelection(ballotId: number, choiceId: number) {
    const cur = displaySelectedIdsByBallot.value[ballotId] ?? new Set<number>();
    const next = new Set<number>(cur);
    if (next.has(choiceId)) next.delete(choiceId);
    else next.add(choiceId);

    displaySelectedIdsByBallot.value = {
      ...displaySelectedIdsByBallot.value,
      [ballotId]: next,
    };
  }

  async function loadVerifierConfig(tokenForConfig: string) {
    try {
      const data = await getJson<{
        researchVerifierOffset?: boolean;
        verifierReportUseSimpleView?: unknown;
        verifierRequireUsernameConfirm?: unknown;
      }>(`/verifier/config/${encodeURIComponent(tokenForConfig)}`);

      researchVerifierOffset.value = !!data.researchVerifierOffset;
      verifierReportUseSimpleView.value = toBool(data.verifierReportUseSimpleView);
      verifierRequireUsernameConfirm.value = toBool(data.verifierRequireUsernameConfirm);
    } catch {
      researchVerifierOffset.value = false;
      verifierReportUseSimpleView.value = false;
      verifierRequireUsernameConfirm.value = false;
    }
  }

  async function loadWithExistingSession(opts?: { keepLoading?: boolean }) {
    const active = sessionToken.value;
    if (!active) return;

    const keepLoading = !!opts?.keepLoading;
    if (!keepLoading) loading.value = true;

    errorKey.value = null;
    resetKeepSession();

    try {
      const uname =
        verifierRequireUsernameConfirm.value && confirmedUsername.value.trim()
          ? `&username=${encodeURIComponent(confirmedUsername.value.trim())}`
          : "";

      const data = await getJson<VerifyResponse>(
        `/verifier/lookup/${encodeURIComponent(active)}?lang=${encodeURIComponent(
          String(locale.value)
        )}${uname}`
      );

      choices.value = data.choices;
      sessionEnded.value = false;

      const ballots = await getJson<Ballot[]>(
        `/ballots?lang=${encodeURIComponent(String(locale.value))}`
      );

      let group: Ballot[] = [];

      const respBallotIds =
        Array.isArray(data.ballotIds) && data.ballotIds.length
          ? Array.from(new Set(data.ballotIds))
          : null;

      if (respBallotIds) {
        const idSet = new Set(respBallotIds);
        group = ballots.filter((b) => idSet.has(b.id));
      }

      if (!group.length) {
        const base = ballots.find((b) => b.id === data.ballotId);
        if (base) {
          if (
            base.electionId &&
            (base.ballotType === "first" || base.ballotType === "second")
          ) {
            const siblings = ballots.filter(
              (x) =>
                x.electionId === base.electionId &&
                (x.ballotType === "first" || x.ballotType === "second")
            );
            const uniq = new Map<number, Ballot>();
            for (const b of siblings) uniq.set(b.id, b);
            group = Array.from(uniq.values());
          } else {
            group = [base];
          }
        }
      }

      if (!group.length) {
        group = [
          {
            id: data.ballotId,
            title: "",
            description: "",
          } as Ballot,
        ];
      }

      const order: Record<string, number> = { first: 0, second: 1 };
      group.sort((a, b) => {
        const aOrder = order[String(a.ballotType)] ?? 99;
        const bOrder = order[String(b.ballotType)] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.id - b.id;
      });

      currentBallots.value = group;

      const optsByBallot: Record<number, BallotChoice[]> = {};
      const entries = await Promise.all(
        group.map(async (b) => {
          const opts = await getJson<BallotChoice[]>(
            `/ballots/${b.id}/choices?lang=${encodeURIComponent(String(locale.value))}`
          );
          return [b.id, opts] as const;
        })
      );
      for (const [bid, opts] of entries) optsByBallot[bid] = opts;

      allOptionsByBallot.value = optsByBallot;

      computeInitialDisplaySelectedIdsForAll(data.choices, optsByBallot, data.ballotId);
    } catch {
      errorKey.value = "verify.tokenInvalid";
      sessionToken.value = null;
    } finally {
      if (!keepLoading) loading.value = false;
    }
  }

  async function claimAndLoad(username?: string) {
    const rawToken = routeQueryToken.value;

    usernameErrorKey.value = null;

    if (!rawToken) {
      loading.value = false;
      errorKey.value = "verify.noToken";
      resetKeepSession();
      sessionToken.value = null;
      confirmedUsername.value = "";
      return;
    }

    loading.value = true;
    errorKey.value = null;
    resetKeepSession();
    sessionToken.value = null;

    try {
      await loadVerifierConfig(rawToken);

      if (verifierRequireUsernameConfirm.value) {
        if (username === undefined) {
          confirmedUsername.value = "";
          loading.value = false;
          return;
        }

        const u = String(username || "").trim();
        if (!u) {
          confirmedUsername.value = "";
          usernameErrorKey.value = "verify.usernameRequired";
          loading.value = false;
          return;
        }

        confirmedUsername.value = u;
      } else {
        confirmedUsername.value = "";
      }

      const body: any = { token: rawToken };
      if (verifierRequireUsernameConfirm.value) body.username = confirmedUsername.value;

      const r = await api("/verifier/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const isJson = (r.headers.get("content-type") || "").includes("json");
      const payload = isJson ? await r.json() : null;

      if (!r.ok) {
        if (payload?.code === "USERNAME_REQUIRED") {
          usernameErrorKey.value = "verify.usernameRequired";
          return;
        }
        if (payload?.code === "USERNAME_MISMATCH") {
          usernameErrorKey.value = "verify.usernameMismatch";
          return;
        }

        errorKey.value = "verify.tokenInvalid";
        sessionToken.value = null;
        confirmedUsername.value = "";
        return;
      }

      const claim = payload as {
        id: number;
        token: string;
        tokenValidUntil: string;
        windowValidUntil: string;
      };

      sessionToken.value = claim.token;

      await loadVerifierConfig(claim.token);
      await loadWithExistingSession({ keepLoading: true });
    } catch {
      errorKey.value = "verify.tokenInvalid";
      sessionToken.value = null;
      confirmedUsername.value = "";
    } finally {
      loading.value = false;
    }
  }

  function confirmSession() {
    sessionEnded.value = true;
    sessionToken.value = null;

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }

  async function openReportRouteOrModalFallback() {
    const tkn = sessionToken.value?.trim();
    const query = tkn ? { token: tkn } : undefined;

    router
      .push({ name: "report", query })
      .catch(() => router.push({ path: "/report", query }))
      .catch(() => {
        const origin = window.location.origin;
        const hash = String(window.location.hash || "");
        const useHashRouter = hash.startsWith("#/") || hash.includes("#/");
        const base = useHashRouter ? `${origin}/#/report` : `${origin}/report`;
        window.location.href = tkn ? `${base}?token=${encodeURIComponent(tkn)}` : base;
      });
  }

  return {
    loading,
    errorKey,
    error,

    usernameErrorKey,
    usernameError,

    verifierRequireUsernameConfirm,
    confirmedUsername,

    sessionToken,
    sessionEnded,

    choices,
    currentBallots,
    allOptionsByBallot,
    displaySelectedIdsByBallot,

    researchVerifierOffset,
    verifierReportUseSimpleView,

    isPair,
    combinedTitle,
    optionsToShowByBallot,

    isBallotValid,
    toggleLocalSelection,
    claimAndLoad,
    loadWithExistingSession,
    confirmSession,
    openReportRouteOrModalFallback,
  };
}
