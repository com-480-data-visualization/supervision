<template>
  <div class="actor-graph-wrapper">
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

    <div class="legend">
      <div class="legend-row">
        <span class="legend-dot legend-actor"></span> Co-actor
      </div>
      <div class="legend-row">
        <span class="legend-dot legend-director"></span> Director
      </div>
    </div>

    <Transition name="sidebar">
      <aside v-if="selected" class="sidebar" @click.stop>
        <button class="sidebar-close" @click="selected = null" aria-label="Close">✕</button>
        <div class="sidebar-role">{{ roleLabel(selected.role) }}</div>
        <h2 class="sidebar-name" :style="{ color: COLORS[selected.role] }">{{ selected.name }}</h2>
        <div class="sidebar-subtitle">{{ subtitleFor(selected) }}</div>
        <ul class="poster-grid">
          <li v-for="film in selected.films" :key="film.id" class="poster-cell">
            <div class="poster-frame">
              <img
                v-if="film.poster"
                :src="film.poster"
                :alt="film.name"
                class="poster-img"
                loading="lazy"
              />
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
import { ref, reactive, watch, onMounted, onBeforeUnmount } from 'vue'
import * as d3 from 'd3'
import margotRobbieGraph from '../data/margotRobbieGraph.json'

const svgEl = ref(null)
const tooltip = reactive({ visible: false, x: 0, y: 0, name: '', roleLabel: '', sharedLabel: '' })
const selected = ref(null)
const targetName = margotRobbieGraph.meta?.target ?? 'Margot Robbie'

const subtitleFor = (node) => {
  if (node.role === 'center') {
    return `${node.films?.length ?? 0} films in this dataset`
  }
  const n = node.sharedFilms ?? node.films?.length ?? 0
  return `${n} shared film${n === 1 ? '' : 's'} with ${targetName}`
}

const handleKey = (e) => {
  if (e.key === 'Escape') selected.value = null
}

const COLORS = {
  center: '#E8E4D9',
  actor: '#8892A6',
  director: '#C9A36A',
}

const EDGE_STROKE = 'rgba(255, 255, 255, 0.18)'
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
  if (node.role === 'center') return 34
  return 13 + (node.sharedFilms ?? 1) * 5
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

  const nodes = margotRobbieGraph.nodes.map((n) => ({ ...n, fisheyeScale: 1 }))
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
  const links = margotRobbieGraph.links.map((l) => ({
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
    .attr('fill', (d) => COLORS[d.role])
    .attr('font-size', (d) => fontSize(d))
    .attr('font-weight', (d) => (d.role === 'center' ? 700 : 500))
    .attr('font-family', "'Inconsolata', 'Consolas', ui-monospace, monospace")
    .attr('letter-spacing', '0.01em')
    .attr('paint-order', 'stroke')
    .attr('stroke', '#0B0D12')
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
    .attr('stroke', EDGE_STROKE)
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
          : `${d.sharedFilms} shared film${d.sharedFilms === 1 ? '' : 's'} with ${targetName}`
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

onMounted(() => {
  render()
  resizeHandler = () => {
    render()
  }
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('keydown', handleKey)
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
  background: radial-gradient(ellipse at center, #161922 0%, #0B0D12 100%);
  font-family: 'Inconsolata', 'Consolas', ui-monospace, monospace;
}

.actor-graph-svg {
  width: 100%;
  height: 100%;
  display: block;
  cursor: default;
}

:deep(.node) {
  cursor: grab;
}

:deep(.node:active) {
  cursor: grabbing;
}

:deep(.node text) {
  user-select: none;
}

.actor-tooltip {
  position: fixed;
  pointer-events: none;
  background: #11141B;
  color: #E8E4D9;
  padding: 10px 14px;
  border-radius: 2px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Inconsolata', 'Consolas', ui-monospace, monospace;
  font-size: 13px;
  z-index: 1100;
  max-width: 280px;
  letter-spacing: 0.02em;
}

.tooltip-name {
  font-weight: 700;
  margin-bottom: 3px;
}

.tooltip-meta {
  color: rgba(232, 228, 217, 0.6);
  font-size: 12px;
}

.legend {
  position: fixed;
  left: 28px;
  bottom: 28px;
  background: rgba(11, 13, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px 28px;
  color: rgba(232, 228, 217, 0.9);
  font-family: 'Inconsolata', 'Consolas', ui-monospace, monospace;
  font-size: 24px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.legend-dot {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.legend-actor {
  background: #8892A6;
}

.legend-director {
  background: #C9A36A;
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
  max-width: 92vw;
  background: #0E1118;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding: 72px 40px 40px;
  color: #E8E4D9;
  font-family: 'Inconsolata', 'Consolas', ui-monospace, monospace;
  z-index: 1200;
  overflow-y: auto;
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.45);
}

.sidebar-close {
  position: absolute;
  top: 24px;
  right: 24px;
  background: transparent;
  border: none;
  color: rgba(232, 228, 217, 0.55);
  font-size: 18px;
  cursor: pointer;
  padding: 6px 10px;
  font-family: inherit;
}

.sidebar-close:hover {
  color: #E8E4D9;
}

.sidebar-role {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(232, 228, 217, 0.45);
  margin-bottom: 12px;
}

.sidebar-name {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.01em;
  margin: 0 0 8px;
  line-height: 1.15;
}

.sidebar-subtitle {
  font-size: 14px;
  color: rgba(232, 228, 217, 0.6);
  margin-bottom: 28px;
  letter-spacing: 0.03em;
}

.poster-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px 16px;
}

.poster-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poster-frame {
  width: 100%;
  aspect-ratio: 2 / 3;
  background: #1A1E28;
  border: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  position: relative;
}

.poster-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.poster-missing {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(232, 228, 217, 0.35);
  font-size: 11px;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.poster-caption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  line-height: 1.35;
  letter-spacing: 0.01em;
}

.poster-year {
  color: rgba(232, 228, 217, 0.45);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
  letter-spacing: 0.1em;
}

.poster-title {
  color: #E8E4D9;
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: transform 240ms ease, opacity 240ms ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  transform: translateX(24px);
  opacity: 0;
}
</style>
