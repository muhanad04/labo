import { parseExperiment, settings, valueUnit } from './circuit'
import type { Experiment } from './circuit'
import { analyze } from './solve'
export const measures = {
  voltage: { label: 'Voltage', unit: 'V' },
  current: { label: 'Current', unit: 'A' },
  power: { label: 'Active power', unit: 'W' },
  reactivePower: { label: 'Reactive power', unit: 'var' },
  apparentPower: { label: 'Apparent power', unit: 'VA' },
  powerFactor: { label: 'Power factor', unit: '' },
  voltagePhase: { label: 'Voltage phase', unit: '°' },
  currentPhase: { label: 'Current phase', unit: '°' },
} as const
export type Measure = keyof typeof measures
export interface SweepSpec {
  parameter: string
  start: number
  stop: number
  count: number
  spacing: 'linear' | 'log'
  device: string
  measure: Measure
}
export interface SweepPoint {
  x: number
  y: number | null
  diagnostic: string
}
export interface SweepResult {
  snapshot: Experiment
  signature: string
  spec: SweepSpec
  points: SweepPoint[]
  xLabel: string
  xUnit: string
  yLabel: string
  yUnit: string
}
/** Layout, routing and lead color do not change the electrical problem. */
export function electricalSignature(doc: Experiment): string {
  return JSON.stringify({
    analysis: settings(doc),
    devices: doc.devices
      .map(({ id, kind, value, closed, phase, seriesResistance, transformer }) => ({
        id,
        kind,
        value,
        closed,
        phase,
        seriesResistance,
        transformer,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    wires: doc.wires.map((w) => [w.from, w.to].sort().join('|')).sort(),
  })
}
export async function runSweep(
  input: Experiment,
  spec: SweepSpec,
  signal?: AbortSignal,
  progress?: (completed: number) => void,
): Promise<SweepResult> {
  const snapshot = parseExperiment(structuredClone(input))
  if (
    ![spec.start, spec.stop].every(Number.isFinite) ||
    spec.start === spec.stop ||
    !Number.isInteger(spec.count) ||
    spec.count < 2 ||
    spec.count > 101
  )
    throw new Error('Sweep requires distinct finite limits and 2–101 points.')
  if (spec.spacing === 'log' && (spec.start <= 0 || spec.stop <= 0))
    throw new Error('Logarithmic limits must be positive.')
  if (!snapshot.devices.some((d) => d.id === spec.device) || !Object.hasOwn(measures, spec.measure))
    throw new Error('Select an existing measurement channel.')
  const parameter = snapshot.devices.find((d) => d.id === spec.parameter)
  if (spec.parameter === 'frequency') {
    if (settings(snapshot).mode !== 'ac') throw new Error('Frequency sweep requires AC analysis.')
  } else if (
    !parameter ||
    !['source', 'resistor', 'inductor', 'capacitor'].includes(parameter.kind)
  )
    throw new Error('Select a source or passive component to sweep.')
  const points: SweepPoint[] = []
  for (let i = 0; i < spec.count; i++) {
    // Yield in bounded batches, permitting cancel/unmount without a worker dependency.
    if (i % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0))
    if (signal?.aborted) throw Object.assign(new Error('Sweep cancelled.'), { name: 'AbortError' })
    const t = i / (spec.count - 1)
    const x =
      spec.spacing === 'log'
        ? Math.exp(Math.log(spec.start) + (Math.log(spec.stop) - Math.log(spec.start)) * t)
        : spec.start + (spec.stop - spec.start) * t
    const doc: Experiment =
      spec.parameter === 'frequency'
        ? { ...snapshot, version: 2, analysis: { mode: 'ac', frequency: x } }
        : {
            ...snapshot,
            devices: snapshot.devices.map((d) =>
              d.id === spec.parameter ? { ...d, value: x } : d,
            ),
          }
    const analysis = analyze(doc)
    const y = analysis.ok ? (analysis.readings[spec.device]?.[spec.measure] ?? null) : null
    points.push({
      x,
      y,
      diagnostic: analysis.ok ? (y === null ? 'Measurement unavailable.' : '') : analysis.message,
    })
    progress?.(i + 1)
  }
  return {
    snapshot,
    signature: electricalSignature(snapshot),
    spec: { ...spec },
    points,
    xLabel: parameter?.label ?? 'Frequency',
    xUnit: parameter ? valueUnit(parameter.kind) : 'Hz',
    yLabel: `${snapshot.devices.find((d) => d.id === spec.device)!.label} · ${measures[spec.measure].label}`,
    yUnit: measures[spec.measure].unit,
  }
}
