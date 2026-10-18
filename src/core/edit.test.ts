import { describe, expect, it } from 'vitest'
import { example, parseExperiment } from './circuit'
import { deleteDevices, duplicateDevices, moveDevices } from './edit'
import { analyze } from './solve'

describe('layout and topology editing', () => {
  it('group movement clamps one common delta and preserves electrical readings', () => {
    const doc = example(),
      original = structuredClone(doc)
    const moved = moveDevices(doc, ['s1', 'r1'], { x: 1000, y: -1000 })
    expect(moved.positions.r1.x).toBe(1000)
    expect(moved.positions.r1.x - moved.positions.s1.x).toBe(330)
    expect(moved.positions.r1.y).toBe(0)
    expect(analyze(moved)).toEqual(analyze(doc))
    expect(doc).toEqual(original)
  })
  it('snaps an anchor and shifts internal route points without changing connectivity', () => {
    const doc = example()
    doc.version = 2
    doc.wires[0].points = [{ x: 200, y: 250 }]
    const next = moveDevices(doc, ['s1', 'r1'], { x: 13, y: 12 }, true)
    expect(next.positions.s1).toEqual({ x: 100, y: 120 })
    expect(next.wires[0].points).toEqual([{ x: 220, y: 270 }])
    expect(next.wires[0].from).toBe(doc.wires[0].from)
    expect(parseExperiment(next)).toEqual(next)
  })
  it('duplicates only internal connections with new identities and unique labels', () => {
    let i = 0
    const doc = example()
    const copy = duplicateDevices(doc, ['s1', 'r1'], () => `copy${i++}`)
    expect(copy.ids).toHaveLength(2)
    expect(copy.doc.devices).toHaveLength(7)
    expect(copy.doc.wires).toHaveLength(7)
    expect(new Set(copy.doc.devices.map((d) => d.label)).size).toBe(7)
    expect(copy.doc.wires.at(-1)!.from).toBe(`${copy.ids[0]}:p`)
    expect(copy.doc.wires.at(-1)!.to).toBe(`${copy.ids[1]}:p`)
    expect(parseExperiment(copy.doc)).toEqual(copy.doc)
  })
  it('deletes a group and attached leads atomically', () => {
    const doc = example(),
      next = deleteDevices(doc, ['s1', 'r1'])
    expect(next.devices).toHaveLength(3)
    expect(next.wires).toHaveLength(0)
    expect(doc.devices).toHaveLength(5)
  })
})
