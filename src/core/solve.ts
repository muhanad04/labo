import { parseExperiment, ports, settings, terminal } from './circuit'
import { admittance, impedance } from './impedance'
import type { Device, Experiment, Port, Terminal } from './circuit'
import { linearSolve } from './linear'

export interface Reading {
  voltage: number | null
  current: number | null
  power: number | null
  voltagePhase?: number | null
  currentPhase?: number | null
  reactivePower?: number | null
  apparentPower?: number | null
  powerFactor?: number | null
  loss?: number | null
  coreLoss?: number | null
  inputPower?: number | null
  outputPower?: number | null
  secondaryVoltage?: number | null
  secondaryCurrent?: number | null
  secondaryVoltagePhase?: number | null
  secondaryCurrentPhase?: number | null
  impedanceReal?: number | null
  impedanceImag?: number | null
  impedanceMagnitude?: number | null
  impedancePhase?: number | null
}
export type Analysis =
  | { ok: false; message: string; deviceIds: string[] }
  | {
      ok: true
      mode: 'dc' | 'ac'
      readings: Record<string, Reading>
      nets: Record<Terminal, string>
      potentials: Record<string, number>
      residual: number
      powerBalance: number
      reactiveBalance: number
    }
type Phasor = [number, number]
const subtract = (a: Phasor, b: Phasor): Phasor => [a[0] - b[0], a[1] - b[1]]
const magnitude = (a: Phasor) => Math.hypot(...a)
const phase = (a: Phasor) =>
  magnitude(a) < 1e-12 ? null : (Math.atan2(a[1], a[0]) * 180) / Math.PI
class Nodes {
  private parent = new Map<string, string>()
  find(key: string): string {
    const parent = this.parent.get(key)
    if (!parent) {
      this.parent.set(key, key)
      return key
    }
    if (parent === key) return key
    const root = this.find(parent)
    this.parent.set(key, root)
    return root
  }
  join(a: string, b: string) {
    this.parent.set(this.find(a), this.find(b))
  }
}

