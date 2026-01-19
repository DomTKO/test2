<template>
  <section class="home-box">
    <h2>{{ t("home.title") }}</h2>

    <!-- dynamischer Infoblock aus der DB -->
    <div v-if="homeHtml" class="info-block" v-html="homeHtml"></div>

    <h3 v-if="availableBallots.length" class="sub">
      {{ t("vote.availableBallots") }}
    </h3>

    <p v-if="loading">{{ t("common.loading") }}</p>
    <p v-else-if="err" class="error">{{ err }}</p>

    <ul v-else-if="availableBallots.length" class="cards">
      <li v-for="b in availableBallots" :key="b.id" class="card">
        <p v-if="b.electionName || ballotTypeLabel(b)" class="meta">
          <span v-if="b.electionName">{{ b.electionName }}</span>
          <span v-if="b.electionName && ballotTypeLabel(b)"> · </span>
          <span v-if="ballotTypeLabel(b)">{{ ballotTypeLabel(b) }}</span>
        </p>

        <h4 class="title">{{ b.title }}</h4>
        <p v-if="b.description" class="desc">{{ b.description }}</p>

        <div class="actions">
          <router-link
            :to="{ name: 'ballot', params: { id: b.id } }"
            class="btn-primary"
          >
            {{ t("vote.openBallot") }}
          </router-link>
        </div>
      </li>
    </ul>

    <template v-if="submittedBallots.length">
      <h3 class="sub">{{ t("vote.submittedBallots") }}</h3>
      <ul class="cards">
        <li v-for="b in submittedBallots" :key="b.id" class="card card-muted">
          <p v-if="b.electionName || ballotTypeLabel(b)" class="meta">
            <span v-if="b.electionName">{{ b.electionName }}</span>
            <span v-if="b.electionName && ballotTypeLabel(b)"> · </span>
            <span v-if="ballotTypeLabel(b)">{{ ballotTypeLabel(b) }}</span>
          </p>

          <h4 class="title">{{ b.title }}</h4>
          <p v-if="b.description" class="desc">{{ b.description }}</p>

          <div class="actions">
            <button class="btn-muted" disabled>
              {{ t("vote.ballotSubmitted") }}
            </button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useDynamicContent } from "../composables/useDynamicContent";
import { useHomeBallots, type Ballot } from "../composables/useHomeBallots";

const { t, locale } = useI18n();

const { html: homeHtml } = useDynamicContent({ key: "home", locale });
const { loading, err, availableBallots, submittedBallots } = useHomeBallots({
  locale,
  t,
});

function ballotTypeLabel(b: Ballot): string {
  if (b.ballotType === "pair") return "Erst- und Zweitstimme";
  if (b.ballotType === "first") return "Erststimme";
  if (b.ballotType === "second") return "Zweitstimme";
  return "";
}
</script>

<style scoped>
.home-box {
  max-width: 960px;
  margin: 1.25rem auto;
  padding: 0 1rem;
}

.info-block {
  margin: 0.75rem 0 1.25rem;
  padding: 0.9rem 1rem;
  border-radius: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  color: #111827;
  font-size: 0.95rem;
}

.info-block :deep(h1),
.info-block :deep(h2),
.info-block :deep(h3) {
  margin-top: 0.25rem;
  margin-bottom: 0.35rem;
  font-weight: 600;
}

.info-block :deep(p) {
  margin: 0.25rem 0;
}

.info-block :deep(a) {
  color: #0369a1;
  text-decoration: underline;
}

.sub {
  margin-top: 1.25rem;
}

.cards {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  border: 1px solid #e5e7eb;
  border-radius: 0.9rem;
  padding: 1rem 1.25rem;
  background: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s ease, border-color 0.15s ease,
    background 0.15s ease;
}

.card:hover {
  border-color: #00897b80;
  box-shadow: 0 6px 22px #00695d45;
  background: #fafbff;
}

.card-muted {
  opacity: 0.9;
  background: #fafafa;
  border-color: #e5e7eb;
  box-shadow: none;
}
.card-muted:hover {
  background: #f5f5f5;
  border-color: #e5e7eb;
  box-shadow: none;
}

.title {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.35rem;
}

.desc {
  color: #4b5563;
  margin: 0;
}

.meta {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  color: #6b7280;
}

.actions {
  margin-top: 0.9rem;
}

.btn-primary {
  display: block;
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 0.8rem;
  font-weight: 700;
  font-size: 1.05rem;
  text-align: center;
  text-decoration: none;
  color: #fff;
  background: #00897b;
  box-shadow: 0 4px 14px #00695d3f;
}
.btn-primary:hover {
  background: #00695c;
}
.btn-primary:active {
  transform: translateY(1px);
}

.btn-muted {
  display: block;
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 0.8rem;
  font-weight: 700;
  font-size: 1.05rem;
  text-align: center;
  color: #6b7280;
  background: #eceff1;
  border: 1px solid #e5e7eb;
  cursor: not-allowed;
}

.error {
  color: #b91c1c;
}
</style>
