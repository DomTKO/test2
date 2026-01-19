<template>
  <section class="post-actions">
    <button class="btn-primary-wide" type="button" @click="$emit('action')">
      {{ label }}
    </button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
}>();

defineEmits<{
  (e: "action"): void;
}>();
</script>

<style scoped>
.post-actions {
  margin-top: 1.5rem;
}

.btn-primary-wide {
  display: block;
  width: 100%;
  padding: 1rem 1.25rem;
  border-radius: 0.8rem;
  font-weight: 700;
  font-size: 1.05rem;
  text-align: center;
  border: 0;
  cursor: pointer;
  color: #fff;
  background: #00897b;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
}

.btn-primary-wide:hover {
  background: #00695c;
}

.btn-primary-wide:focus-visible {
  outline: 3px solid #111827;
  outline-offset: 2px;
}
</style>
