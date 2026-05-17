<template>
  <div class="search-wrapper">
    <div class="search-bar">
      <span class="search-icon">🔍</span>
      <input
        v-model="query"
        @input="onInput"
        @keydown="onKeydown"
        placeholder="Search country or movie..."
        type="text"
      />
      <button v-if="query" @click="clearSearch" class="clear-btn">✕</button>
    </div>

    <ul
      v-if="results.length > 0 || movieResults.length > 0"
      class="search-results"
    >
      <template v-if="results.length > 0">
        <li class="results-label" v-if="movieResults.length > 0">Countries</li>
        <li
          v-for="(country, i) in results"
          :key="country.properties.ADMIN"
          :class="{ active: activeIndex === i }"
          @click="selectCountry(country)"
          @mouseenter="activeIndex = i"
        >
          {{ country.properties.ADMIN }}
        </li>
      </template>
      <template v-if="movieResults.length > 0">
        <li class="results-label">Films</li>
        <li
          v-for="(movie, i) in movieResults"
          :key="movie.id"
          :class="{ active: activeIndex === results.length + i }"
          @click="selectMovie(movie)"
          @mouseenter="activeIndex = results.length + i"
          class="movie-result"
        >
          <span class="result-title">{{ movie.name }}</span>
          <span class="result-meta"
            >{{ movie.date ? Math.trunc(movie.date) : '—'
            }}{{ movie.director ? ' · ' + movie.director : '' }}</span
          >
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const emit = defineEmits(['country-selected', 'movie-selected']);
const query = ref('');
const results = ref([]);
const movieResults = ref([]);
const activeIndex = ref(-1);
let allCountries = [];
let searchTimer = null;

onMounted(async () => {
  try {
    const res = await fetch('/datasets/custom.geo.json');
    const data = await res.json();
    allCountries = data.features || [];
  } catch (err) {
    console.error('Failed to load countries for search bar:', err);
  }
});

const totalResults = () => results.value.length + movieResults.value.length;

const onKeydown = (e) => {
  const total = totalResults();
  if (!total) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, total - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const idx = activeIndex.value >= 0 ? activeIndex.value : 0;
    if (idx < results.value.length) selectCountry(results.value[idx]);
    else selectMovie(movieResults.value[idx - results.value.length]);
  } else if (e.key === 'Escape') {
    clearSearch();
  }
};

const onInput = () => {
  activeIndex.value = -1;
  const q = query.value.trim();
  if (!q) {
    results.value = [];
    movieResults.value = [];
    return;
  }

  results.value = allCountries
    .filter(
      (c) =>
        c.properties.ADMIN &&
        c.properties.ADMIN.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 5);

  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    if (q.length < 2) {
      movieResults.value = [];
      return;
    }
    const res = await $fetch('/api/search', { params: { q } });
    movieResults.value = res.movies || [];
  }, 250);
};

const selectCountry = (country) => {
  emit('country-selected', country);
  clearSearch();
};

const selectMovie = (movie) => {
  const feature = allCountries.find(
    (c) =>
      c.properties.ADMIN?.toLowerCase() === String(movie.country).toLowerCase(),
  );
  emit('movie-selected', { movie, country: feature || null });
  clearSearch();
};

const clearSearch = () => {
  query.value = '';
  results.value = [];
  movieResults.value = [];
  activeIndex.value = -1;
};
</script>

<style scoped>
.search-wrapper {
  position: absolute;
  top: 84px; /* below the 60px-ish nav */
  right: 36px;
  z-index: 100;
  width: 320px;
  font-family: var(--font-sans);
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 14px;
  color: var(--ink-faint);
  pointer-events: none;
}

.search-bar input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border-radius: 999px;
  border: 1px solid var(--rule);
  background: var(--bg-elevated);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 14px;
  outline: none;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.search-bar input::placeholder {
  color: var(--ink-faint);
}
.search-bar input:focus {
  border-color: var(--accent);
}

.clear-btn {
  position: absolute;
  right: 14px;
  color: var(--ink-muted);
  font-size: 13px;
  padding: 4px;
}
.clear-btn:hover {
  color: var(--ink);
}

.search-results {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  background: var(--bg-elevated);
  border-radius: 12px;
  border: 1px solid var(--rule);
  box-shadow: 0 12px 28px rgba(20, 17, 13, 0.08);
  max-height: 350px;
  overflow-y: auto;
}

.search-results li {
  padding: 12px 18px;
  color: var(--ink);
  cursor: pointer;
  border-bottom: 1px solid var(--rule);
  font-size: 14px;
  transition:
    background 120ms ease,
    color 120ms ease;
}
.search-results li:hover,
.search-results li.active {
  background: var(--accent-soft);
  color: var(--accent);
}
.search-results li:last-child {
  border-bottom: none;
}

.results-label {
  padding: 8px 18px 4px;
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-faint);
  cursor: default;
  background: none;
}
.results-label:hover {
  background: none;
  color: var(--ink-faint);
}

.movie-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.result-title {
  font-size: 14px;
  color: var(--ink);
}
.result-meta {
  font-size: 11px;
  color: var(--ink-faint);
}
</style>
