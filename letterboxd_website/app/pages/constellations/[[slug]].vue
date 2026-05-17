<template>
  <div class="constellations-page">
    <button class="back-btn" @click="router.back()">← Back</button>
    <ActorPicker class="page-picker" @pick="onPick" />
    <ActorGraph :slug="slug" :personName="personName" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug || '') || 'margot-robbie')
const personName = computed(() => String(route.query.name || ''))

function onPick(nextSlug: string) {
  router.push(`/constellations/${nextSlug}`)
}
</script>

<style scoped>
.constellations-page { position: fixed; inset: 0; }

.back-btn {
  position: absolute;
  top: 68px;
  left: 48px;
  z-index: 5;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-muted);
  transition: color 150ms ease;
}
.back-btn:hover { color: var(--ink); }

.page-picker {
  position: absolute;
  top: 82px;
  right: 48px;
  z-index: 5;
}
</style>
