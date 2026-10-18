import { defaultTransformer, example } from './circuit'
import type { Device, Experiment, Terminal, Wire } from './circuit'

export function acExample(): Experiment {
  const doc = example()
  return {
    ...doc,
    version: 2,
    title: 'Series RL · 50 Hz',
    analysis: { mode: 'ac', frequency: 50 },
    devices: [
      ...doc.devices.map((d) => (d.id === 'r1' ? { ...d, value: 100 } : d)),
      { id: 'l1', kind: 'inductor', label: 'L1', value: 1 / Math.PI, closed: true },
    ],
    positions: { ...doc.positions, l1: { x: 740, y: 350 } },
    wires: [
      ...doc.wires.map((w) => (w.id === 'w1' ? { ...w, to: 'l1:p' as Terminal } : w)),
      { id: 'wl', from: 'l1:n', to: 'a1:p', color: '#2b2b2b' },
    ],
  }
}
export function threePhaseExample(): Experiment {
  const devices: Device[] = [],
    wires: Wire[] = [],
    positions: Experiment['positions'] = {}
  function wire(from: Terminal, to: Terminal) {
    wires.push({ id: `w${wires.length}`, from, to, color: '#2b2b2b' })
  }
  for (let i = 0; i < 3; i++) {
    devices.push(
      {
        id: `s${i}`,
        kind: 'source',
        label: ['EA', 'EB', 'EC'][i],
        value: 230,
        phase: [0, -120, 120][i],
        closed: true,
      },
      { id: `r${i}`, kind: 'resistor', label: ['RA', 'RB', 'RC'][i], value: 100, closed: true },
    )
    positions[`s${i}`] = { x: 50, y: 30 + i * 200 }
    positions[`r${i}`] = { x: 380, y: 30 + i * 200 }
    wire(`s${i}:p`, `r${i}:p`)
    wire(`s${i}:n`, 'g1:p')
    if (i) wire(`r${i}:n`, 'g1:p')
  }
  devices.push(
    { id: 'g1', kind: 'ground', label: 'N', value: 0, closed: true },
    { id: 'v1', kind: 'voltmeter', label: 'EAB', value: 0, closed: true },
    { id: 'a1', kind: 'ammeter', label: 'IA', value: 0, closed: true },
  )
  positions.g1 = { x: 50, y: 620 }
  positions.v1 = { x: 740, y: 30 }
  positions.a1 = { x: 740, y: 230 }
  wire('r0:n', 'a1:p')
  wire('a1:n', 'g1:p')
  wire('v1:p', 's0:p')
  wire('v1:n', 's1:p')
  return {
    version: 2,
    title: 'Balanced wye · 230 V RMS',
    analysis: { mode: 'ac', frequency: 50 },
    devices,
    wires,
    positions,
  }
}

export function transformerExample(): Experiment {
  const devices: Device[] = [
    { id: 's1', kind: 'source', label: 'Source', value: 120, closed: true, seriesResistance: 0.5 },
    {
      id: 't1',
      kind: 'transformer',
      label: 'T1',
      value: 2,
      closed: true,
      transformer: {
        ...defaultTransformer,
        primaryInductance: 2,
        primaryResistance: 2,
        secondaryResistance: 0.5,
        coreResistance: 20000,
      },
    },
    { id: 'r1', kind: 'resistor', label: 'Load', value: 100, closed: true },
    { id: 'a1', kind: 'ammeter', label: 'A1', value: 0, closed: true },
    { id: 'v1', kind: 'voltmeter', label: 'VP', value: 0, closed: true },
    { id: 'v2', kind: 'voltmeter', label: 'VS', value: 0, closed: true },
    { id: 'g1', kind: 'ground', label: 'Reference', value: 0, closed: true },
  ]
  const links: [Terminal, Terminal][] = [
    ['s1:p', 't1:p'],
    ['s1:n', 'g1:p'],
    ['t1:n', 'g1:p'],
    ['t1:s', 'r1:p'],
    ['r1:n', 'a1:p'],
    ['a1:n', 't1:t'],
    ['t1:t', 'g1:p'],
    ['v1:p', 't1:p'],
    ['v1:n', 't1:n'],
    ['v2:p', 't1:s'],
    ['v2:n', 't1:t'],
  ]
  return {
    version: 3,
    title: 'Loaded transformer · 2:1',
    analysis: { mode: 'ac', frequency: 50 },
    devices,
    positions: {
      s1: { x: 60, y: 80 },
      t1: { x: 400, y: 80 },
      r1: { x: 740, y: 80 },
      v1: { x: 60, y: 350 },
      v2: { x: 400, y: 350 },
      a1: { x: 740, y: 350 },
      g1: { x: 60, y: 590 },
    },
    wires: links.map(([from, to], i) => ({ id: `tw${i}`, from, to, color: '#345c94' })),
  }
}
