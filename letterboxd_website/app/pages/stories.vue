<template>
  <div class="stories-page">
    <div class="frame">
      <div class="eyebrow">No. 004 · Stories — Coming Soon</div>
      <h1 class="editorial-title">Four small chapters about collaboration.</h1>
      <p class="lede">A short editorial series in development. Each chapter will pick a curated collective of filmmakers — a director's troupe, a producer's stable — and walk through the films that built it.</p>
      <ul class="stub-grid">
        <li v-for="i in 4" :key="i" class="stub">
          <div class="stub-eyebrow">Chapter {{ String(i).padStart(2, '0') }}</div>
          <div class="stub-title">Forthcoming</div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.stories-page {
  position: fixed;
  inset: 0;
  padding: 96px 48px 48px;
  overflow-y: auto;
}
.frame { max-width: 880px; margin: 24px auto; }
.editorial-title { font-size: 56px; margin: 8px 0 16px; }
.lede {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 18px;
  color: var(--ink-muted);
  margin: 0 0 48px;
  max-width: 560px;
  line-height: 1.4;
}
.stub-grid {
  list-style: none; padding: 0; margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}
.stub {
  border: 1px solid var(--rule);
  padding: 28px;
  background: var(--bg-elevated);
  border-radius: 6px;
  opacity: 0.55;
}
.stub-eyebrow {
  font-size: 10px; letter-spacing: 0.28em;
  text-transform: uppercase; color: var(--accent);
  margin-bottom: 8px;
}
.stub-title {
  font-family: var(--font-serif);
  font-size: 24px;
  color: var(--ink);
}
</style>
