<template>
  <div>
    <TabBar :activeTab="activeTab" @update:activeTab="activeTab = $event" />

    <template v-if="activeTab === 'globe'">
      <WorldGlobe :selectedCountry="selectedCountry" @country-clicked="onCountryClicked" />
      <SearchBar @country-selected="onCountryClicked" v-show="!showOverlay" />
      <CountryOverlay :country="selectedCountry" :isVisible="showOverlay" @close="closeOverlay" />
    </template>

    <template v-else-if="activeTab === 'actors'">
      <ActorGraph />
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref('globe')
const selectedCountry = ref(null)
const showOverlay = ref(false)

const onCountryClicked = (countryObj) => {
  if (!selectedCountry.value) {
    selectedCountry.value = countryObj
    // Wait for the 1000ms zoom animation before showing the overlay
    setTimeout(() => {
      // Only show if they haven't rapidly exited early. Use ADMIN to compare since Vue Proxies break object identity.
      if (selectedCountry.value && selectedCountry.value.properties.ADMIN === countryObj.properties.ADMIN) {
        showOverlay.value = true
      }
    }, 1000)
  }
}

const closeOverlay = () => {
  showOverlay.value = false
  setTimeout(() => {
    selectedCountry.value = null // This triggers the zoom out
  }, 300) // Small delay so the fade transition finishes before zoom out
}
</script>

<style>
/* Any global or app-level specific styles can go here */
</style>
