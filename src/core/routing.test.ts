import { expect, it } from 'vitest'
import { example } from './circuit'
import { acExample, threePhaseExample, transformerExample } from './examples'
import { routeWire, routeWires } from './routing'

it('routes every preset around unrelated component faces without changing topology', () => {
  for (const doc of [
    example(),
    example('divider'),
    acExample(),
    threePhaseExample(),
    transformerExample(),
  ]) {
    const before = JSON.stringify(doc),
      routes = routeWires(doc)
    for (const wire of doc.wires) {
      const route = routes.get(wire.id)!
      expect(route.blocked, `${doc.title}: ${wire.id}`).toBe(false)
      expect(route.path).not.toContain('NaN')
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1],
          b = route.points[i]
        for (let step = 1; step < 40; step++)
          for (const device of doc.devices) {
            if (i === 1 && wire.from.startsWith(`${device.id}:`)) continue
            if (i === route.points.length - 1 && wire.to.startsWith(`${device.id}:`)) continue
            const p = { x: a.x + ((b.x - a.x) * step) / 40, y: a.y + ((b.y - a.y) * step) / 40 },
              box = doc.positions[device.id]
            expect(
              p.x > box.x + 1e-5 &&
                p.x < box.x + 200 - 1e-5 &&
                p.y > box.y + 1e-5 &&
                p.y < box.y + 120 - 1e-5,
              `${doc.title}: ${wire.id} crosses ${device.id}`,
            ).toBe(false)
          }
      }
    }
    expect(JSON.stringify(doc)).toBe(before)
  }
})
it('recalculates a lead when a module becomes an obstacle', () => {
  const doc = example(),
    wire = doc.wires[0],
    original = routeWire(doc, wire).path
  doc.devices.push({ id: 'obstacle', label: 'Probe', kind: 'voltmeter', value: 0, closed: true })
  doc.positions.obstacle = { x: 270, y: 260 }
  const route = routeWire(doc, wire)
  expect(route.blocked).toBe(false)
  expect(route.path).not.toBe(original)
})
it('reports overlapping modules instead of claiming the route is unobstructed', () => {
  const doc = example()
  doc.positions.r1 = { ...doc.positions.s1 }
  expect(routeWire(doc, doc.wires[0]).blocked).toBe(true)
})
