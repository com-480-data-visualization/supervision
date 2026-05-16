<template>
  <div class="atlas-page">
    <WorldGlobe :selectedCountry="selectedCountry" @country-clicked="onCountryClicked" />
    <SearchBar @country-selected="onCountryClicked" v-show="!showOverlay" />
    <CountryOverlay :country="selectedCountry" :isVisible="showOverlay" @close="closeOverlay" />
    <div class="page-eyebrow eyebrow">No. 001 · The Atlas</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const selectedCountry = ref(null)
const showOverlay = ref(false)

const onCountryClicked = (countryObj) => {
  if (!selectedCountry.value) {
    selectedCountry.value = countryObj
    setTimeout(() => {
      if (selectedCountry.value && selectedCountry.value.properties.ADMIN === countryObj.properties.ADMIN) {
        showOverlay.value = true
      }
    }, 1000)
  }
}

const closeOverlay = () => {
  showOverlay.value = false
  setTimeout(() => { selectedCountry.value = null }, 300)
}
</script>

<style scoped>
.atlas-page { position: fixed; inset: 0; }
.page-eyebrow {
  position: absolute;
  left: 48px;
  bottom: 22px;
  z-index: 5;
}
</style>
