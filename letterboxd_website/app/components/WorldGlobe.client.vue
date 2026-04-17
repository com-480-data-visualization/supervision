<template>
  <div>
    <div ref="globeEl" class="globe-container"></div>
    <div v-if="errorMsg" style="position: absolute; top: 10px; left: 10px; z-index: 9999; color: red; background: white; padding: 20px; border: 2px solid red;">
      <h2>FATAL ERROR:</h2>
      <pre>{{ errorMsg }}</pre>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import Globe from 'globe.gl' // This is the default import

// --- CONFIGURATION VARIABLES ---
const ROTATION_SPEED = 0.0; // Set to control globe rotation speed. Lower is slower.

const props = defineProps({
  selectedCountry: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['country-clicked'])
const globeEl = ref(null)
const errorMsg = ref('')
let globeInst = null
let currentHoverD = null

const getPolygonColor = (d) => {
  const isSelected = props.selectedCountry && props.selectedCountry.properties && props.selectedCountry.properties.ADMIN === d.properties.ADMIN
  const isHovered = currentHoverD === d
  
  if (isSelected) return 'rgba(255, 183, 77, 0.8)' // Stronger orange for selected
  if (isHovered) return 'rgba(255, 183, 77, 0.35)' // Discrete transparent orange for hover
  return '#cccccc' // Default light grey
}

onMounted(async () => {
  await nextTick() 
  
  if (!globeEl.value) return

  try {
    const res = await fetch('/datasets/custom.geo.json')
    const countries = await res.json()
    
    globeInst = Globe()(globeEl.value)
      .backgroundColor('rgba(0,0,0,0)')
      .showGlobe(true)
      .showAtmosphere(false) 
      .polygonsData(countries.features)
      .polygonsTransitionDuration(0) 
      .polygonAltitude(0.01) // Restored static altitude to guarantee stability!
      .polygonCapColor(getPolygonColor)
      .polygonSideColor(() => 'rgba(0,0,0,0)') 
      .polygonStrokeColor(() => '#444444')

    globeInst.onPolygonHover(hoverD => {
        if (props.selectedCountry) return // Disable hover interaction while zoomed in
        currentHoverD = hoverD
        
        globeInst.polygonCapColor(getPolygonColor)
        
        if (globeInst.renderer().domElement) {
          globeInst.renderer().domElement.style.cursor = hoverD ? 'pointer' : 'grab'
        }
      })
      .onPolygonClick(d => {
        if (props.selectedCountry) return // Disable new clicks while zoned in
        emit('country-clicked', d)
      });

    const material = globeInst.globeMaterial();
    if (material && material.color) {
      material.color.set('#eaeaea'); 
    }

    const resizeListener = () => {
      globeInst.width(window.innerWidth).height(window.innerHeight)
    }
    window.addEventListener('resize', resizeListener)
    resizeListener()
    
    globeInst.controls().autoRotate = true
    globeInst.controls().autoRotateSpeed = ROTATION_SPEED
    globeInst.controls().enableDamping = false 
    globeInst.controls().minDistance = 150
    globeInst.controls().maxDistance = 600

    setTimeout(() => {
      if (globeInst && globeInst.camera() && globeInst.renderer()) {
        try {
          globeInst.camera().near = 10;
          globeInst.camera().updateProjectionMatrix();
          globeInst.renderer().setPixelRatio(1);
        } catch(e) {}
      }
    }, 200);
    
    globeInst._resizeListener = resizeListener
  } catch (err) {
    console.error("Error loading Globe data:", err)
    errorMsg.value = err.toString() + '\n' + (err.stack || '')
  }
})

watch(() => props.selectedCountry, (newVal) => {
  if (globeInst) {
    globeInst.polygonCapColor(getPolygonColor)
    globeInst.controls().autoRotate = !newVal

    if (newVal && newVal.bbox) {
      const lat = (newVal.bbox[1] + newVal.bbox[3]) / 2;
      const lng = (newVal.bbox[0] + newVal.bbox[2]) / 2;
      globeInst.pointOfView({ lat, lng, altitude: 0.8 }, 1000);
    } else if (!newVal) {
      globeInst.pointOfView({ altitude: 2.0 }, 1000);
      currentHoverD = null;
      if (globeInst.renderer().domElement) {
        globeInst.renderer().domElement.style.cursor = 'grab';
      }
    }
  }
})

onUnmounted(() => {
  if (globeInst && globeInst._resizeListener) {
    window.removeEventListener('resize', globeInst._resizeListener)
  }
  if (globeInst && globeInst.renderer()) {
    globeInst.renderer().dispose()
  }
})
</script>

<style scoped>
.globe-container {
  width: 100vw;
  height: 100vh;
  cursor: grab;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  background: radial-gradient(circle at 50% 50%, #42526a 0%, #020617 100%);
}

.globe-container:active {
  cursor: grabbing;
}
</style>
