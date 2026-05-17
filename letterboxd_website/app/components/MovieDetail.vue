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
            <span v-if="detail?.director" class="meta-value meta-link" @click="goTo(detail.director)">{{ detail.director }}</span>
            <span v-else class="meta-value">—</span>
          </div>
          <div class="meta-row">
            <span class="eyebrow">Cast</span>
            <span v-if="detail?.actors?.length" class="meta-value">
              <span v-for="(actor, i) in detail.actors" :key="actor">
                <span class="meta-link" @click="goTo(actor)">{{ actor }}</span>{{ i < detail.actors.length - 1 ? ', ' : '' }}
              </span>
            </span>
            <span v-else class="meta-value">—</span>
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

const router = useRouter()

const slugify = (name) => name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const goTo = (name) => router.push({ path: `/constellations/${slugify(name)}`, query: { name } })
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

.meta-link {
  cursor: pointer;
  transition: color 150ms ease;
}
.meta-link:hover { color: var(--accent); }
</style>
