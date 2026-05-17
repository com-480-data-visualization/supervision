<template>
  <div class="actor-graph-wrapper">
    <header class="page-header">
      <div class="eyebrow">No. 003 · Constellation</div>
      <h1 class="editorial-title">
        {{ targetName }}<em class="emph">, and {{ totalFilmsWord }} films</em>
      </h1>
      <p class="lede">
        {{ collaboratorCount }} names map this constellation — the actors and directors
        who have shared a frame with them.
      </p>
    </header>

    <svg ref="svgEl" class="actor-graph-svg"></svg>

    <div
      v-if="tooltip.visible"
      class="actor-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-name">{{ tooltip.name }}</div>
      <div class="tooltip-meta">{{ tooltip.roleLabel }}</div>
      <div class="tooltip-meta">{{ tooltip.sharedLabel }}</div>
    </div>

    <footer class="page-footer">
      <div class="legend">
        <span><span class="legend-dot legend-actor"></span>Actor</span>
        <span><span class="legend-dot legend-director"></span>Director</span>
      </div>
      <div class="totals">{{ collaboratorCount }} collaborators · {{ totalFilms }} films</div>
    </footer>

    <Transition name="sidebar">
      <aside v-if="selected" class="sidebar" @click.stop>
        <button class="sidebar-close" @click="selected = null" aria-label="Close">×</button>
        <div class="sidebar-role eyebrow">{{ roleLabel(selected.role) }}</div>
        <h2 class="sidebar-name editorial-title">{{ selected.name }}</h2>
        <div class="sidebar-subtitle">{{ subtitleFor(selected) }}</div>
        <ul class="poster-grid">
          <li v-for="film in selected.films" :key="film.id" class="poster-cell">
            <div class="poster-frame">
              <img v-if="film.poster" :src="film.poster" :alt="film.name" class="poster-img" loading="lazy" />
              <div v-else class="poster-missing">No poster</div>
            </div>
            <div class="poster-caption">
              <span class="poster-year">{{ film.year ?? '—' }}</span>
              <span class="poster-title">{{ film.name }}</span>
            </div>
          </li>
        </ul>
      </aside>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import index from '../data/actorGraphs.index.json'

const props = defineProps({
  slug: { type: String, default: 'margot-robbie' },
  personName: { type: String, default: '' },
})

const graphData = ref(null)

async function loadGraph(slug, personName) {
  const entry = index.actors.find(a => a.slug === slug)
  if (entry) {
    const modules = import.meta.glob('../data/*Graph.json')
    const loader = modules[`../data/${entry.file}`]
    if (loader) { const mod = await loader(); return mod.default }
  }
  if (personName) return $fetch(`/api/graph/${encodeURIComponent(personName)}`)
  const fallback = index.actors[0]
  const modules = import.meta.glob('../data/*Graph.json')
  const mod = await modules[`../data/${fallback.file}`]()
  return mod.default
}

const svgEl = ref(null)
const tooltip = reactive({ visible: false, x: 0, y: 0, name: '', roleLabel: '', sharedLabel: '' })
const selected = ref(null)
const targetName = computed(() => graphData.value?.meta?.target ?? '')

const totalFilms = computed(() => graphData.value?.meta?.totalFilms ?? 0)
const collaboratorCount = computed(() =>
  graphData.value?.nodes?.filter(n => n.role !== 'center').length ?? 0
)

const numberWord = (n) => {
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  if (n < 0) return String(n)
  if (n < 20) return words[n]
  if (n < 100) {
    const t = tens[Math.floor(n / 10)]
    const o = n % 10
    return o === 0 ? t : `${t}-${words[o]}`
  }
  return String(n)
}

const totalFilmsWord = computed(() => `their ${numberWord(totalFilms.value)}`)

const subtitleFor = (node) => {
  if (node.role === 'center') {
    return `${node.films?.length ?? 0} films in this dataset`
  }
  const n = node.sharedFilms ?? node.films?.length ?? 0
  return `${n} shared film${n === 1 ? '' : 's'} with ${targetName.value}`
}

const handleKey = (e) => {
  if (e.key === 'Escape') selected.value = null
}

function readVar(name) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function nodeColor(role) {
  if (role === 'director') return readVar('--accent')
  return readVar('--ink')
}
function nodeOpacity(role) {
  return role === 'center' || role === 'director' ? 1 : 0.92
}
function edgeStroke() { return readVar('--rule') }
function bgColor() { return readVar('--bg') }
const EDGE_WIDTH = 1
const BBOX_PAD_X = 4
const BBOX_PAD_Y = 2

