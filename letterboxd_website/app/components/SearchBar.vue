<template>
  <div class="search-wrapper">
    <div class="search-bar">
      <!-- Search icon inside the input optionally, or just elegant text -->
      <span class="search-icon">🔍</span>
      <input 
        v-model="query" 
        @input="onInput"
        placeholder="Search for a country..." 
        type="text"
      />
      <button v-if="query" @click="clearSearch" class="clear-btn">✕</button>
    </div>
    
    <!-- Autocomplete Results Dropdown -->
    <ul v-if="results.length > 0" class="search-results">
      <li 
        v-for="country in results" 
        :key="country.properties.ADMIN"
        @click="selectCountry(country)"
      >
        {{ country.properties.ADMIN }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const emit = defineEmits(['country-selected'])
const query = ref('')
const results = ref([])
let allCountries = []

// Fetch the geojson to build the auto-complete index
onMounted(async () => {
  try {
    const res = await fetch('/datasets/custom.geo.json')
    const data = await res.json()
    allCountries = data.features || []
  } catch (err) {
    console.error("Failed to load countries for search bar:", err)
  }
})

// Filter data as the user types
const onInput = () => {
  if (!query.value.trim()) {
    results.value = []
    return
  }
  const lowerQuery = query.value.toLowerCase()
  
  // Find countries matching the search string, take top 8
  results.value = allCountries
    .filter(c => c.properties.ADMIN && c.properties.ADMIN.toLowerCase().includes(lowerQuery))
    .slice(0, 8)
}

// When a user clicks a result
const selectCountry = (country) => {
  emit('country-selected', country) // Emits the full geojson object back to app.vue
  clearSearch()
}

// Clear the input and dropdown
const clearSearch = () => {
  query.value = ''
  results.value = []
}
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

.search-bar { position: relative; display: flex; align-items: center; }

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
  transition: border-color 150ms ease, background 150ms ease;
}

.search-bar input::placeholder { color: var(--ink-faint); }
.search-bar input:focus { border-color: var(--accent); }

.clear-btn {
  position: absolute;
  right: 14px;
  color: var(--ink-muted);
  font-size: 13px;
  padding: 4px;
}
.clear-btn:hover { color: var(--ink); }

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
  transition: background 120ms ease, color 120ms ease;
}
.search-results li:hover {
  background: var(--accent-soft);
  color: var(--accent);
}
.search-results li:last-child { border-bottom: none; }
</style>
