<template>
  <div class="constellations-page">
    <ActorPicker class="page-picker" @pick="onPick" />
    <ActorGraph :slug="slug" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const route = useRoute()
const router = useRouter()

const slug = computed(() => String(route.params.slug || '') || 'margot-robbie')

function onPick(nextSlug: string) {
  router.push(`/constellations/${nextSlug}`)
}
</script>

<style scoped>
.constellations-page { position: fixed; inset: 0; }
.page-picker {
  position: absolute;
  top: 82px;
  right: 48px;
  z-index: 5;
}
</style>
