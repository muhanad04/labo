import { z } from 'zod'

const legacyKinds = ['source', 'resistor', 'ammeter', 'voltmeter', 'ground', 'switch'] as const
const v2Kinds = [...legacyKinds, 'inductor', 'capacitor'] as const
export const kinds = [...v2Kinds, 'transformer'] as const
export type Kind = (typeof kinds)[number]
export type Port = 'p' | 'n' | 's' | 't'
export interface TransformerModel {
  primaryInductance: number
  coupling: number
  primaryResistance: number
  secondaryResistance: number
  coreResistance: number | null
}
export const defaultTransformer: TransformerModel = {
  primaryInductance: 1,
  coupling: 0.995,
  primaryResistance: 1,
  secondaryResistance: 0.25,
  coreResistance: 10000,
}
export function portLabel(port: Port) {
  return { p: '+', n: '−', s: 'S+', t: 'S−' }[port]
}
export type Terminal = `${string}:${Port}`
export interface Device {
  id: string
  kind: Kind
  label: string
  value: number
  closed: boolean
  phase?: number
  seriesResistance?: number
  transformer?: TransformerModel
}
export interface Wire {
  id: string
  from: Terminal
  to: Terminal
  color: string
  points?: Point[]
  slack?: number
}
export interface Point {
  x: number
  y: number
}
export interface Experiment {
  version: 1 | 2 | 3 | 4
  analysis?: { mode: 'dc' | 'ac'; frequency: number }
  title: string
  devices: Device[]
  wires: Wire[]
  positions: Record<string, Point>
}

export const deviceNames: Record<Kind, string> = {
  source: 'Voltage source',
  resistor: 'Resistor',
  ammeter: 'Ammeter',
  voltmeter: 'Voltmeter',
  ground: 'Reference',
  switch: 'Switch',
  inductor: 'Inductor',
  capacitor: 'Capacitor',
  transformer: 'Transformer',
}
export function ports(device: Device): Port[] {
  return device.kind === 'ground'
    ? ['p']
    : device.kind === 'transformer'
      ? ['p', 'n', 's', 't']
      : ['p', 'n']
}
export function terminal(id: string, port: Port): Terminal {
  return `${id}:${port}`
}

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/)
const endpoint = z.string().regex(/^[a-zA-Z0-9_-]{1,64}:[pn]$/)
const schemaV1 = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(1).max(100),
    devices: z
      .array(
        z
          .object({
            id,
            kind: z.enum(legacyKinds),
            label: z.string().trim().min(1).max(40),
            value: z.number().finite(),
            closed: z.boolean(),
          })
          .strict(),
      )
      .max(40),
    wires: z
      .array(
        z
          .object({
            id,
            from: endpoint,
            to: endpoint,
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          })
          .strict(),
      )
      .max(120),
    positions: z.record(
      id,
      z.object({ x: z.number().min(0).max(1000), y: z.number().min(0).max(620) }).strict(),
    ),
  })
  .strict()

const schemaV2 = schemaV1
  .extend({
    version: z.literal(2),
    analysis: z
      .object({ mode: z.enum(['dc', 'ac']), frequency: z.number().min(0.01).max(1e6) })
      .strict()
      .optional(),
    devices: z
      .array(
        z
          .object({
            id,
            kind: z.enum(v2Kinds),
            label: z.string().trim().min(1).max(40),
            value: z.number().finite(),
            closed: z.boolean(),
            phase: z.number().min(-360).max(360).optional(),
          })
          .strict(),
      )
      .max(40),
    wires: z
      .array(
        z
          .object({
            id,
            from: endpoint,
            to: endpoint,
            color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            points: z
              .array(
                z
                  .object({ x: z.number().min(0).max(1200), y: z.number().min(0).max(800) })
                  .strict(),
              )
              .max(12)
              .optional(),
          })
          .strict(),
      )
      .max(120),
  })
  .strict()
