<template>
  <Transition name="fade">
    <div v-if="isVisible" class="overlay-backdrop" @click="close">
      <div class="overlay-modal" @click.stop>
        <div class="modal-header">
          <div class="title-container">
            <img v-if="flagUrl" :src="flagUrl" class="country-flag" />
            <h1 class="condensed-text">{{ countryProps?.ADMIN || 'Unknown' }}</h1>
          </div>
          <button class="close-button" @click="close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <!-- Loading & Empty States -->
          <p v-if="movies.length === 0 && !loading">No movies found for this country yet.</p>
          <p v-if="movies.length === 0 && loading">Loading movies...</p>
          
          <!-- Movie List -->
          <div class="movie-list" style="display: flex; flex-direction: column; gap: 1rem;">
            <div v-for="movie in movies" :key="movie.id" style="border-bottom: 1px solid #ccc; padding-bottom: 1rem;">
              <h3 style="margin: 0; color: #ffb74d;">{{ movie.name }} ({{ movie.date }})</h3>
              <p style="margin: 5px 0;">Rating: {{ movie.rating || 'N/A' }} / 5</p>
              <p style="margin: 0; font-size: 0.9rem;">{{ movie.description }}</p>
            </div>
          </div>
          
          <!-- "Show More" Pagination Button -->
          <button 
            v-if="hasMore && movies.length > 0" 
            @click="fetchMovies" 
            :disabled="loading"
            style="margin-top: 1.5rem; padding: 10px 20px; font-size: 1rem; cursor: pointer; border-radius: 8px;"
          >
            {{ loading ? 'Loading 25 more...' : 'Show More (25)' }}
          </button>
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
const offset = ref(0)
const loading = ref(false)
const hasMore = ref(true)

const fetchMovies = async () => {
  if (!countryName.value || loading.value || !hasMore.value) return
  
  loading.value = true
  try {
    const data = await $fetch('/api/movies', {
      params: { 
        country: countryName.value, 
        offset: offset.value 
      }
    })
    
    if (data.length < 25) {
      hasMore.value = false 
    }
    
    movies.value.push(...data) 
    offset.value += 25 
  } catch (err) {
    console.error("Failed to fetch movies", err)
  } finally {
    loading.value = false
  }
}

// Every time the overlay opens, clear the previous list and fetch the first 25
watch(() => props.isVisible, (newVal) => {
  if (newVal) {
    movies.value = []
    offset.value = 0
    hasMore.value = true
    fetchMovies()
  }
})

const close = () => {
  emit('close')
}
</script>


<style scoped>
.overlay-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-modal {
  width: 80%;
  height: 80%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 10px 50px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 40px;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.country-flag {
  height: 45px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  object-fit: cover;
}

.modal-header h1 {
  margin: 0;
  font-size: 3rem;
  color: #1a1a1a;
  line-height: 1;
}

.close-button {
  background: none;
  border: none;
  font-size: 3rem;
  line-height: 1;
  cursor: pointer;
  color: #888;
  transition: color 0.2s, transform 0.2s;
  padding: 0;
}

.close-button:hover {
  color: #333;
  transform: scale(1.1);
}

.modal-body {
  padding: 40px;
  flex: 1;
  overflow-y: auto;
  font-size: 1.2rem;
  color: #444;
}

/* Transition for smooth appearance/disappearance */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
