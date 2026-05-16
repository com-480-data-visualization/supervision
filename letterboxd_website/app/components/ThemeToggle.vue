<template>
  <button
    type="button"
    class="theme-toggle"
    role="switch"
    :aria-checked="theme === 'dark'"
    aria-label="Toggle day/night theme"
    @click="toggle"
  >
    <span :class="{ on: theme === 'light' }">Day</span>
    <span class="dot">·</span>
    <span :class="{ on: theme === 'dark' }">Night</span>
  </button>
</template>

<script setup lang="ts">
const { theme, toggle } = useTheme()
</script>

<style scoped>
.theme-toggle {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 14px;
  color: var(--ink-faint);
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
  transition: color 200ms ease;
}
.theme-toggle:hover { color: var(--ink); }
.theme-toggle .on { color: var(--ink); }
.theme-toggle .dot { color: var(--ink-faint); }
</style>
