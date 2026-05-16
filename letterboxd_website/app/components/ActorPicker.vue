<template>
  <div class="picker">
    <input
      v-model="query"
      type="text"
      class="picker-input"
      placeholder="Search an actor…"
      @focus="open = true"
      @blur="closeSoon"
    />
    <ul v-if="open && results.length" class="picker-results">
      <li
        v-for="actor in results"
        :key="actor.slug"
        class="picker-row"
        @mousedown.prevent="select(actor)"
      >
        {{ actor.name }}
      </li>
    </ul>
    <p v-if="open && query && !results.length" class="picker-empty">
      No constellation for that name (yet).
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import index from '../data/actorGraphs.index.json'

const emit = defineEmits<{ (e: 'pick', slug: string): void }>()
const query = ref('')
const open = ref(false)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return index.actors.slice(0, 8)
  return index.actors.filter(a => a.name.toLowerCase().includes(q)).slice(0, 8)
})

function select(actor: { slug: string }) {
  query.value = ''
  open.value = false
  emit('pick', actor.slug)
}

function closeSoon() {
  setTimeout(() => { open.value = false }, 120)
}
</script>

<style scoped>
.picker { position: relative; width: 260px; }
.picker-input {
  width: 100%;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid var(--rule);
  background: var(--bg-elevated);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 13px;
  outline: none;
  transition: border-color 150ms ease;
}
.picker-input::placeholder { color: var(--ink-faint); }
.picker-input:focus { border-color: var(--accent); }
.picker-results {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  background: var(--bg-elevated);
  border-radius: 10px;
  border: 1px solid var(--rule);
  box-shadow: 0 10px 24px rgba(20, 17, 13, 0.1);
  max-height: 280px;
  overflow-y: auto;
}
.picker-row {
  padding: 10px 16px;
  font-size: 13px;
  color: var(--ink);
  cursor: pointer;
  border-bottom: 1px solid var(--rule);
}
.picker-row:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.picker-row:last-child { border-bottom: none; }
.picker-empty {
  margin: 8px 0 0;
  padding: 10px 16px;
  font-size: 12px;
  font-style: italic;
  color: var(--ink-muted);
  font-family: var(--font-serif);
  background: var(--bg-elevated);
  border-radius: 10px;
  border: 1px solid var(--rule);
}
</style>
