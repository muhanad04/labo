import { ports, settings, terminal } from './circuit'
import type { Experiment, Point, Terminal, Wire } from './circuit'
export const wireColors = [
  ['#2b2b2b', 'Black'],
  ['#b64c38', 'Red'],
  ['#345c94', 'Blue'],
  ['#257046', 'Green'],
  ['#a16a0a', 'Ochre'],
] as const
export function wirePath(a: Point, b: Point, wire?: Pick<Wire, 'points' | 'slack'>): string {
  if (wire?.points?.length)
    return `M${a.x} ${a.y} ${[...wire.points, b].map((p) => `L${p.x} ${p.y}`).join(' ')}`
  const bend = wire?.slack ?? Math.max(28, Math.min(110, Math.abs(a.x - b.x) * 0.25 + 28))
  return `M${a.x} ${a.y} C${a.x} ${a.y + bend},${b.x} ${b.y + bend},${b.x} ${b.y}`
}
/** Role convention, not measured voltage, current direction or a physical safety standard. */
export function autoColorWires(doc: Experiment): Experiment {
  const parent = new Map<Terminal, Terminal>()
  function find(id: Terminal): Terminal {
    const p = parent.get(id)
    if (!p) {
      parent.set(id, id)
      return id
    }
    if (p === id) return id
    const root = find(p)
    parent.set(id, root)
    return root
  }
  function join(from: Terminal, to: Terminal) {
    const a = find(from),
      b = find(to)
    if (a !== b) parent.set(a < b ? b : a, a < b ? a : b)
  }
  for (const d of doc.devices) for (const p of ports(d)) find(terminal(d.id, p))
  for (const w of doc.wires) join(w.from, w.to)
  // Ideal zero-voltage branches propagate return/reference roles, but loads never do.
  for (const d of doc.devices)
    if (d.kind === 'ammeter' || (d.kind === 'switch' && d.closed)) join(`${d.id}:p`, `${d.id}:n`)
  const references = doc.devices.filter((d) => d.kind === 'ground')
  for (const d of references) join(`${d.id}:p`, `${references[0].id}:p`)
  const nodes = new Map<Terminal, Set<Terminal>>()
  for (const id of parent.keys()) {
    const root = find(id)
    if (!nodes.has(root)) nodes.set(root, new Set())
    nodes.get(root)!.add(id)
  }
  const colors = new Map<Terminal, string>()
  for (const [root, node] of nodes) {
    let color: string = wireColors[2][0]
    if (
      doc.devices.some(
        (d) =>
          (d.kind === 'ground' && node.has(`${d.id}:p`)) ||
          (d.kind === 'source' && node.has(`${d.id}:n`)),
      )
    )
      color = wireColors[0][0]
    else {
      const source = doc.devices.find((d) => d.kind === 'source' && node.has(`${d.id}:p`))
      if (source) {
        const phase = settings(doc).mode === 'ac' ? (((source.phase ?? 0) % 360) + 360) % 360 : 0
        color = [wireColors[1][0], wireColors[3][0], wireColors[2][0]][Math.round(phase / 120) % 3]
      }
    }
    colors.set(root, color)
  }
  let changed = false
  const wires = doc.wires.map((w) => {
    const color = colors.get(find(w.from))!
    if (w.color === color) return w
    changed = true
    return { ...w, color }
  })
  return changed ? { ...doc, wires } : doc
}
export function automaticWireColor(doc: Experiment, from: Terminal, to: Terminal): string {
  return autoColorWires({
    ...doc,
    wires: [...doc.wires, { id: 'color-preview', from, to, color: '#ffffff' }],
  }).wires.at(-1)!.color
}