const LINK_DISTANCE_RATIO = 0.22
const CHARGE_STRENGTH = -1200
const COLLIDE_PAD = 10
const VIEWPORT_MARGIN = 12
const SIDEBAR_WIDTH = 420
const FISHEYE_RADIUS = 240
const FISHEYE_MAX_SCALE = 1.7

const roleLabel = (role) =>
  role === 'center' ? 'Lead' : role === 'director' ? 'Director' : 'Actor'

const fontSize = (node) => {
  if (node.role === 'center') return 42
  return 13 + (node.sharedFilms ?? 1) * 4
}

let simulation = null
let resizeHandler = null
let graphNodes = []
let nodeSel = null
let linkSel = null
let cursor = null

const viewport = {
  totalWidth: 0,
  effectiveWidth: 0,
  height: 0,
}

function initialPositions() {
  const width = svgEl.value.clientWidth
  const height = svgEl.value.clientHeight
  viewport.totalWidth = width
  viewport.effectiveWidth = selected.value ? width - SIDEBAR_WIDTH : width
  viewport.height = height

  const cx = viewport.effectiveWidth / 2
  const cy = height / 2
  const linkDistance = Math.min(viewport.effectiveWidth, height) * LINK_DISTANCE_RATIO
  const ringRadius = linkDistance

  const nodes = graphData.value.nodes.map((n) => ({ ...n, fisheyeScale: 1 }))
  const center = nodes.find((n) => n.role === 'center')
  const others = nodes.filter((n) => n.role !== 'center')

  center.x = cx; center.y = cy
  center.fx = cx; center.fy = cy

  others.forEach((n, i) => {
    const angle = (i / others.length) * Math.PI * 2 - Math.PI / 2
    n.x = cx + Math.cos(angle) * ringRadius
    n.y = cy + Math.sin(angle) * ringRadius
  })

  return { nodes, cx, cy, linkDistance }
}

const scaledHalfW = (n) => n.halfW * (n.fisheyeScale ?? 1)
const scaledHalfH = (n) => n.halfH * (n.fisheyeScale ?? 1)

function clipToBoxes(link) {
  const s = link.source
  const t = link.target
  const dx = t.x - s.x
  const dy = t.y - s.y

  const sHW = scaledHalfW(s), sHH = scaledHalfH(s)
  const tHW = scaledHalfW(t), tHH = scaledHalfH(t)

  const tExitSource = (dx === 0 && dy === 0)
    ? 0
    : Math.min(
        dx === 0 ? Infinity : sHW / Math.abs(dx),
        dy === 0 ? Infinity : sHH / Math.abs(dy),
      )
  const tEnterTarget = 1 - Math.min(
    dx === 0 ? Infinity : tHW / Math.abs(dx),
    dy === 0 ? Infinity : tHH / Math.abs(dy),
  )

  const tStart = Math.min(tExitSource, 1)
  const tEnd = Math.max(tEnterTarget, tStart)

  return {
    x1: s.x + dx * tStart,
    y1: s.y + dy * tStart,
    x2: s.x + dx * tEnd,
    y2: s.y + dy * tEnd,
  }
}

function clampToViewport(d) {
  if (d.role === 'center') return
  const minX = d.halfW + VIEWPORT_MARGIN
  const maxX = viewport.effectiveWidth - d.halfW - VIEWPORT_MARGIN
  const minY = d.halfH + VIEWPORT_MARGIN
  const maxY = viewport.height - d.halfH - VIEWPORT_MARGIN
  d.x = Math.max(minX, Math.min(maxX, d.x))
  d.y = Math.max(minY, Math.min(maxY, d.y))
}

function applyTransforms() {
  if (!nodeSel) return
  nodeSel.attr('transform', (d) => {
    const s = d.fisheyeScale ?? 1
    return `translate(${d.x},${d.y}) scale(${s})`
  })
  linkSel.each(function (l) {
    const c = clipToBoxes(l)
    d3.select(this)
      .attr('x1', c.x1).attr('y1', c.y1)
      .attr('x2', c.x2).attr('y2', c.y2)
  })
}

