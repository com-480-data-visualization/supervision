<template>
  <Transition name="fade">
    <div v-if="isVisible" class="overlay-backdrop" @click="close">
      <div class="overlay-modal" @click.stop>
        <header class="modal-header">
          <div class="title-row">
            <img v-if="flagUrl" :src="flagUrl" class="country-flag" alt="" />
            <div class="title-stack">
              <div class="eyebrow">Films from</div>
              <h1 class="editorial-title">{{ countryProps?.ADMIN || 'Unknown' }}</h1>
            </div>
          </div>
          <div class="header-right">
            <div class="sort-controls">
              <span class="sort-label">Sort</span>
              <button class="sort-btn" :class="{ active: sortField === 'rating' }" @click="setSort('rating')">Rating {{ sortField === 'rating' ? (sortDir === 'desc' ? '↓' : '↑') : '↓' }}</button>
              <button class="sort-btn" :class="{ active: sortField === 'date' }"   @click="setSort('date')">Year {{ sortField === 'date' ? (sortDir === 'desc' ? '↓' : '↑') : '↓' }}</button>
            </div>
            <button class="close-button" @click="close" aria-label="Close">×</button>
          </div>
        </header>

        <div class="modal-body">
          <p v-if="movies.length === 0 && !loading" class="empty">No movies found for this country yet.</p>
          <p v-if="movies.length === 0 && loading" class="empty">Loading films…</p>

          <ol class="movie-list">
            <li v-for="movie in sortedMovies" :key="movie.id" class="movie-row">
              <div class="movie-year">{{ movie.date || '—' }}</div>
              <div class="movie-meta">
                <div class="movie-title">{{ movie.name }}</div>
                <div class="movie-desc">{{ movie.description }}</div>
              </div>
              <div class="movie-rating">{{ movie.rating ?? '—' }}</div>
            </li>
          </ol>

          <button
            v-if="hasMore && movies.length > 0"
            class="more-button"
            :disabled="loading"
            @click="fetchMovies"
          >{{ loading ? 'Loading…' : 'Show 25 more' }}</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  country: { type: Object, default: null },
  isVisible: { type: Boolean, default: false }
})

const emit = defineEmits(['close'])

const countryProps = computed(() => props.country?.properties)
const countryName = computed(() => countryProps.value?.ADMIN)

const flagUrl = computed(() => {
  if (!countryProps.value) return null
  let isoCode = countryProps.value.ISO_A2
  if (!isoCode || isoCode === '-99') isoCode = countryProps.value.WB_A2
  if (!isoCode || isoCode === '-99') isoCode = countryProps.value.FIPS_10_
  if (!isoCode || isoCode === '-99') return null 
  return `https://flagcdn.com/${isoCode.toLowerCase()}.svg`
})

// --- MOVIE FETCHING LOGIC ---
const movies = ref([])
const afterRank = ref(0)
const loading = ref(false)
const hasMore = ref(true)

const fetchMovies = async () => {
  if (!countryName.value || loading.value || !hasMore.value) return

  loading.value = true
  try {
    const res = await $fetch('/api/movies', {
      params: {
        country: countryName.value,
        afterRank: afterRank.value,
      },
    })

    movies.value.push(...res.rows)
    hasMore.value = res.hasMore
    if (res.rows.length > 0) {
      afterRank.value = res.rows[res.rows.length - 1].rank
    }
  } catch (err) {
    console.error("Failed to fetch movies", err)
  } finally {
    loading.value = false
  }
}

watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    movies.value = []
    afterRank.value = 0
    hasMore.value = true
    fetchMovies()
  }
})

const close = () => {
  emit('close')
}

// --- SORT LOGIC ---
const sortField = ref('rating')
const sortDir = ref('desc')

const setSort = (field) => {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortField.value = field
    sortDir.value = 'desc'
  }
}

const sortedMovies = computed(() => {
  return [...movies.value].sort((a, b) => {
    const av = a[sortField.value] ?? 0
    const bv = b[sortField.value] ?? 0
    return sortDir.value === 'desc' ? bv - av : av - bv
  })
})
</script>


<style scoped>
.overlay-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(20, 17, 13, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px 24px;
}

.overlay-modal {
  width: min(960px, 92vw);
  max-height: calc(100vh - 120px);
  background: var(--bg-elevated);
  border: 1px solid var(--rule);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(20, 17, 13, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28px 40px;
  border-bottom: 1px solid var(--rule);
}

.title-row { display: flex; align-items: center; gap: 24px; }

.country-flag {
  height: 44px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(20, 17, 13, 0.12);
  object-fit: cover;
}

.title-stack .eyebrow { margin-bottom: 4px; }
.title-stack .editorial-title { font-size: 40px; }

.close-button {
  font-size: 28px;
  color: var(--ink-muted);
  line-height: 1;
  padding: 4px 10px;
  border-radius: 999px;
  transition: color 150ms ease, background 150ms ease;
}
.close-button:hover { color: var(--ink); background: var(--accent-soft); }

.modal-body {
  padding: 24px 40px 32px;
  overflow-y: auto;
  flex: 1;
}

.empty {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--ink-muted);
  text-align: center;
  margin: 48px 0;
}

.movie-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
}

.movie-row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: baseline;
  gap: 20px;
  padding: 16px 0;
  border-bottom: 1px solid var(--rule);
}
.movie-row:last-child { border-bottom: none; }

.movie-year {
  font-family: var(--font-sans);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.08em;
  color: var(--ink-muted);
}

.movie-title {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 2px;
}
.movie-desc {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.movie-rating {
  font-family: var(--font-serif);
  font-size: 18px;
  font-style: italic;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.more-button {
  margin-top: 28px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 6px 2px;
  border-bottom: 1px solid var(--accent);
}
.more-button:disabled { color: var(--ink-faint); border-color: var(--ink-faint); cursor: wait; }

.header-right { display: flex; align-items: center; gap: 16px; }

.sort-controls { display: flex; align-items: center; gap: 6px; }

.sort-label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-right: 2px;
}

.sort-btn {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ink-muted);
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--rule);
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease;
}
.sort-btn:hover { color: var(--ink); background: var(--accent-soft); }
.sort-btn.active { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }

/* Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
