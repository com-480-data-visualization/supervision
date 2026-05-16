<template>
  <div>
    <button class="back-btn" @click="emit('back')">← Back</button>

    <div class="detail-layout">
      <img v-if="detail?.poster" :src="detail.poster" class="poster-img" alt="" />
      <div v-else class="poster-placeholder"></div>

      <div class="detail-info">
        <div class="eyebrow">{{ movie.date || '—' }}{{ detail?.minute ? ' · ' + detail.minute + ' min' : '' }}</div>
        <h2 class="editorial-title detail-title">{{ movie.name }}</h2>
        <p v-if="detail?.tagline" class="detail-tagline">{{ detail.tagline }}</p>
        <div class="detail-rating">{{ movie.rating ?? '—' }} <span class="rating-max">/ 5</span></div>
        <p class="detail-desc">{{ movie.description }}</p>

        <div class="detail-meta">
          <div class="meta-row">
            <span class="eyebrow">Director</span>
            <span class="meta-value">{{ detail?.director || '—' }}</span>
          </div>
          <div class="meta-row">
            <span class="eyebrow">Cast</span>
            <span class="meta-value">{{ detail?.actors?.join(', ') || '—' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  movie: { type: Object, required: true }
})

const emit = defineEmits(['back'])

const { data: detail } = await useFetch(`/api/movie/${props.movie.id}`)
</script>

<style scoped>
.back-btn {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-muted);
  margin-bottom: 28px;
  transition: color 150ms ease;
}
.back-btn:hover { color: var(--ink); }

.detail-layout {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 32px;
}

.poster-img, .poster-placeholder {
  width: 160px;
  aspect-ratio: 2/3;
  border-radius: 6px;
  object-fit: cover;
}
.poster-placeholder { background: var(--rule); }

.detail-title {
  font-size: 36px;
  margin: 6px 0 8px;
}

.detail-tagline {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 15px;
  color: var(--ink-muted);
  margin: 0 0 12px;
}

.detail-rating {
  font-family: var(--font-serif);
  font-size: 28px;
  font-style: italic;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
  margin-bottom: 16px;
}
.rating-max {
  font-size: 16px;
  color: var(--ink-muted);
}

.detail-desc {
  font-size: 14px;
  color: var(--ink-muted);
  line-height: 1.65;
  margin-bottom: 28px;
}

.detail-meta { display: flex; flex-direction: column; gap: 16px; }

.meta-row { display: flex; flex-direction: column; gap: 4px; }

.meta-value {
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--ink);
}
</style>
