import { describe, expect, it } from 'vitest'
import { example, parseExperiment } from './circuit'
import { acExample, threePhaseExample } from './examples'
import { analyze } from './solve'
import type { Device, Experiment, Wire } from './circuit'
function solve(doc: Experiment) {
  const r = analyze(doc)
  if (!r.ok) throw new Error(r.message)
  return r
}

describe('RMS phasor analysis', () => {
  it('preserves a legacy DC fixture and solves an AC resistance at unity PF', () => {
    const dc = example(),
      before = JSON.stringify(dc)
    const doc: Experiment = { ...dc, version: 2, analysis: { mode: 'ac', frequency: 50 } }
    const r = solve(doc)
    expect(r.readings.a1.current).toBeCloseTo(0.01, 10)
    expect(r.readings.r1.powerFactor).toBeCloseTo(1, 10)
    expect(r.readings.r1.reactivePower).toBe(0)
    expect(r.readings.r1.voltagePhase).toBe(0)
    expect(r.powerBalance).toBeCloseTo(0, 10)
    expect(JSON.stringify(dc)).toBe(before)
  })
  it('solves RL amplitude, lag, active/reactive/apparent power and conservation', () => {
    const r = solve(acExample())
    expect(r.readings.a1.current).toBeCloseTo(1 / Math.sqrt(200), 10)
    expect(r.readings.a1.currentPhase).toBeCloseTo(-45, 9)
    expect(r.readings.r1.power).toBeCloseTo(0.5, 9)
    expect(r.readings.l1.reactivePower).toBeCloseTo(0.5, 9)
    expect(r.readings.s1.power).toBeCloseTo(-0.5, 9)
    expect(r.readings.s1.reactivePower).toBeCloseTo(-0.5, 9)
    expect(r.readings.s1.apparentPower).toBeCloseTo(Math.SQRT1_2, 9)
    expect(r.readings.s1.powerFactor).toBeCloseTo(Math.SQRT1_2, 9)
    expect(r.powerBalance).toBeCloseTo(0, 9)
    expect(r.reactiveBalance).toBeCloseTo(0, 9)
    expect(r.residual).toBeLessThan(1e-10)
  })
  it('solves a capacitive load with leading current and negative Q', () => {
    const doc = acExample()
    doc.devices.find((d) => d.id === 'l1')!.kind = 'capacitor'
    doc.devices.find((d) => d.id === 'l1')!.value = 1 / (10000 * Math.PI)
    const r = solve(doc)
    expect(r.readings.a1.currentPhase).toBeCloseTo(45, 8)
    expect(r.readings.l1.reactivePower).toBeCloseTo(-0.5, 8)
  })
  it('solves parallel RLC resonance with cancelling branch reactive currents', () => {
    const doc = example()
    doc.version = 2
    doc.analysis = { mode: 'ac', frequency: 50 }
    doc.devices.find((d) => d.id === 'r1')!.value = 100
    doc.devices.push(
      { id: 'l1', label: 'L1', kind: 'inductor', value: 1 / Math.PI, closed: true },
      { id: 'c1', label: 'C1', kind: 'capacitor', value: 1 / (10000 * Math.PI), closed: true },
    )
    doc.positions.l1 = { x: 100, y: 400 }
    doc.positions.c1 = { x: 400, y: 400 }
    doc.wires.push(
      { id: 'lp', from: 'l1:p', to: 'r1:p', color: '#111111' },
      { id: 'ln', from: 'l1:n', to: 'r1:n', color: '#111111' },
      { id: 'cp', from: 'c1:p', to: 'r1:p', color: '#111111' },
      { id: 'cn', from: 'c1:n', to: 'r1:n', color: '#111111' },
    )
    const r = solve(doc)
    expect(r.readings.a1.current).toBeCloseTo(0.1, 10)
    expect(r.readings.a1.currentPhase).toBeCloseTo(0, 8)
    expect(r.readings.l1.current).toBeCloseTo(0.1, 10)
    expect(r.readings.c1.current).toBeCloseTo(0.1, 10)
    expect(r.readings.l1.currentPhase).toBeCloseTo(-90, 8)
    expect(r.readings.c1.currentPhase).toBeCloseTo(90, 8)
    expect(r.readings.l1.reactivePower).toBeCloseTo(1, 10)
    expect(r.readings.c1.reactivePower).toBeCloseTo(-1, 10)
    expect(r.readings.r1.power).toBeCloseTo(1, 10)
    expect(r.reactiveBalance).toBeCloseTo(0, 10)
    expect(r.powerBalance).toBeCloseTo(0, 10)
  })
  it('supports distinct source phases and balanced three-phase line/phase quantities', () => {
    const r = solve(threePhaseExample())
    expect(r.readings.v1.voltage).toBeCloseTo(230 * Math.sqrt(3), 8)
    expect(r.readings.a1.current).toBeCloseTo(2.3, 8)
    expect(r.readings.r0.power! + r.readings.r1.power! + r.readings.r2.power!).toBeCloseTo(1587, 8)
    expect(r.readings.r1.currentPhase).toBeCloseTo(-120, 8)
    expect(r.powerBalance).toBeCloseTo(0, 8)
  })
  it('handles an unbalanced wye without assuming balanced currents', () => {
    const doc = threePhaseExample()
    doc.devices.find((d) => d.id === 'r1')!.value = 200
    const r = solve(doc)
    expect(r.readings.r1.current).toBeCloseTo(1.15, 8)
    expect(r.readings.r2.current).toBeCloseTo(2.3, 8)
    expect(r.powerBalance).toBeCloseTo(0, 8)
  })
  it('solves a delta load with the correct branch and line currents', () => {
    const doc = threePhaseExample()
    doc.wires = doc.wires.map((w) =>
      w.from === 'a1:n'
        ? { ...w, to: 's1:p' }
        : w.from === 'r1:n'
          ? { ...w, to: 's2:p' }
          : w.from === 'r2:n'
            ? { ...w, to: 's0:p' }
            : w,
    )
    const r = solve(doc)
    expect(r.readings.a1.current).toBeCloseTo((230 * Math.sqrt(3)) / 100, 8)
    expect(r.readings.s0.current).toBeCloseTo(6.9, 8)
    expect(r.readings.r0.power! + r.readings.r1.power! + r.readings.r2.power!).toBeCloseTo(4761, 8)
    expect(r.powerBalance).toBeCloseTo(0, 8)
  })
  it('solves an unbalanced floating star point without forcing its voltage to zero', () => {
    const doc = threePhaseExample()
    doc.devices.find((d) => d.id === 'r1')!.value = 200
    doc.wires = doc.wires
      .filter((w) => w.from !== 'a1:n')
      .map((w) => (w.from === 'r1:n' || w.from === 'r2:n' ? { ...w, to: 'a1:n' } : w))
    const r = solve(doc)
    expect(r.readings.r0.voltage).toBeCloseTo(Math.hypot(207, 23 * Math.sqrt(3)), 8)
    let re = 0,
      im = 0
    for (const id of ['r0', 'r1', 'r2']) {
      const reading = r.readings[id],
        phase = (reading.currentPhase! * Math.PI) / 180
      re += reading.current! * Math.cos(phase)
      im += reading.current! * Math.sin(phase)
    }
    expect(re).toBeCloseTo(0, 8)
    expect(im).toBeCloseTo(0, 8)
  })
  it('diagnoses ideal lossless series resonance instead of adding hidden damping', () => {
    const doc = acExample()
    const cap = doc.devices.find((d) => d.id === 'r1')!
    cap.kind = 'capacitor'
    cap.value = 1 / (10000 * Math.PI)
    expect(analyze(doc).ok).toBe(false)
  })
  it('preserves analytical results at the 40-module bound', () => {
    const resistors: Device[] = Array.from({ length: 37 }, (_, i) => ({
      id: `r${i}`,
      kind: 'resistor',
      label: `R${i + 1}`,
      value: 100 + 10 * i,
      closed: true,
    }))
    const wires: Wire[] = Array.from({ length: 36 }, (_, i) => ({
      id: `w${i}`,
      from: `r${i}:n`,
      to: `r${i + 1}:p`,
      color: '#111111',
    }))
    wires.push(
      { id: 'start', from: 's:p', to: 'r0:p', color: '#111111' },
      { id: 'end', from: 'r36:n', to: 'a:p', color: '#111111' },
      { id: 'return', from: 'a:n', to: 'g:p', color: '#111111' },
      { id: 'ref', from: 's:n', to: 'g:p', color: '#111111' },
    )
    const doc: Experiment = {
      version: 2,
      title: 'Series bound',
      analysis: { mode: 'ac', frequency: 50 },
      devices: [
        ...resistors,
        {
          id: 's',
          kind: 'source',
          label: 'Source',
          value: 10,
          phase: 23,
          closed: true,
        },
        { id: 'a', kind: 'ammeter', label: 'A', value: 0, closed: true },
        { id: 'g', kind: 'ground', label: 'Reference', value: 0, closed: true },
      ],
      wires,
      positions: {},
    }
    doc.positions = Object.fromEntries(
      doc.devices.map((d, i) => [d.id, { x: (i % 6) * 190, y: Math.floor(i / 6) * 90 }]),
    )
    parseExperiment(doc)
    const before = JSON.stringify(doc),
      r = solve(doc)
    expect(r.readings.a.current).toBeCloseTo(10 / 10360, 12)
    expect(r.readings.a.currentPhase).toBeCloseTo(23, 8)
    expect(r.powerBalance).toBeCloseTo(0, 10)
    expect(r.residual).toBeLessThan(1e-10)
    expect(JSON.stringify(doc)).toBe(before)
  })
  it('rejects invalid AC parameters and reactive DC claims', () => {
    const doc = acExample()
    doc.analysis!.frequency = 0
    expect(() => parseExperiment(doc)).toThrow()
    doc.analysis!.frequency = 50
    doc.devices[0].value = -10
    expect(analyze(doc).ok).toBe(false)
    doc.devices[0].value = 10
    doc.analysis!.mode = 'dc'
    const result = analyze(doc)
    expect(!result.ok && result.message).toContain('require AC')
  })
})