function updateFisheye() {
  for (const d of graphNodes) {
    if (!cursor) { d.fisheyeScale = 1; continue }
    const dx = d.x - cursor.x
    const dy = d.y - cursor.y
    const dist = Math.hypot(dx, dy)
    if (dist >= FISHEYE_RADIUS) { d.fisheyeScale = 1; continue }
    const t = 1 - dist / FISHEYE_RADIUS
    d.fisheyeScale = 1 + (FISHEYE_MAX_SCALE - 1) * t * t
  }
  applyTransforms()
}

function render() {
  const svg = d3.select(svgEl.value)
  svg.selectAll('*').remove()

  const { nodes, cx, cy, linkDistance } = initialPositions()
  graphNodes = nodes
  const links = graphData.value.links.map((l) => ({
    source: l.source,
    target: l.target,
  }))

  const linksG = svg.append('g').attr('class', 'links')
  const nodesG = svg.append('g').attr('class', 'nodes')

  nodeSel = nodesG
    .selectAll('g')
    .data(nodes, (d) => d.id)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', (d) => `translate(${d.x},${d.y})`)

  const textSel = nodeSel
    .append('text')
    .text((d) => d.name)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', (d) => nodeColor(d.role))
    .attr('fill-opacity', (d) => nodeOpacity(d.role))
    .attr('font-size', (d) => fontSize(d))
    .attr('font-style', (d) => d.role === 'center' ? 'italic' : 'normal')
    .attr('font-weight', 500)
    .attr('font-family', (d) => d.role === 'center' ? "Cormorant Garamond, Georgia, serif" : "Inter, system-ui, sans-serif")
    .attr('letter-spacing', '0.01em')
    .attr('paint-order', 'stroke')
    .attr('stroke', bgColor())
    .attr('stroke-width', 4)

  textSel.each(function (d) {
    const bb = this.getBBox()
    d.halfW = bb.width / 2 + BBOX_PAD_X
    d.halfH = bb.height / 2 + BBOX_PAD_Y
    d.collideR = Math.hypot(d.halfW, d.halfH) + COLLIDE_PAD
  })

  linkSel = linksG
    .selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', edgeStroke())
    .attr('stroke-width', EDGE_WIDTH)
    .attr('stroke-linecap', 'round')

  if (simulation) simulation.stop()

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links)
      .id((d) => d.id)
      .distance(linkDistance)
      .strength(0.35))
    .force('charge', d3.forceManyBody().strength(CHARGE_STRENGTH))
    .force('center', d3.forceCenter(cx, cy).strength(0.02))
    .force('collide', d3.forceCollide().radius((d) => d.collideR).iterations(2))
    .on('tick', () => {
      nodes.forEach(clampToViewport)
      if (cursor) updateFisheye()
      else applyTransforms()
    })

  svg
    .on('mousemove.fisheye', (event) => {
      const [x, y] = d3.pointer(event, svgEl.value)
      cursor = { x, y }
      updateFisheye()
    })
    .on('mouseleave.fisheye', () => {
      cursor = null
      updateFisheye()
    })

  nodeSel
    .on('mouseover', (event, d) => {
      tooltip.visible = true
      tooltip.name = d.name
      tooltip.roleLabel = roleLabel(d.role)
      tooltip.sharedLabel =
        d.role === 'center'
          ? 'Focus of this graph'
          : `${d.sharedFilms} shared film${d.sharedFilms === 1 ? '' : 's'} with ${targetName.value}`
    })
    .on('mousemove', (event) => {
      tooltip.x = event.clientX + 14
      tooltip.y = event.clientY + 14
    })
    .on('mouseout', () => {
      tooltip.visible = false
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      selected.value = d
      tooltip.visible = false
    })

  const drag = d3
    .drag()
    .filter((event, d) => d.role !== 'center')
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x; d.fy = d.y
    })
    .on('drag', (event, d) => {
      const minX = d.halfW + VIEWPORT_MARGIN
      const maxX = viewport.effectiveWidth - d.halfW - VIEWPORT_MARGIN
      const minY = d.halfH + VIEWPORT_MARGIN
      const maxY = viewport.height - d.halfH - VIEWPORT_MARGIN
      d.fx = Math.max(minX, Math.min(maxX, event.x))
      d.fy = Math.max(minY, Math.min(maxY, event.y))
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null; d.fy = null
    })

  nodeSel.call(drag)
}