/** Pure MNA: signed DC or RMS sinusoidal phasors at one declared frequency. Never transient data. */
export function analyze(input: Experiment): Analysis {
  let doc: Experiment
  try {
    doc = parseExperiment(input)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Invalid circuit.',
      deviceIds: [],
    }
  }
  if (!doc.devices.length) return { ok: false, message: 'Empty circuit.', deviceIds: [] }
  const { mode, frequency } = settings(doc),
    ac = mode === 'ac'
  const reactive = doc.devices.filter(
    (d) => d.kind === 'inductor' || d.kind === 'capacitor' || d.kind === 'transformer',
  )
  if (!ac && reactive.length)
    return {
      ok: false,
      message: 'Inductors/capacitors/transformers require AC analysis in this version.',
      deviceIds: reactive.map((d) => d.id),
    }
  const grounds = doc.devices.filter((d) => d.kind === 'ground')
  if (!grounds.length)
    return {
      ok: false,
      message: 'Missing reference: connect a reference terminal to the circuit.',
      deviceIds: [],
    }
  const nodes = new Nodes()
  for (const d of doc.devices) for (const p of ports(d)) nodes.find(terminal(d.id, p))
  for (const w of doc.wires) nodes.join(w.from, w.to)
  for (const d of grounds) nodes.join(terminal(d.id, 'p'), terminal(grounds[0].id, 'p'))
  const ref = nodes.find(terminal(grounds[0].id, 'p'))
  const nets = Object.fromEntries(
    doc.devices.flatMap((d) =>
      ports(d).map((p) => [terminal(d.id, p), nodes.find(terminal(d.id, p))]),
    ),
  ) as Record<Terminal, string>
  const net = (d: Device, p: Port) => nets[terminal(d.id, p)]
  const conductive = doc.devices.filter((d) => !['ground', 'voltmeter'].includes(d.kind))
  const adjacency = new Map<string, Set<string>>()
  for (const d of conductive) {
    if (d.kind === 'switch' && !d.closed) continue
    const pairs: [Port, Port][] =
      d.kind === 'transformer'
        ? [
            ['p', 'n'],
            ['s', 't'],
          ]
        : [['p', 'n']]
    for (const [positive, negative] of pairs) {
      const a = net(d, positive),
        b = net(d, negative)
      if (!adjacency.has(a)) adjacency.set(a, new Set())
      if (!adjacency.has(b)) adjacency.set(b, new Set())
      adjacency.get(a)!.add(b)
      adjacency.get(b)!.add(a)
    }
  }
  const reachable = new Set([ref]),
    queue = [ref]
  for (let i = 0; i < queue.length; i++)
    for (const next of adjacency.get(queue[i]) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  const floating = conductive.filter((d) => ports(d).some((p) => !reachable.has(net(d, p))))
  if (floating.length)
    return {
      ok: false,
      message: `Floating connection at ${floating.map((d) => d.label).join(', ')}. Connect each subnetwork to a reference.`,
      deviceIds: floating.map((d) => d.id),
    }
  const activeNets = [...new Set(conductive.flatMap((d) => ports(d).map((p) => net(d, p))))].filter(
    (n) => n !== ref,
  )
  const indices = new Map(activeNets.map((n, i) => [n, i]))
  const branches = conductive.flatMap((d) => {
    const primary = { device: d, positive: 'p' as Port, negative: 'n' as Port, secondary: false }
    if (d.kind === 'transformer')
      return [primary, { device: d, positive: 's' as Port, negative: 't' as Port, secondary: true }]
    return d.kind === 'source' || d.kind === 'ammeter' || (d.kind === 'switch' && d.closed)
      ? [primary]
      : []
  })
  const n = activeNets.length + branches.length,
    size = ac ? 2 * n : n
  const matrix = Array.from({ length: size }, () => Array<number>(size).fill(0))
  const rhs = Array<number>(size).fill(0)
  function stamp(row: number | undefined, col: number | undefined, re: number, im = 0) {
    if (row === undefined || col === undefined) return
    matrix[row][col] += re
    if (ac) {
      matrix[row][col + n] -= im
      matrix[row + n][col] += im
      matrix[row + n][col + n] += re
    }
  }
  for (const d of conductive) {
    if (!['resistor', 'inductor', 'capacitor', 'transformer'].includes(d.kind)) continue
    const p = indices.get(net(d, 'p')),
      m = indices.get(net(d, 'n')),
      [g, b] =
        d.kind === 'transformer'
          ? [d.transformer!.coreResistance ? 1 / d.transformer!.coreResistance : 0, 0]
          : admittance(d, frequency)
    stamp(p, p, g, b)
    stamp(m, m, g, b)
    stamp(p, m, -g, -b)
    stamp(m, p, -g, -b)
  }
  branches.forEach((winding, i) => {
    const d = winding.device
    const branch = activeNets.length + i,
      p = indices.get(net(d, winding.positive)),
      m = indices.get(net(d, winding.negative))
    stamp(p, branch, 1)
    stamp(m, branch, -1)
    stamp(branch, p, 1)
    stamp(branch, m, -1)
    if (d.kind === 'transformer') {
      const model = d.transformer!,
        w = 2 * Math.PI * frequency
      const self = model.primaryInductance / (winding.secondary ? d.value * d.value : 1)
      const mutual = (model.coupling * model.primaryInductance) / d.value
      stamp(
        branch,
        branch,
        -(winding.secondary ? model.secondaryResistance : model.primaryResistance),
        -w * self,
      )
      stamp(branch, branch + (winding.secondary ? -1 : 1), 0, -w * mutual)
    }
    if (d.kind === 'source') {
      stamp(branch, branch, -(d.seriesResistance ?? 0))
      const angle = ac ? ((d.phase ?? 0) * Math.PI) / 180 : 0
      rhs[branch] = d.value * Math.cos(angle)
      if (ac) rhs[branch + n] = d.value * Math.sin(angle)
    }
  })
  const solution = linearSolve(matrix, rhs)
  if (!solution)
    return {
      ok: false,
      message:
        'No unique ideal-circuit solution. Check source shorts, ideal loops and resonant lossless networks.',
      deviceIds: [...new Set(branches.map((b) => b.device.id))],
    }
  const residual = matrix.reduce((max, row, i) => {
    const error = Math.abs(row.reduce((sum, v, j) => sum + v * solution[j], 0) - rhs[i])
    return Math.max(
      max,
      error /
        Math.max(
          1,
          Math.abs(rhs[i]),
          row.reduce((sum, v, j) => sum + Math.abs(v * solution[j]), 0),
        ),
    )
  }, 0)
  if (residual > 1e-8)
    return {
      ok: false,
      message: 'Unreliable numerical solution. Reduce the range of values or simplify the circuit.',
      deviceIds: [],
    }
  const phasors: Record<string, Phasor> = { [ref]: [0, 0] }
  activeNets.forEach((key, i) => {
    phasors[key] = [solution[i], ac ? solution[i + n] : 0]
  })
  const branchCurrents = new Map(
    branches.map((b, i) => [
      b.secondary ? `${b.device.id}:secondary` : b.device.id,
      [solution[activeNets.length + i], ac ? solution[activeNets.length + i + n] : 0] as Phasor,
    ]),
  )
  const readings: Record<string, Reading> = {}
  for (const d of doc.devices) {
    if (d.kind === 'ground') {
      readings[d.id] = { voltage: 0, current: null, power: null }
      continue
    }
    const vp = phasors[net(d, 'p')],
      vn = phasors[net(d, 'n')]
    const v = vp && vn ? subtract(vp, vn) : null
    let current: Phasor | null = null
    if (d.kind === 'switch' && !d.closed) current = [0, 0]
    else if (v && ['resistor', 'inductor', 'capacitor'].includes(d.kind)) {
      const [g, b] = admittance(d, frequency)
      current = [v[0] * g - v[1] * b, v[0] * b + v[1] * g]
    } else if (d.kind !== 'voltmeter') current = branchCurrents.get(d.id) ?? null
    let p = v && current ? v[0] * current[0] + v[1] * current[1] : null
    let q = v && current ? v[1] * current[0] - v[0] * current[1] : null
    let apparent: number | null = v && current ? magnitude(v) * magnitude(current) : null
    const extra: Partial<Reading> = {}
    const z = impedance(d, frequency)
    if (z && d.kind !== 'source') {
      extra.impedanceReal = z[0]
      extra.impedanceImag = z[1]
      extra.impedanceMagnitude = magnitude(z)
      extra.impedancePhase = phase(z)
    }
    if (current && d.seriesResistance !== undefined)
      extra.loss = magnitude(current) ** 2 * d.seriesResistance
    if (d.kind === 'transformer' && v && current) {
      const model = d.transformer!,
        windingCurrent = current
      const secondary = subtract(phasors[net(d, 's')], phasors[net(d, 't')])
      const secondaryCurrent = branchCurrents.get(`${d.id}:secondary`)!
      const coreCurrent: Phasor = model.coreResistance
        ? [v[0] / model.coreResistance, v[1] / model.coreResistance]
        : [0, 0]
      current = [windingCurrent[0] + coreCurrent[0], windingCurrent[1] + coreCurrent[1]]
      const input = v[0] * current[0] + v[1] * current[1],
        output = -(secondary[0] * secondaryCurrent[0] + secondary[1] * secondaryCurrent[1])
      p = input - output
      q =
        v[1] * current[0] -
        v[0] * current[1] +
        secondary[1] * secondaryCurrent[0] -
        secondary[0] * secondaryCurrent[1]
      apparent = null // A four-terminal device has no single |V||I| apparent-power channel.
      Object.assign(extra, {
        inputPower: input,
        outputPower: output,
        secondaryVoltage: magnitude(secondary),
        secondaryCurrent: magnitude(secondaryCurrent),
        secondaryVoltagePhase: phase(secondary),
        secondaryCurrentPhase: phase(secondaryCurrent),
        loss:
          magnitude(windingCurrent) ** 2 * model.primaryResistance +
          magnitude(secondaryCurrent) ** 2 * model.secondaryResistance,
        coreLoss: model.coreResistance ? magnitude(v) ** 2 / model.coreResistance : 0,
      })
    }
    readings[d.id] = {
      voltage: v ? (ac ? magnitude(v) : v[0]) : null,
      current: current ? (ac ? magnitude(current) : current[0]) : null,
      power: p,
      ...extra,
      ...(ac
        ? {
            voltagePhase: v ? phase(v) : null,
            currentPhase: current ? phase(current) : null,
            reactivePower: q,
            apparentPower: apparent,
            powerFactor: apparent && p !== null ? Math.min(1, Math.abs(p) / apparent) : null,
          }
        : {}),
    }
  }
  // JSON has only one zero. Canonicalize signed zero before display/snapshot persistence.
  for (const reading of Object.values(readings))
    for (const key of Object.keys(reading) as (keyof Reading)[])
      if (reading[key] === 0) reading[key] = 0
  const powerBalance = Object.values(readings).reduce((sum, r) => sum + (r.power ?? 0), 0)
  const reactiveBalance = Object.values(readings).reduce(
    (sum, r) => sum + (r.reactivePower ?? 0),
    0,
  )
  return {
    ok: true,
    mode,
    readings,
    nets,
    potentials: Object.fromEntries(
      Object.entries(phasors).map(([key, v]) => [key, ac ? magnitude(v) : v[0]]),
    ),
    residual,
    powerBalance,
    reactiveBalance,
  }
}
