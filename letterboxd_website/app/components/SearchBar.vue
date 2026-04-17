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
  top: 30px;
  right: 30px;
  z-index: 100; /* Must sit above the globe canvas */
  width: 320px;
  font-family: 'Inter', sans-serif;
}

.search-bar {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
  opacity: 0.5;
  pointer-events: none;
}

.search-bar input {
  width: 100%;
  padding: 14px 40px 14px 42px; /* Pad left for icon, right for clear button */
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 15px;
  outline: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  transition: all 0.2s ease;
}

.search-bar input:focus {
  border-color: #ffb74d;
  background: rgba(15, 23, 42, 0.9);
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.clear-btn {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  opacity: 0.5;
  font-size: 14px;
  padding: 4px;
}

.clear-btn:hover {
  opacity: 0.9;
}

.search-results {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  max-height: 350px;
  overflow-y: auto;
}

.search-results li {
  padding: 14px 18px;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 15px;
}

.search-results li:hover {
  background: rgba(255, 183, 77, 0.15);
  color: #ffb74d;
  padding-left: 24px; /* Slight indent bump on hover */
}

.search-results li:last-child {
  border-bottom: none;
}
</style>