function shiftForSidebar() {
  if (!simulation || !svgEl.value) return
  const width = svgEl.value.clientWidth
  const height = svgEl.value.clientHeight
  viewport.totalWidth = width
  viewport.effectiveWidth = selected.value ? Math.max(320, width - SIDEBAR_WIDTH) : width
  viewport.height = height

  const cx = viewport.effectiveWidth / 2
  const cy = height / 2
  const center = graphNodes.find((n) => n.role === 'center')
  if (center) { center.fx = cx; center.fy = cy }
  simulation.force('center', d3.forceCenter(cx, cy).strength(0.02))
  simulation.alpha(0.5).restart()
}

watch(selected, () => {
  shiftForSidebar()
})

onMounted(async () => {
  graphData.value = await loadGraph(props.slug, props.personName)
  if (graphData.value) render()
  resizeHandler = () => { if (graphData.value) render() }
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('keydown', handleKey)

  const { theme } = useTheme()
  watch(theme, () => { if (graphData.value) render() })
})

watch(() => props.slug, async (next) => {
  graphData.value = await loadGraph(next, props.personName)
  if (graphData.value) render()
})

onBeforeUnmount(() => {
  if (simulation) simulation.stop()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  window.removeEventListener('keydown', handleKey)
})
</script>

<style scoped>
.actor-graph-wrapper {
  position: fixed;
  inset: 0;
  background: var(--bg);
  font-family: var(--font-sans);
  color: var(--ink);
}

.page-header {
  position: absolute;
  top: 82px;
  left: 48px;
  z-index: 4;
  max-width: 540px;
  pointer-events: none;
}

.editorial-title {
  font-size: 42px;
}
.editorial-title .emph {
  font-style: italic;
  color: var(--accent);
}
.lede {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.45;
  max-width: 440px;
  margin: 6px 0 0;
}

.actor-graph-svg {
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}

:deep(.node) { cursor: grab; }
:deep(.node:active) { cursor: grabbing; }
:deep(.node text) { user-select: none; }

.actor-tooltip {
  position: fixed;
  pointer-events: none;
  background: var(--bg-elevated);
  color: var(--ink);
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid var(--rule);
  font-family: var(--font-sans);
  font-size: 13px;
  z-index: 1100;
  max-width: 280px;
  box-shadow: 0 6px 20px rgba(20, 17, 13, 0.12);
}
.tooltip-name { font-weight: 600; margin-bottom: 3px; }
.tooltip-meta { color: var(--ink-muted); font-size: 12px; }

.page-footer {
  position: absolute;
  bottom: 22px;
  left: 48px;
  right: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 4;
  font-family: var(--font-sans);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
  pointer-events: none;
}
.legend { display: flex; gap: 22px; }
.legend-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 8px;
}
.legend-actor { background: var(--ink); }
.legend-director { background: var(--accent); }
.totals { font-variant-numeric: tabular-nums; }

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 92vw;
  background: var(--bg-elevated);
  border-left: 1px solid var(--rule);
  padding: 96px 40px 40px;
  color: var(--ink);
  font-family: var(--font-sans);
  z-index: 1200;
  overflow-y: auto;
  box-shadow: -20px 0 60px rgba(20, 17, 13, 0.18);
}

.sidebar-close {
  position: absolute;
  top: 84px;
  right: 24px;
  font-size: 22px;
  color: var(--ink-muted);
  padding: 6px 10px;
  border-radius: 999px;
}
.sidebar-close:hover { color: var(--ink); background: var(--accent-soft); }

.sidebar-role { margin-bottom: 10px; }
.sidebar-name { font-size: 36px; margin: 0 0 8px; line-height: 1.1; }
.sidebar-subtitle {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 15px;
  color: var(--ink-muted);
  margin-bottom: 28px;
}

.poster-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 16px;
}
.poster-cell { display: flex; flex-direction: column; gap: 8px; }
.poster-frame {
  width: 100%;
  aspect-ratio: 2 / 3;
  background: var(--bg);
  border: 1px solid var(--rule);
  overflow: hidden;
  position: relative;
  border-radius: 2px;
}
.poster-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.poster-missing {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-faint);
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}
.poster-caption { display: flex; flex-direction: column; gap: 2px; font-size: 13px; line-height: 1.35; }
.poster-year { color: var(--ink-faint); font-variant-numeric: tabular-nums; font-size: 11px; letter-spacing: 0.1em; }
.poster-title { color: var(--ink); }

.sidebar-enter-active, .sidebar-leave-active { transition: transform 240ms ease, opacity 240ms ease; }
.sidebar-enter-from, .sidebar-leave-to { transform: translateX(24px); opacity: 0; }
</style>
