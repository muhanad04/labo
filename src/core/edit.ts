import { LAYOUT_LIMIT, ROUTE_LIMIT, ports, portLabel, terminal } from './circuit'
import type { Experiment, Point, Port, Terminal } from './circuit'

export function portPoint(point: Point, port: Port, four = false): Point {
  const x = four ? { p: 26, n: 70, s: 130, t: 174 }[port] : port === 'p' ? 26 : 174
  return { x: point.x + x, y: point.y + 100 }
}
export function terminalPoint(doc: Experiment, id: Terminal): Point {
  const [device, p] = id.split(':')
  return portPoint(
    doc.positions[device],
    p as Port,
    doc.devices.find((d) => d.id === device)?.kind === 'transformer',
  )
}

export function deleteDevices(doc: Experiment, ids: string[]): Experiment {
  const chosen = new Set(ids)
  return {
    ...doc,
    devices: doc.devices.filter((d) => !chosen.has(d.id)),
    positions: Object.fromEntries(Object.entries(doc.positions).filter(([id]) => !chosen.has(id))),
    wires: doc.wires.filter(
      (w) => !chosen.has(w.from.split(':')[0]) && !chosen.has(w.to.split(':')[0]),
    ),
  }
}

/** Group bounds use one common delta, preserving relative positions at canvas edges. */
export function moveDevices(
  doc: Experiment,
  ids: string[],
  delta: Point,
  snap = false,
): Experiment {
  const positions = ids.map((id) => doc.positions[id]).filter(Boolean)
  if (!positions.length) return doc
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) return doc
  const chosen = new Set(ids)
  const routePoints = doc.wires.filter(w => chosen.has(w.from.split(':')[0]) && chosen.has(w.to.split(':')[0])).flatMap(w => w.points ?? [])
  const anchor = positions[0]
  const requested = snap
    ? {
        x: Math.round((anchor.x + delta.x) / 100) * 100 - anchor.x,
        y: Math.round((anchor.y + delta.y) / 120) * 120 - anchor.y,
      }
    : delta
  const bounded = (axis: 'x' | 'y') => Math.max(
    -LAYOUT_LIMIT - Math.min(...positions.map(p => p[axis])),
    -ROUTE_LIMIT - Math.min(0, ...routePoints.map(p => p[axis])),
    Math.min(LAYOUT_LIMIT - Math.max(...positions.map(p => p[axis])), ROUTE_LIMIT - Math.max(0, ...routePoints.map(p => p[axis])), requested[axis]),
  )
  const dx = bounded('x'), dy = bounded('y')
  if (!dx && !dy) return doc
  return {
    ...doc,
    version: 4,
    positions: Object.fromEntries(
      Object.entries(doc.positions).map(([id, p]) => [
        id,
        chosen.has(id) ? { x: p.x + dx, y: p.y + dy } : p,
      ]),
    ),
    wires: doc.wires.map((w) =>
      chosen.has(w.from.split(':')[0]) && chosen.has(w.to.split(':')[0]) && w.points?.length
        ? {
            ...w,
            points: w.points.map((p) => ({
              x: p.x + dx,
              y: p.y + dy,
            })),
          }
        : w,
    ),
  }
}

export function duplicateDevices(
  doc: Experiment,
  ids: string[],
  createId: () => string,
): { doc: Experiment; ids: string[] } {
  const selected = doc.devices.filter((d) => ids.includes(d.id))
  const mapping = new Map(selected.map((d) => [d.id, createId()]))
  const labels = new Set(doc.devices.map((d) => d.label))
  const devices = selected.map((d) => {
    const base = d.label.slice(0, 28)
    let n = 2,
      label = `${base} copy`
    while (labels.has(label)) label = `${base} copy ${n++}`
    labels.add(label)
    return { ...d, id: mapping.get(d.id)!, label }
  })
  const mapped = (end: Terminal) => {
    const [id, port] = end.split(':')
    return terminal(mapping.get(id)!, port as Port)
  }
  const wires = doc.wires
    .filter((w) => mapping.has(w.from.split(':')[0]) && mapping.has(w.to.split(':')[0]))
    .map((w) => ({
      ...w,
      id: createId(),
      from: mapped(w.from),
      to: mapped(w.to),
      points: w.points?.map((p) => ({ ...p })),
    }))
  // Don't introduce optional fields into untouched legacy records.
  for (const wire of wires) if (!wire.points) delete wire.points
  const positions = { ...doc.positions }
  for (const d of selected) positions[mapping.get(d.id)!] = { ...doc.positions[d.id] }
  const next = {
    ...doc,
    devices: [...doc.devices, ...devices],
    wires: [...doc.wires, ...wires],
    positions,
  }
  return {
    doc: moveDevices(next, [...mapping.values()], { x: 40, y: 40 }),
    ids: [...mapping.values()],
  }
}

export function terminals(doc: Experiment) {
  return doc.devices.flatMap((d) =>
    ports(d).map((p) => ({
      id: terminal(d.id, p),
      label: `${d.label} ${d.kind === 'ground' ? '0 V' : (d.kind === 'transformer' && (p === 'p' || p === 'n') ? 'P' : '') + portLabel(p)}`,
    })),
  )
}
