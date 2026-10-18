import { describe, expect, it } from 'vitest'
import { example, parseExperiment, type Experiment } from './circuit'
import { transformerExample } from './examples'
import { analyze } from './solve'
import reference from '../../tests/fixtures/ngspice-transformer.json'

function solve(doc: Experiment) {
  const r = analyze(doc)
  if (!r.ok) throw new Error(r.message)
  return r
}
function polar(z: number[]) {
  return { magnitude: Math.hypot(...z), phase: (Math.atan2(z[1], z[0]) * 180) / Math.PI }
}
describe('explicit impedances and coupled windings', () => {
  it('models Thevenin droop and a finite source short without changing ideal defaults', () => {
    const doc = example()
    doc.version = 3
    doc.devices[0].seriesResistance = 10
    const r = solve(doc),
      i = 10 / 1010
    expect(r.readings.a1.current).toBeCloseTo(i, 12)
    expect(r.readings.s1.voltage).toBeCloseTo(10 - 10 * i, 10)
    expect(r.readings.s1.loss).toBeCloseTo(i * i * 10, 12)
    doc.wires.push({ id: 'short', from: 's1:p', to: 's1:n', color: '#111111' })
    const short = solve(doc)
    expect(short.readings.s1.current).toBeCloseTo(-1, 10)
    expect(short.readings.s1.loss).toBeCloseTo(10, 10)
    expect(short.readings.s1.voltage).toBeCloseTo(0, 10)
    doc.devices[0].seriesResistance = 0
    expect(analyze(doc).ok).toBe(false)
  })
  it.each(['inductor', 'capacitor'] as const)(
    'solves complex %s impedance and real series dissipation',
    (kind) => {
      const doc = example()
      doc.version = 3
      doc.analysis = { mode: 'ac', frequency: 50 }
      const device = doc.devices.find((d) => d.id === 'r1')!
      device.kind = kind
      device.seriesResistance = 5
      device.value = kind === 'inductor' ? 1 / Math.PI : 1 / (10000 * Math.PI)
      const r = solve(doc),
        reading = r.readings.r1,
        current = 10 / Math.hypot(5, 100)
      expect(reading.impedanceReal).toBe(5)
      expect(reading.impedanceImag).toBeCloseTo(kind === 'inductor' ? 100 : -100, 10)
      expect(reading.impedanceMagnitude).toBeCloseTo(Math.hypot(5, 100), 10)
      expect(reading.current).toBeCloseTo(current, 10)
      expect(reading.power).toBeCloseTo(current * current * 5, 10)
      expect(reading.loss).toBeCloseTo(reading.power!, 10)
      expect(r.powerBalance).toBeCloseTo(0, 10)
      expect(r.reactiveBalance).toBeCloseTo(0, 10)
    },
  )
  it('matches ngspice 47 phasors for source, copper, leakage, magnetizing current and core shunt', () => {
    const doc = transformerExample(),
      before = JSON.stringify(doc),
      r = solve(doc),
      t = r.readings.t1
    expect(t.voltage).toBeCloseTo(polar(reference.primaryVoltage).magnitude, 7)
    expect(t.voltagePhase).toBeCloseTo(polar(reference.primaryVoltage).phase, 7)
    expect(t.secondaryVoltage).toBeCloseTo(polar(reference.secondaryVoltage).magnitude, 7)
    expect(t.secondaryVoltagePhase).toBeCloseTo(polar(reference.secondaryVoltage).phase, 7)
    expect(r.readings.s1.current).toBeCloseTo(polar(reference.sourceCurrent).magnitude, 7)
    expect(r.readings.s1.currentPhase).toBeCloseTo(polar(reference.sourceCurrent).phase, 7)
    expect(t.secondaryCurrent).toBeCloseTo(polar(reference.secondaryCurrent).magnitude, 7)
    expect(t.secondaryCurrentPhase).toBeCloseTo(polar(reference.secondaryCurrent).phase, 7)
    const copper =
      Math.hypot(...reference.primaryWindingCurrent) ** 2 * 2 +
      Math.hypot(...reference.secondaryCurrent) ** 2 * 0.5
    expect(t.loss).toBeCloseTo(copper, 7)
    expect(t.power).toBeCloseTo(t.loss! + t.coreLoss!, 8)
    expect(t.inputPower! - t.outputPower!).toBeCloseTo(t.power!, 9)
    expect(r.powerBalance).toBeCloseTo(0, 8)
    expect(r.reactiveBalance).toBeCloseTo(0, 8)
    expect(r.residual).toBeLessThan(1e-10)
    expect(JSON.stringify(doc)).toBe(before)
  })
  it('has the exact 2:1 voltage relation at k=1 while retaining finite magnetizing current', () => {
    const doc = transformerExample()
    doc.devices[0].value = 10
    doc.devices[0].seriesResistance = 0
    doc.devices[1].transformer = {
      primaryInductance: 1,
      coupling: 1,
      primaryResistance: 0,
      secondaryResistance: 0,
      coreResistance: null,
    }
    const r = solve(doc),
      t = r.readings.t1
    expect(t.secondaryVoltage).toBeCloseTo(5, 10)
    expect(t.secondaryCurrent).toBeCloseTo(0.05, 10)
    expect(t.current).toBeCloseTo(Math.hypot(0.025, 10 / (100 * Math.PI)), 10)
    expect(t.power).toBeCloseTo(0, 10)
    expect(t.reactivePower).toBeCloseTo(100 / (100 * Math.PI), 10)
  })
  it('refuses unsupported/mislabeled models and requires a secondary reference', () => {
    const doc = transformerExample()
    expect(() => parseExperiment({ ...doc, version: 2 })).toThrow()
    doc.analysis!.mode = 'dc'
    expect(analyze(doc).ok).toBe(false)
    doc.analysis!.mode = 'ac'
    doc.wires = doc.wires.filter((w) => w.id !== 'tw6')
    expect(analyze(doc).ok).toBe(false)
    const bad = transformerExample()
    bad.devices[1].transformer!.coupling = 1.01
    expect(() => parseExperiment(bad)).toThrow()
    const resistor = example()
    resistor.version = 3
    resistor.devices[1].seriesResistance = 10
    expect(() => parseExperiment(resistor)).toThrow()
  })
})