const schemaV3 = schemaV2
  .extend({
    version: z.literal(3),
    devices: z
      .array(
        schemaV2.shape.devices.element
          .extend({
            kind: z.enum(kinds),
            seriesResistance: z.number().min(0).max(1e6).optional(),
            transformer: z
              .object({
                primaryInductance: z.number().min(1e-6).max(1e6),
                coupling: z.number().min(0.0001).max(1),
                primaryResistance: z.number().min(0).max(1e6),
                secondaryResistance: z.number().min(0).max(1e6),
                coreResistance: z.number().min(0.001).max(1e12).nullable(),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .max(40),
    wires: z
      .array(
        schemaV2.shape.wires.element
          .extend({
            from: z.string().regex(/^[a-zA-Z0-9_-]{1,64}:[pnst]$/),
            to: z.string().regex(/^[a-zA-Z0-9_-]{1,64}:[pnst]$/),
            slack: z.number().min(-200).max(300).optional(),
          })
          .strict(),
      )
      .max(120),
  })
  .strict()
// Safety guard against pathological coordinates, not the old 1200×800 workspace edge.
export const LAYOUT_LIMIT = 100_000
export const ROUTE_LIMIT = LAYOUT_LIMIT + 1200
const workspacePoint = z.object({
  x: z.number().finite().min(-LAYOUT_LIMIT).max(LAYOUT_LIMIT),
  y: z.number().finite().min(-LAYOUT_LIMIT).max(LAYOUT_LIMIT),
}).strict()
const schemaV4 = schemaV3.extend({
  version: z.literal(4),
  positions: z.record(id, workspacePoint),
  wires: z.array(schemaV3.shape.wires.element.extend({
    points: z.array(z.object({
      x: z.number().finite().min(-ROUTE_LIMIT).max(ROUTE_LIMIT),
      y: z.number().finite().min(-ROUTE_LIMIT).max(ROUTE_LIMIT),
    }).strict()).max(12).optional(),
  }).strict()).max(120),
}).strict()
const schema = z.union([schemaV1, schemaV2, schemaV3, schemaV4])
export function settings(doc: Experiment) {
  return doc.analysis ?? { mode: 'dc' as const, frequency: 50 }
}
export function valueUnit(kind: Kind) {
  return kind === 'source'
    ? 'V'
    : kind === 'resistor'
      ? 'Ω'
      : kind === 'inductor'
        ? 'H'
        : kind === 'capacitor'
          ? 'F'
          : ''
}
export function validValue(kind: Kind, value: number) {
  if (!Number.isFinite(value)) return false
  if (kind === 'source') return Math.abs(value) <= 1e6
  if (kind === 'resistor') return value >= 0.001 && value <= 1e9
  if (kind === 'inductor') return value >= 1e-9 && value <= 1e6
  if (kind === 'capacitor') return value >= 1e-12 && value <= 1e3
  if (kind === 'transformer') return value >= 0.01 && value <= 100
  return true
}

/** Both version readers remain strict. Old files are never destructively rewritten on read. */
export function parseExperiment(input: unknown): Experiment {
  const result = schema.safeParse(input)
  if (!result.success)
    throw new Error('Unsupported labo circuit. Check its version, fields, values, and size limits.')
  const doc = result.data
  const ids = new Set(doc.devices.map((d) => d.id))
  if (
    ids.size !== doc.devices.length ||
    new Set(doc.wires.map((w) => w.id)).size !== doc.wires.length
  ) {
    throw new Error('Project IDs must be unique.')
  }
  if (new Set(doc.devices.map((d) => d.label)).size !== doc.devices.length)
    throw new Error('Module labels must be unique.')
  const terminals = new Set(doc.devices.flatMap((d) => ports(d).map((p) => terminal(d.id, p))))
  for (const d of doc.devices) {
    if (
      'seriesResistance' in d &&
      d.seriesResistance !== undefined &&
      !['source', 'inductor', 'capacitor'].includes(d.kind)
    )
      throw new Error('Series resistance belongs to a source, inductor or capacitor.')
    if (d.kind === 'transformer' && !('transformer' in d && d.transformer))
      throw new Error('Transformer winding parameters are required.')
    if ('transformer' in d && d.transformer && d.kind !== 'transformer')
      throw new Error('Unexpected transformer parameters.')
    if (d.kind === 'resistor' && (d.value < 0.001 || d.value > 1e9))
      throw new Error('Resistance must be between 0.001 Ω and 1 GΩ.')
    if (!validValue(d.kind, d.value)) throw new Error(`Invalid ${deviceNames[d.kind]} value.`)
    if (settings(doc as Experiment).mode === 'ac' && d.kind === 'source' && d.value < 0)
      throw new Error('AC source RMS magnitude cannot be negative; use phase for polarity.')
    if (!Object.hasOwn(doc.positions, d.id)) throw new Error('Every module needs a bench position.')
  }
  if (Object.keys(doc.positions).some((key) => !ids.has(key)))
    throw new Error('Project contains an unknown module position.')
  const pairs = new Set<string>()
  for (const w of doc.wires) {
    if (!terminals.has(w.from as Terminal) || !terminals.has(w.to as Terminal))
      throw new Error('A wire refers to a missing terminal.')
    if (w.from === w.to) throw new Error('A wire must connect two different terminals.')
    const pair = [w.from, w.to].sort().join('|')
    if (pairs.has(pair)) throw new Error('Duplicate wires are not supported.')
    pairs.add(pair)
  }
  return doc as Experiment
}

/** Accept a plain number or an engineering suffix; never evaluate expressions. */
export function parseQuantity(text: string): number | null {
  const match = text.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([pnumkMG]?)$/)
  if (!match) return null
  const scale: Record<string, number> = {
    '': 1,
    p: 1e-12,
    n: 1e-9,
    u: 1e-6,
    m: 1e-3,
    k: 1e3,
    M: 1e6,
    G: 1e9,
  }
  const value = Number(match[1]) * scale[match[2]]
  return Number.isFinite(value) ? value : null
}

export function formatQuantity(value: number | null, unit: string, digits = 5): string {
  if (value === null || !Number.isFinite(value)) return `— ${unit}`
  const abs = Math.abs(value)
  const [scale, prefix] =
    abs >= 1e6
      ? [1e6, 'M']
      : abs >= 1e3
        ? [1e3, 'k']
        : abs > 0 && abs < 1e-3
          ? [1e-6, 'µ']
          : abs > 0 && abs < 1
            ? [1e-3, 'm']
            : [1, '']
  return `${Number((value / scale).toPrecision(Math.max(3, Math.min(7, digits))))} ${prefix}${unit}`
}

export function blank(): Experiment {
  return { version: 1, title: 'Untitled investigation', devices: [], wires: [], positions: {} }
}

export function example(name: 'ohm' | 'divider' = 'ohm'): Experiment {
  const devices: Device[] = [
    { id: 's1', kind: 'source', label: 'Source', value: 10, closed: true },
    { id: 'r1', kind: 'resistor', label: 'R1', value: 1000, closed: true },
    { id: 'a1', kind: 'ammeter', label: 'A1', value: 0, closed: true },
    { id: 'v1', kind: 'voltmeter', label: 'V1', value: 0, closed: true },
    { id: 'g1', kind: 'ground', label: 'Reference', value: 0, closed: true },
  ]
  const positions = {
    s1: { x: 80, y: 100 },
    r1: { x: 410, y: 100 },
    a1: { x: 410, y: 350 },
    v1: { x: 740, y: 100 },
    g1: { x: 80, y: 350 },
  }
  const links: [Terminal, Terminal, string][] = [
    ['s1:p', 'r1:p', '#b64c38'],
    ['r1:n', 'a1:p', '#205c47'],
    ['a1:n', 's1:n', '#50677f'],
    ['s1:n', 'g1:p', '#50677f'],
    ['r1:p', 'v1:p', '#b64c38'],
    ['r1:n', 'v1:n', '#50677f'],
  ]
  if (name === 'divider') {
    devices.push({ id: 'r2', kind: 'resistor', label: 'R2', value: 1000, closed: true })
    Object.assign(positions, { r2: { x: 740, y: 350 } })
    links[1] = ['r1:n', 'r2:p', '#205c47']
    links[4] = ['r2:p', 'v1:p', '#b64c38']
    links[5] = ['r2:n', 'v1:n', '#50677f']
    links.push(['r2:n', 'a1:p', '#205c47'])
  }
  return {
    version: 1,
    title: name === 'ohm' ? 'Ohm’s law investigation' : 'The voltage divider',
    devices,
    positions,
    wires: links.map(([from, to, color], i) => ({ id: `w${i}`, from, to, color })),
  }
}
