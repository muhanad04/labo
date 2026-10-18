import { expect, it } from 'vitest'
import { example, parseExperiment } from './circuit'
import { automaticWireColor, autoColorWires, wirePath } from './wiring'
import { threePhaseExample, transformerExample } from './examples'
import { deleteDevices, duplicateDevices, terminalPoint } from './edit'

it('automatically colors new nodes without changing existing manual colors', () => {
  const doc = example(),
    before = JSON.stringify(doc)
  expect(automaticWireColor(doc, 's1:n', 'v1:n')).toBe('#2b2b2b')
  expect(automaticWireColor(doc, 's1:p', 'v1:p')).toBe('#b64c38')
  expect(automaticWireColor(doc, 'r1:n', 'v1:n')).toBe(autoColorWires(doc).wires[1].color)
  expect(JSON.stringify(doc)).toBe(before)
})
it('reclassifies every existing lead by node role, independent of wire order', () => {
  const doc = example()
  doc.wires = doc.wires.map((w) => ({ ...w, color: '#ffffff' }))
  const colored = autoColorWires(doc)
  expect(colored.wires.find((w) => w.id === 'w0')!.color).toBe('#b64c38')
  expect(colored.wires.find((w) => w.id === 'w2')!.color).toBe('#2b2b2b')
  expect(colored.wires.find((w) => w.id === 'w4')!.color).toBe('#b64c38')
  expect(doc.wires.every((w) => w.color === '#ffffff')).toBe(true)
  const reversed = autoColorWires({ ...doc, wires: [...doc.wires].reverse() })
  expect(Object.fromEntries(reversed.wires.map((w) => [w.id, w.color]))).toEqual(
    Object.fromEntries(colored.wires.map((w) => [w.id, w.color])),
  )
  expect(autoColorWires(colored)).toBe(colored)
})
it('uses blue for divider junctions and propagates return roles only through zero-voltage branches', () => {
  const divider = autoColorWires(example('divider'))
  expect(divider.wires.find((w) => w.from === 'r1:n')!.color).toBe('#345c94')
  const doc = example()
  doc.devices.find((d) => d.id === 'a1')!.kind = 'switch'
  expect(autoColorWires(doc).wires[1].color).toBe('#2b2b2b')
  doc.devices.find((d) => d.id === 'a1')!.closed = false
  expect(autoColorWires(doc).wires[1].color).toBe('#345c94')
})
it('assigns declared AC source phase groups without arbitrary gold junctions', () => {
  const colored = autoColorWires(threePhaseExample())
  for (const [id, color] of [
    ['s0', '#b64c38'],
    ['s1', '#345c94'],
    ['s2', '#257046'],
  ])
    expect(colored.wires.find((w) => w.from === `${id}:p`)!.color).toBe(color)
  expect(colored.wires.some((w) => w.color === '#a16a0a')).toBe(false)
})
it('uses simple smooth lead loops while still reading old routes', () => {
  expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 0 })).toContain(' C')
  expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 0 }, { slack: 150 })).toContain(
    'C0 150,200 150,200 0',
  )
  expect(wirePath({ x: 0, y: 0 }, { x: 200, y: 0 }, { points: [{ x: 100, y: 100 }] })).toContain(
    'L100 100',
  )
})
it('preserves all four transformer terminal identities during duplicate/delete', () => {
  const doc = transformerExample()
  let id = 0
  const duplicated = duplicateDevices(doc, ['t1', 'r1'], () => `copy${id++}`)
  parseExperiment(duplicated.doc)
  expect(duplicated.doc.wires.some((w) => w.from.endsWith(':s') && w.from.startsWith('copy'))).toBe(
    true,
  )
  expect(terminalPoint(doc, 't1:s').x - terminalPoint(doc, 't1:n').x).toBe(60)
  const removed = deleteDevices(doc, ['t1'])
  expect(removed.wires.every((w) => !w.from.startsWith('t1:') && !w.to.startsWith('t1:'))).toBe(
    true,
  )
})
