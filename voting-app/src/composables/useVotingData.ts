// Dominik Tkocz — Licensed to Karlsruher Institut für Technologie (KIT). See LICENSE for terms.
import { ref, computed, type ComputedRef, type Ref } from "vue";
import { getJson } from "../lib/api";

export type Ballot = {
  id: number;
  title: string;
  description?: string | null;
  minChoices: number;
  maxChoices: number;
  ballotType?: "simple" | "first" | "second" | string;
  electionId?: number | null;
  electionName?: string | null;
};

export type Choice = { id: number; label: string; sortIndex: number };

type UseVotingDataOpts = {
  ballotId: ComputedRef<number>;
  locale: Ref<string>;
  t: any;
};

export function useVotingData(opts: UseVotingDataOpts) {
  const { ballotId, locale, t } = opts;

  const loading = ref(true);
  const err = ref("");

  const currentBallots = ref<Ballot[]>([]);
  const allBallots = ref<Ballot[]>([]);
  const votedIds = ref<Set<number>>(new Set<number>());

  const choicesByBallot = ref<Record<number, Choice[]>>({});
  const selectedByBallot = ref<Record<number, number[]>>({});

  const votingInfoHtml = ref("");

  const langParam = () => `?lang=${encodeURIComponent(String(locale.value))}`;

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

    const ballots = currentBallots.value;

    const electionName = ballots
      .map((b) => (b.electionName ?? "").trim())
      .find((n) => n.length > 0);

    if (electionName) return electionName;
    if (!isPair.value) return ballots[0].title;

    const titles = ballots.map((b) => b.title).filter(Boolean);
    return titles.join(" / ");
  });

  const hasNextBallot = computed(() =>
    allBallots.value.some((b) => !votedIds.value.has(b.id))
  );

  const validationMsgsByBallot = computed<Record<number, string>>(() => {
    const result: Record<number, string> = {};
    for (const b of currentBallots.value) {
      const n = (selectedByBallot.value[b.id] ?? []).length;
      if (n < b.minChoices) {
        result[b.id] = t("vote.needMore", { n: b.minChoices }) as string;
      } else if (n > b.maxChoices) {
        result[b.id] = t("vote.tooMany", { max: b.maxChoices }) as string;
      } else {
        result[b.id] = "";
      }
    }
    return result;
  });

  const validationMsg = computed(() => {
    for (const b of currentBallots.value) {
      const msg = validationMsgsByBallot.value[b.id];
      if (msg) return msg;
    }
    return "";
  });

  const isInvalid = computed(() => !!validationMsg.value);

  function applyToggle(ballotId: number, choiceId: number, checked: boolean) {
    const copy: Record<number, number[]> = { ...selectedByBallot.value };
    const arr = copy[ballotId] ? [...copy[ballotId]] : [];

    if (checked) {
      if (!arr.includes(choiceId)) arr.push(choiceId);
    } else {
      const idx = arr.indexOf(choiceId);
      if (idx !== -1) arr.splice(idx, 1);
    }

    copy[ballotId] = arr;
    selectedByBallot.value = copy;
  }

  function resetVotingData() {
    currentBallots.value = [];
    choicesByBallot.value = {};
    selectedByBallot.value = {};
    votingInfoHtml.value = "";
    err.value = "";
    loading.value = true;
  }

  async function loadVotingData() {
    try {
      const [list, voted] = await Promise.all([
        getJson<Ballot[]>(`/ballots${langParam()}`),
        getJson<number[]>(`/me/votes`),
      ]);

      allBallots.value = list;
      votedIds.value = new Set(voted);

      const id = ballotId.value;
      const base = list.find((x) => x.id === id) || list[0];
      if (!base) throw 0;

      let group: Ballot[] = [base];

      if (
        base.electionId &&
        (base.ballotType === "first" || base.ballotType === "second")
      ) {
        const siblings = list.filter(
          (x) =>
            x.electionId === base.electionId &&
            (x.ballotType === "first" || x.ballotType === "second")
        );

        const uniq = new Map<number, Ballot>();
        for (const b of siblings) uniq.set(b.id, b);

        group = Array.from(uniq.values()).sort((a, b) => {
          const order: Record<string, number> = { first: 0, second: 1 };
          const aOrder = order[String(a.ballotType)] ?? 99;
          const bOrder = order[String(b.ballotType)] ?? 99;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return a.id - b.id;
        });
      }

      currentBallots.value = group;

      const choicesEntries = await Promise.all(
        group.map(async (b) => {
          const ch = await getJson<Choice[]>(
            `/ballots/${b.id}/choices${langParam()}`
          );
          return [b.id, ch] as const;
        })
      );

      const newChoices: Record<number, Choice[]> = {};
      const newSelected: Record<number, number[]> = {};
      for (const [bid, ch] of choicesEntries) {
        newChoices[bid] = ch;
        newSelected[bid] = [];
      }
      choicesByBallot.value = newChoices;
      selectedByBallot.value = newSelected;

      try {
        const content = await getJson<{ html?: string }>(
          `/content/votingInfo${langParam()}`
        );
        votingInfoHtml.value = (content.html || "").trim();
      } catch {
        votingInfoHtml.value = "";
      }
    } catch {
      err.value = t("common.loadError") as string;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    err,

    currentBallots,
    allBallots,
    votedIds,

    choicesByBallot,
    selectedByBallot,
    votingInfoHtml,

    isPair,
    combinedTitle,
    hasNextBallot,

    validationMsg,
    isInvalid,

    loadVotingData,
    resetVotingData,
    applyToggle,
  };
}
