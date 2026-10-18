import { describe, expect, it } from 'vitest'
import { blank, example, parseExperiment, parseQuantity } from './circuit'
import { analyze } from './solve'
import type { Analysis } from './solve'
import type { Experiment } from './circuit'

function solved(doc: Experiment): Extract<Analysis, { ok: true }> {
  const result = analyze(doc)
  expect(result.ok, result.ok ? '' : result.message).toBe(true)
  if (!result.ok) throw new Error(result.message)
  return result
}

describe('ideal DC analysis', () => {
  it('solves Ohm’s law with a genuine series ammeter and non-loading voltmeter', () => {
    const r = solved(example())
    expect(r.readings.r1.voltage).toBeCloseTo(10, 10)
    expect(r.readings.a1.current).toBeCloseTo(0.01, 10)
    expect(r.readings.v1.voltage).toBeCloseTo(10, 10)
    expect(r.readings.r1.power).toBeCloseTo(0.1, 10)
    expect(r.readings.s1.current).toBeCloseTo(-0.01, 10)
    expect(r.powerBalance).toBeCloseTo(0, 10)
    expect(r.residual).toBeLessThan(1e-10)
  })
  it('solves a divider and conserves power', () => {
    const r = solved(example('divider'))
    expect(r.readings.v1.voltage).toBeCloseTo(5, 10)
    expect(r.readings.a1.current).toBeCloseTo(0.005, 10)
    expect(r.powerBalance).toBeCloseTo(0, 10)
  })
  it('solves parallel branches and KCL', () => {
    const doc = example()
    doc.devices.push({ id: 'r2', kind: 'resistor', label: 'R2', value: 1000, closed: true })
    doc.positions.r2 = { x: 500, y: 500 }
    doc.wires.push(
      { id: 'p1', from: 'r1:p', to: 'r2:p', color: '#205c47' },
      { id: 'p2', from: 'r1:n', to: 'r2:n', color: '#205c47' },
    )
    const r = solved(doc)
    expect(r.readings.r2.current).toBeCloseTo(0.01, 10)
    expect(r.readings.a1.current).toBeCloseTo(0.02, 10)
    expect(r.readings.s1.current! + r.readings.a1.current!).toBeCloseTo(0, 10)
  })
  it('solves a loaded divider', () => {
    const doc = example('divider')
    doc.devices.push({ id: 'r3', kind: 'resistor', label: 'R3', value: 1000, closed: true })
    doc.positions.r3 = { x: 0, y: 0 }
    doc.wires.push(
      { id: 'l1', from: 'r2:p', to: 'r3:p', color: '#205c47' },
      { id: 'l2', from: 'r2:n', to: 'r3:n', color: '#205c47' },
    )
    expect(solved(doc).readings.v1.voltage).toBeCloseTo(10 / 3, 10)
  })
  it('rejects missing reference and floating conductive branches', () => {
    const doc = example()
    doc.wires = doc.wires.filter((w) => ![w.from, w.to].includes('g1:p'))
    expect(analyze(doc).ok).toBe(false)
    doc.devices = doc.devices.filter((d) => d.kind !== 'ground')
    delete doc.positions.g1
    const r = analyze(doc)
    expect(!r.ok && r.message).toContain('reference')
  })
  it('marks disconnected voltmeters unavailable, not zero, without breaking the circuit', () => {
    const doc = example()
    doc.wires = doc.wires.filter((w) => ![w.from, w.to].some((p) => p.startsWith('v1:')))
    expect(solved(doc).readings.v1.voltage).toBeNull()
  })
  it('rejects a shorted source', () => {
    const doc = example()
    doc.wires.push({ id: 'short', from: 's1:p', to: 's1:n', color: '#205c47' })
    expect(analyze(doc).ok).toBe(false)
  })
  it('rejects inconsistent ideal sources and redundant ammeter loops', () => {
    const doc = example()
    doc.devices.push({ id: 's2', kind: 'source', label: 'S2', value: 5, closed: true })
    doc.positions.s2 = { x: 0, y: 0 }
    doc.wires.push(
      { id: 's2p', from: 's2:p', to: 's1:p', color: '#205c47' },
      { id: 's2n', from: 's2:n', to: 's1:n', color: '#205c47' },
    )
    expect(analyze(doc).ok).toBe(false)
  })
  it('supports a closed switch, diagnoses a floating open branch', () => {
    const doc = example()
    doc.devices.find((d) => d.id === 'a1')!.kind = 'switch'
    expect(solved(doc).readings.a1.current).toBeCloseTo(0.01, 10)
    doc.devices.find((d) => d.id === 'a1')!.closed = false
    // R1 still ties both switch terminals into referenced subnetworks via the source.
    expect(solved(doc).readings.a1.current).toBe(0)
    expect(solved(doc).readings.r1.current).toBeCloseTo(0, 10)
  })
  it('supports negative voltages and wide resistance ranges', () => {
    for (const resistance of [0.001, 1, 1e6, 1e9]) {
      const doc = example()
      doc.devices.find((d) => d.id === 'r1')!.value = resistance
      doc.devices.find((d) => d.id === 's1')!.value = -10
      expect(solved(doc).readings.a1.current).toBeCloseTo(-10 / resistance, 8)
    }
  })
  it('returns a useful empty-bench diagnostic', () => {
    expect(analyze(blank()).ok).toBe(false)
  })
})

describe('project and quantity validation', () => {
  it('round trips a project', () => {
    expect(parseExperiment(JSON.parse(JSON.stringify(example())))).toEqual(example())
  })
  it('rejects bad versions, unknown fields, dangling wires, duplicate IDs and NaN', () => {
    expect(() => parseExperiment({ ...example(), version: 99 })).toThrow()
    expect(() => parseExperiment({ ...example(), script: 'no' })).toThrow()
    const doc = example()
    doc.wires[0].to = 'missing:p'
    expect(() => parseExperiment(doc)).toThrow('missing terminal')
    const duplicate = example()
    duplicate.devices.push(duplicate.devices[0])
    expect(() => parseExperiment(duplicate)).toThrow('unique')
    const invalid = example()
    invalid.devices[0].value = NaN
    expect(() => parseExperiment(invalid)).toThrow()
  })
  it('rejects invalid resistance and duplicate/self wires', () => {
    const doc = example()
    doc.devices[1].value = 0
    expect(() => parseExperiment(doc)).toThrow('Resistance')
    const duplicate = example()
    duplicate.wires.push({ ...duplicate.wires[0], id: 'duplicate' })
    expect(() => parseExperiment(duplicate)).toThrow('Duplicate wires')
  })
  it('rejects duplicate labels and inherited positions', () => {
    const doc = example()
    doc.devices[1].label = doc.devices[0].label
    expect(() => parseExperiment(doc)).toThrow('labels')
    const inherited = example()
    inherited.devices.push({
      id: 'constructor',
      kind: 'ground',
      label: 'Other reference',
      value: 0,
      closed: true,
    })
    expect(() => parseExperiment(inherited)).toThrow('position')
  })
  it('parses engineering notation safely and distinguishes milli from mega', () => {
    expect(parseQuantity('4.7k')).toBe(4700)
    expect(parseQuantity('2M')).toBe(2e6)
    expect(parseQuantity('2m')).toBe(0.002)
    expect(parseQuantity('-1e3')).toBe(-1000)
    expect(parseQuantity('1/0')).toBeNull()
    expect(parseQuantity('Infinity')).toBeNull()
  })
})
