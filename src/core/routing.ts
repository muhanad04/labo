import type { Experiment, Point, Wire } from './circuit'
import { terminalPoint } from './edit'
import { wirePath } from './wiring'

interface Box {
  id: string
  left: number
  right: number
  top: number
  bottom: number
}
export interface LeadRoute {
  path: string
  points: Point[]
  blocked: boolean
}
const GAP = 16,
  EPS = 1e-6
function boxes(doc: Experiment): Box[] {
  return doc.devices.map((d) => {
    const p = doc.positions[d.id]
    return {
      id: d.id,
      left: p.x - GAP,
      right: p.x + 200 + GAP,
      top: p.y - GAP,
      bottom: p.y + 120 + GAP,
    }
  })
}
function inside(p: Point, r: Box) {
  return p.x > r.left + EPS && p.x < r.right - EPS && p.y > r.top + EPS && p.y < r.bottom - EPS
}
function hits(a: Point, b: Point, r: Box) {
  let enter = 0,
    leave = 1
  for (const [axis, min, max] of [
    ['x', r.left + EPS, r.right - EPS],
    ['y', r.top + EPS, r.bottom - EPS],
  ] as const) {
    const d = b[axis] - a[axis]
    if (Math.abs(d) < EPS) {
      if (a[axis] <= min || a[axis] >= max) return false
      continue
    }
    const low = (min - a[axis]) / d,
      high = (max - a[axis]) / d
    enter = Math.max(enter, Math.min(low, high))
    leave = Math.min(leave, Math.max(low, high))
    if (enter >= leave) return false
  }
  return enter < leave
}
function simplify(points: Point[]): Point[] {
  const out: Point[] = []
  for (const p of points) {
    if (out.length && Math.hypot(p.x - out.at(-1)!.x, p.y - out.at(-1)!.y) < EPS) continue
    while (out.length > 1) {
      const a = out.at(-2)!,
        b = out.at(-1)!
      if (Math.abs((b.x - a.x) * (p.y - b.y) - (b.y - a.y) * (p.x - b.x)) > EPS) break
      if ((b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) < 0) break
      out.pop()
    }
    out.push(p)
  }
  return out
}
function rounded(points: Point[]): string {
  if (!points.length) return ''
  let path = `M${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      p = points[i],
      b = points[i + 1],
      before = Math.hypot(p.x - a.x, p.y - a.y),
      after = Math.hypot(b.x - p.x, b.y - p.y),
      r = Math.min(10, before / 2, after / 2)
    if (!before || !after) continue
    const start = { x: p.x + ((a.x - p.x) * r) / before, y: p.y + ((a.y - p.y) * r) / before },
      end = { x: p.x + ((b.x - p.x) * r) / after, y: p.y + ((b.y - p.y) * r) / after }
    path += ` L${start.x} ${start.y} Q${p.x} ${p.y} ${end.x} ${end.y}`
  }
  const end = points.at(-1)!
  return `${path} L${end.x} ${end.y}`
}
function route(doc: Experiment, w: Wire, obstacles: Box[]): LeadRoute {
  const a = terminalPoint(doc, w.from),
    b = terminalPoint(doc, w.to),
    from = w.from.split(':')[0],
    to = w.to.split(':')[0]
  const s = { x: a.x, y: doc.positions[from].y + 120 + GAP },
    t = { x: b.x, y: doc.positions[to].y + 120 + GAP }
  const fallback = (): LeadRoute => ({
    path: wirePath(a, b, w),
    points: [a, b],
    blocked: true,
  })
  if (obstacles.some((r) => (r.id !== from && hits(a, s, r)) || (r.id !== to && hits(t, b, r))))
    return fallback()
  const free = (p: Point) =>
    Number.isFinite(p.x) && Number.isFinite(p.y) && !obstacles.some((r) => inside(p, r))
  const clear = (points: Point[]) =>
    points.every(free) &&
    points.slice(1).every((p, i) => !obstacles.some((r) => hits(points[i], p, r)))
  if (!free(s) || !free(t)) return fallback()
  const desired = Math.max(a.y, b.y) +
    0.75 * (w.slack ?? Math.max(28, Math.min(110, Math.abs(a.x - b.x) * 0.25 + 28)))
  let best: Point[] | null = null,
    bestCost = Infinity
  function consider(points: Point[], preference: number) {
    const path = simplify(points)
    if (!clear(path)) return
    const length = path
      .slice(1)
      .reduce((sum, p, i) => sum + Math.abs(p.x - path[i].x) + Math.abs(p.y - path[i].y), 0)
    const cost = length + preference + path.length * 4
    if (cost < bestCost) {
      best = path
      bestCost = cost
    }
  }
  const ys = new Set([s.y, t.y, desired, 8, 792, ...obstacles.flatMap((r) => [r.top, r.bottom])])
  const xs = new Set([s.x, t.x, 8, 1192, ...obstacles.flatMap((r) => [r.left, r.right])])
  for (const y of ys) consider([s, { x: s.x, y }, { x: t.x, y }, t], Math.abs(y - desired) * 4)
  for (const x of xs)
    consider([s, { x, y: s.y }, { x, y: t.y }, t], Math.abs((s.y + t.y) / 2 - desired) * 4)
  if (!best) {
    // Sparse rectilinear visibility graph: rectangle corners plus terminal projections.
    const candidates: Point[] = [
      s,
      t,
      { x: 8, y: 8 },
      { x: 1192, y: 8 },
      { x: 8, y: 792 },
      { x: 1192, y: 792 },
    ]
    for (const r of obstacles) {
      for (const x of [r.left, r.right]) {
        for (const y of [r.top, r.bottom, s.y, t.y]) candidates.push({ x, y })
      }
      for (const y of [r.top, r.bottom]) for (const x of [s.x, t.x]) candidates.push({ x, y })
    }
    const map = new Map<string, Point>()
    for (const p of candidates) if (free(p)) map.set(`${p.x},${p.y}`, p)
    const nodes = [...map.values()],
      index = new Map(nodes.map((p, i) => [`${p.x},${p.y}`, i]))
    const edges: { to: number; cost: number }[][] = nodes.map(() => [])
    for (const axis of ['x', 'y'] as const) {
      const groups = new Map<number, number[]>()
      nodes.forEach((p, i) => {
        if (!groups.has(p[axis])) groups.set(p[axis], [])
        groups.get(p[axis])!.push(i)
      })
      for (const group of groups.values()) {
        const other = axis === 'x' ? 'y' : 'x'
        group.sort((i, j) => nodes[i][other] - nodes[j][other])
        for (let i = 1; i < group.length; i++) {
          const u = group[i - 1],
            v = group[i]
          if (obstacles.some((r) => hits(nodes[u], nodes[v], r))) continue
          const cost = Math.abs(nodes[u][other] - nodes[v][other])
          edges[u].push({ to: v, cost })
          edges[v].push({ to: u, cost })
        }
      }
    }
    const start = index.get(`${s.x},${s.y}`)!,
      end = index.get(`${t.x},${t.y}`)!
    const distance = nodes.map(() => Infinity),
      previous = nodes.map(() => -1),
      visited = new Set<number>()
    distance[start] = 0
    for (let count = 0; count < nodes.length; count++) {
      let u = -1
      for (let i = 0; i < nodes.length; i++)
        if (!visited.has(i) && (u === -1 || distance[i] < distance[u])) u = i
      if (u === -1 || !Number.isFinite(distance[u])) break
      if (u === end) {
        const path: Point[] = []
        for (let v = end; v !== -1; v = previous[v]) path.unshift(nodes[v])
        best = simplify(path)
        break
      }
      visited.add(u)
      for (const edge of edges[u])
        if (distance[u] + edge.cost < distance[edge.to]) {
          distance[edge.to] = distance[u] + edge.cost
          previous[edge.to] = u
        }
    }
  }
  if (!best) return fallback()
  const points = simplify([a, ...best, b])
  return { path: rounded(points), points, blocked: false }
}
export function routeWire(doc: Experiment, w: Wire): LeadRoute {
  return route(doc, w, boxes(doc))
}
export function routeWires(doc: Experiment): Map<string, LeadRoute> {
  const obstacles = boxes(doc)
  return new Map(doc.wires.map((w) => [w.id, route(doc, w, obstacles)]))
}
