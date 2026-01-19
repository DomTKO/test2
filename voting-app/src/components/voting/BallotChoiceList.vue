<template>
  <ul class="choices">
    <li v-for="c in choices" :key="c.id">
      <label class="choice" :class="{ selected: selectedIds.includes(c.id) }">
        <input
          class="sr-only"
          type="checkbox"
          :checked="selectedIds.includes(c.id)"
          :disabled="disabled"
          @change="onChange(c.id, $event)"
        />

        <span class="ballotbox" aria-hidden="true">
          <svg viewBox="0 0 24 24" class="cross">
            <circle cx="12" cy="12" r="10" class="ring" />
            <path d="M7 7 L17 17 M17 7 L7 17" class="x" />
          </svg>
        </span>

        <span class="label">{{ c.label }}</span>
      </label>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { Choice } from "../../composables/useVotingData";

const props = defineProps<{
  ballotId: number;
  choices: Choice[];
  selectedIds: number[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", payload: { ballotId: number; choiceId: number; checked: boolean }): void;
}>();

function onChange(choiceId: number, ev: Event) {
  const input = ev.target as HTMLInputElement;
  emit("toggle", { ballotId: props.ballotId, choiceId, checked: input.checked });
}
</script>

<style scoped>
.choices {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.choice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.choice:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 10px rgba(59, 130, 246, 0.08);
  background: #fafbff;
}
.choice.selected {
  border-color: #1d4ed8;
  background: #eef2ff;
}

.sr-only {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ballotbox {
  width: 32px;
  height: 32px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 32px;
  border-radius: 999px;
  transition: transform 0.15s ease;
}
.cross {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.ring {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 2.2;
  transition: stroke 0.18s ease, transform 0.18s ease;
}
.x {
  stroke: #1d4ed8;
  stroke-width: 3.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 28 28;
  stroke-dashoffset: 28;
  transition: stroke-dashoffset 0.18s ease-out;
}
.choice:hover .ring {
  stroke: #94a3b8;
}
.sr-only:focus-visible + .ballotbox {
  outline: 3px solid rgba(29, 78, 216, 0.25);
  outline-offset: 2px;
}
.sr-only:checked + .ballotbox .x {
  stroke-dashoffset: 0;
}
.sr-only:checked + .ballotbox .ring {
  stroke: #1d4ed8;
}
.sr-only:checked + .ballotbox {
  animation: pop 0.15s ease-out;
}
@keyframes pop {
  0% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
  }
}

.label {
  color: #111827;
  font-size: 1rem;
  line-height: 1.25rem;
}
</style>
