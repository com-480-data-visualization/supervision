<template>
  <div class="tab-bar">
    <button
      class="tab"
      :class="{ active: activeTab === 'globe' }"
      @click="$emit('update:activeTab', 'globe')"
    >
      🌍 Globe
    </button>
    <button
      class="tab"
      :class="{ active: activeTab === 'actors' }"
      @click="$emit('update:activeTab', 'actors')"
    >
      🎭 Actor Graph
    </button>
  </div>
</template>

<script setup>
defineProps({
  activeTab: { type: String, required: true },
})
defineEmits(['update:activeTab'])
</script>

<style scoped>
.tab-bar {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(20, 20, 30, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  font-family: system-ui, -apple-system, sans-serif;
}

.tab {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 999px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}

.tab:hover {
  color: white;
}

.tab.active {
  background: rgba(255, 255, 255, 0.14);
  color: white;
}
</style>
