import { z } from 'zod'
import { create } from 'zustand'
import {
  blank,
  LAYOUT_LIMIT,
  example,
  parseExperiment,
  ports,
  terminal,
} from '../core/circuit'
import { automaticWireColor, autoColorWires } from '../core/wiring'
import { deviceModelDefaults, withModelDefaults } from '../core/modelDefaults'
import { deleteDevices, duplicateDevices, moveDevices } from '../core/edit'
import type { Device, Experiment, Kind, Point, Terminal } from '../core/circuit'
import type { Analysis, Reading } from '../core/solve'

export interface Observation {
  id: string
  at: string
  title: string
  experiment: Experiment
  values: (Reading & { label: string })[]
}
export interface ProjectFile {
  format: 'labo-project'
  version: 4
  experiment: Experiment
  observations: Observation[]
}
export const STORAGE_KEY = 'labo.project.v4'
export const PREVIOUS_STORAGE_KEY = 'labo.project.v3'
export const V2_STORAGE_KEY = 'labo.project.v2'
export const LEGACY_STORAGE_KEY = 'labo.project.v1'
export const RECOVERY_KEY = 'labo.project.v4.previous'
const LIMIT = 2_000_000
const nullable = z.number().finite().nullable()
const fileSchema = z
  .object({
    format: z.literal('labo-project'),
    version: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    experiment: z.unknown(),
    observations: z
      .array(
        z
          .object({
            id: z.string().max(100),
            at: z.iso.datetime(),
            title: z.string().max(100),
            experiment: z.unknown(),
            values: z
              .array(
                z
                  .object({
                    label: z.string().max(40),
                    voltage: nullable,
                    current: nullable,
                    power: nullable,
                    voltagePhase: nullable.optional(),
                    currentPhase: nullable.optional(),
                    reactivePower: nullable.optional(),
                    apparentPower: nullable.optional(),
                    powerFactor: nullable.optional(),
                    loss: nullable.optional(),
                    coreLoss: nullable.optional(),
                    inputPower: nullable.optional(),
                    outputPower: nullable.optional(),
                    secondaryVoltage: nullable.optional(),
                    secondaryCurrent: nullable.optional(),
                    secondaryVoltagePhase: nullable.optional(),
                    secondaryCurrentPhase: nullable.optional(),
                    impedanceReal: nullable.optional(),
                    impedanceImag: nullable.optional(),
                    impedanceMagnitude: nullable.optional(),
                    impedancePhase: nullable.optional(),
                  })
                  .strict(),
              )
              .max(40),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()

export function decodeProject(text: string): ProjectFile {
  if (text.length > LIMIT) throw new Error('Project is too large. The limit is 2 MB of JSON text.')
  const parsed = fileSchema.safeParse(JSON.parse(text))
  if (!parsed.success)
    throw new Error(
      'Unsupported project file. Import a labo v1–v4 project, not a vendor file.',
    )
  return {
    ...parsed.data,
    version: 4,
    experiment: parseExperiment(parsed.data.experiment),
    observations: parsed.data.observations.map((n) => ({
      ...n,
      experiment: parseExperiment(n.experiment),
    })),
  }
}

function loadInitial(): { file: ProjectFile; storage: string } {
  const fallback: ProjectFile = {
    format: 'labo-project',
    version: 4,
    experiment: withModelDefaults(example()),
    observations: [],
  }
  try {
    const saved =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(PREVIOUS_STORAGE_KEY) ??
      localStorage.getItem(V2_STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY)
    return saved
      ? { file: decodeProject(saved), storage: 'Restored locally' }
      : { file: fallback, storage: 'Not saved' }
  } catch {
    return {
      file: fallback,
      storage:
        'Saved project could not be read. Original storage is unchanged; export before editing.',
    }
  }
}
function save(experiment: Experiment, observations: Observation[]): string {
  try {
    const json = JSON.stringify({ format: 'labo-project', version: 4, experiment, observations })
    if (json.length > LIMIT) return 'Autosave limit reached. Export your project before continuing.'
    const previous = localStorage.getItem(STORAGE_KEY)
    if (previous && previous !== json) {
      // A malformed active file must never destroy the last valid recovery copy.
      let valid = false
      try {
        decodeProject(previous)
        valid = true
      } catch {
        /* keep prior recovery */
      }
      if (valid) localStorage.setItem(RECOVERY_KEY, previous)
    }
    localStorage.setItem(STORAGE_KEY, json)
    return 'Saved on this browser'
  } catch {
    return 'Local save unavailable. Export your project to keep your work.'
  }
}

interface ProjectState {
  experiment: Experiment
  observations: Observation[]
  revision: number
  selected: string | null
  selectedIds: string[]
  snap: boolean
  precision: number
  reconnecting: { id: string; end: 'from' | 'to' } | null
  selectedWire: string | null
  wireColor: string
  autoWireColor: boolean
  pending: Terminal | null
  highlighted: Terminal | null
  past: Experiment[]
  future: Experiment[]
  storage: string
  notice: string
  commit: (doc: Experiment) => void
  replace: (file: ProjectFile) => void
  select: (id: string | null, additive?: boolean) => void
  selectAll: () => void
  duplicate: () => void
  removeSelected: () => void
  setSnap: (snap: boolean) => void
  setPrecision: (digits: number) => void
  setAnalysis: (mode: 'dc' | 'ac', frequency: number) => void
  beginReconnect: (id: string, end: 'from' | 'to') => void
  reconnectWire: (id: string, end: 'from' | 'to', target: Terminal) => void
  setWireSlack: (id: string, slack: number | null) => void
  connectPair: (from: Terminal, to: Terminal) => void
  setAutoWireColor: (enabled: boolean) => void
  selectWire: (id: string) => void
  setWireColor: (color: string) => void
  recolorWire: (id: string, color: string) => void
  clearWires: () => void
  connect: (port: Terminal) => void
  cancel: () => void
  add: (kind: Kind, losses?: boolean, at?: Point) => void
  update: (
    id: string,
    change: Partial<
      Pick<Device, 'label' | 'value' | 'closed' | 'phase' | 'seriesResistance' | 'transformer'>
    >,
  ) => void
  move: (id: string, point: Point) => void
  remove: (id: string) => void
  removeWire: (id: string) => void
  undo: () => void
  redo: () => void
  record: (analysis: Analysis) => void
  clearNotes: () => void
}
const initial = loadInitial()
export const useProject = create<ProjectState>((set, get) => ({
  experiment: initial.file.experiment,
  observations: initial.file.observations,
  revision: 0,
  selected: null,
  selectedIds: [],
  snap: false,
  precision: 5,
  reconnecting: null,
  selectedWire: null,
  wireColor: '#2b2b2b',
  autoWireColor: false,
  pending: null,
  highlighted: null,
  past: [],
  future: [],
  storage: initial.storage,
  notice: '',
  commit(doc) {
    if (
      doc.devices.some(
        (d) =>
          d.kind === 'transformer' ||
          d.seriesResistance !== undefined ||
          d.transformer !== undefined,
      ) ||
      doc.wires.some((w) => w.slack !== undefined)
    )
      doc = { ...doc, version: doc.version === 4 ? 4 : 3 }
    else if (
      doc.version !== 3 && doc.version !== 4 &&
      (doc.analysis ||
        doc.devices.some(
          (d) => d.phase !== undefined || d.kind === 'inductor' || d.kind === 'capacitor',
        ) ||
        doc.wires.some((w) => w.points !== undefined))
    )
      doc = { ...doc, version: 2 }
    try {
      parseExperiment(doc)
    } catch (e) {
      set({ notice: e instanceof Error ? e.message : 'Invalid edit.' })
      return
    }
    const state = get()
    if (state.autoWireColor) doc = autoColorWires(doc)
    set({
      experiment: doc,
      past: [...state.past.slice(-49), state.experiment],
      future: [],
      revision: state.revision + 1,
      storage: save(doc, state.observations),
      notice: '',
    })
  },
  replace(file) {
    // Validate even internal replacements so no call site bypasses import invariants.
    const checked = decodeProject(JSON.stringify(file))
    const experiment = get().autoWireColor ? autoColorWires(checked.experiment) : checked.experiment
    set({
      experiment,
      observations: checked.observations,
      selectedIds: [],
      reconnecting: null,
      past: [],
      future: [],
      selected: null,
      selectedWire: null,
      pending: null,
      highlighted: null,
      revision: get().revision + 1,
      storage: save(experiment, checked.observations),
      notice: '',
    })
  },
  select(id, additive = false) {
    const ids = id
      ? additive
        ? get().selectedIds.includes(id)
          ? get().selectedIds.filter((x) => x !== id)
          : [...get().selectedIds, id]
        : [id]
      : []
    set({ selected: ids.at(-1) ?? null, selectedIds: ids, selectedWire: null })
  },
  selectAll() {
    const ids = get().experiment.devices.map((d) => d.id)
    set({ selectedIds: ids, selected: ids.at(-1) ?? null, selectedWire: null })
  },
  duplicate() {
    const s = get()
    if (!s.selectedIds.length) return
    if (s.experiment.devices.length + s.selectedIds.length > 40) {
      set({ notice: 'Module limit: 40.' })
      return
    }
    const copy = duplicateDevices(s.experiment, s.selectedIds, () => crypto.randomUUID())
    const before = get().revision
    s.commit(copy.doc)
    if (get().revision !== before)
      set({ selectedIds: copy.ids, selected: copy.ids.at(-1) ?? null, selectedWire: null })
  },
  removeSelected() {
    const s = get()
    if (s.selectedWire) {
      s.removeWire(s.selectedWire)
      return
    }
    if (!s.selectedIds.length) return
    s.commit(deleteDevices(s.experiment, s.selectedIds))
    set({ selected: null, selectedIds: [], pending: null, highlighted: null, reconnecting: null })
  },
  setSnap(snap) {
    set({ snap })
  },
  setPrecision(precision) {
    if (Number.isInteger(precision) && precision >= 3 && precision <= 7) set({ precision })
  },
  setAnalysis(mode, frequency) {
    get().commit({
      ...get().experiment,
      version: get().experiment.version >= 3 ? get().experiment.version : 2,
      analysis: { mode, frequency },
    })
  },
  beginReconnect(id, end) {
    if (get().experiment.wires.some((w) => w.id === id))
      set({
        reconnecting: { id, end },
        pending: null,
        selectedWire: id,
        selected: null,
        selectedIds: [],
        notice: 'Select replacement terminal. Esc: cancel.',
      })
  },
  reconnectWire(id, end, target) {
    const s = get()
    s.commit({
      ...s.experiment,
      wires: s.experiment.wires.map((w) => (w.id === id ? { ...w, [end]: target } : w)),
    })
    set({ reconnecting: null, pending: null, highlighted: null })
  },
  setWireSlack(id, slack) {
    if (slack !== null && (!Number.isFinite(slack) || slack < -200 || slack > 300)) return
    const s = get()
    const wires = s.experiment.wires.map((w) => {
      if (w.id !== id) return w
      const next = { ...w }
      delete next.points
      delete next.slack
      return slack === null ? next : { ...next, slack }
    })
    s.commit({ ...s.experiment, version: s.experiment.version === 4 ? 4 : 3, wires })
  },
  setAutoWireColor(autoWireColor) {
    set({ autoWireColor })
    if (autoWireColor) {
      const state = get(),
        colored = autoColorWires(state.experiment)
      if (colored !== state.experiment) state.commit(colored)
    }
  },
  connectPair(from, to) {
    set({ pending: from, reconnecting: null })
    get().connect(to)
  },
  selectWire(id) {
    if (!get().experiment.wires.some((w) => w.id === id)) return
    set({
      selectedWire: id,
      selected: null,
      selectedIds: [],
      pending: null,
      highlighted: null,
      reconnecting: null,
      notice: '',
    })
  },
  setWireColor(color) {
    if (/^#[0-9a-fA-F]{6}$/.test(color)) set({ wireColor: color })
  },
  recolorWire(id, color) {
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return
    const { experiment, commit } = get()
    const wire = experiment.wires.find((w) => w.id === id)
    if (!wire || wire.color === color) return
    commit({
      ...experiment,
      wires: experiment.wires.map((w) => (w.id === id ? { ...w, color } : w)),
    })
  },
  clearWires() {
    const { experiment, commit } = get()
    if (!experiment.wires.length) return
    commit({ ...experiment, wires: [] })
    set({ selectedWire: null, pending: null, highlighted: null, reconnecting: null })
  },
  cancel() {
    set({ pending: null, highlighted: null, selectedWire: null, reconnecting: null, notice: '' })
  },
  connect(port) {
    const { pending, experiment, commit, reconnecting } = get()
    if (reconnecting) {
      get().reconnectWire(reconnecting.id, reconnecting.end, port)
      return
    }
    set({ highlighted: port, selectedWire: null })
    if (!pending) {
      set({ pending: port, notice: 'Choose a second terminal. Escape cancels.' })
      return
    }
    set({ pending: null })
    if (pending === port) {
      set({ notice: 'Connection cancelled.' })
      return
    }
    if (
      experiment.wires.some(
        (w) => (w.from === pending && w.to === port) || (w.to === pending && w.from === port),
      )
    ) {
      set({ notice: 'These terminals are already connected.' })
      return
    }
    commit({
      ...experiment,
      wires: [
        ...experiment.wires,
        {
          id: crypto.randomUUID(),
          from: pending,
          to: port,
          color: get().autoWireColor
            ? automaticWireColor(experiment, pending, port)
            : get().wireColor,
        },
      ],
    })
  },
  add(kind, losses = true, at) {
    const { experiment, commit, snap } = get()
    if (experiment.devices.length >= 40) { set({ notice: 'Equipment limit reached (40).' }); return }
    if (at && (!Number.isFinite(at.x) || !Number.isFinite(at.y))) return
    const placement = at ? {
      x: Math.max(-LAYOUT_LIMIT, Math.min(LAYOUT_LIMIT, snap ? Math.round(at.x / 100) * 100 : at.x)),
      y: Math.max(-LAYOUT_LIMIT, Math.min(LAYOUT_LIMIT, snap ? Math.round(at.y / 120) * 120 : at.y)),
    } : null
    const id = crypto.randomUUID()
    const labels: Record<Kind, string> = {
      source: 'Source',
      resistor: 'R',
      ammeter: 'A',
      voltmeter: 'V',
      ground: 'Reference',
      switch: 'S',
      inductor: 'L',
      capacitor: 'C',
      transformer: 'T',
    }
    let count = 1
    const usedLabels = new Set(experiment.devices.map((d) => d.label))
    while (usedLabels.has(`${labels[kind]}${count}`)) count++
    const i = experiment.devices.length
    const doc = {
      ...experiment,
      version: 4 as const,
      devices: [
        ...experiment.devices,
        {
          id,
          kind,
          label: `${labels[kind]}${count}`,
          value:
            kind === 'source'
              ? 10
              : kind === 'resistor'
                ? 1000
                : kind === 'inductor'
                  ? 0.1
                  : kind === 'capacitor'
                    ? 1e-6
                    : kind === 'transformer'
                      ? 2
                      : 0,
          ...deviceModelDefaults(kind, losses),
          closed: true,
        },
      ],
      positions: {
        ...experiment.positions,
        [id]: placement ?? { x: 50 + (i % 4) * 255, y: 65 + (Math.floor(i / 4) % 3) * 220 },
      },
    }
    commit(doc)
    set({ selected: id, selectedIds: [id], selectedWire: null, pending: null })
  },
  update(id, change) {
    const { experiment, commit } = get()
    commit({
      ...experiment,
      devices: experiment.devices.map((d) => (d.id === id ? { ...d, ...change } : d)),
    })
  },
  move(id, point) {
    const { experiment, commit } = get()
    const old = experiment.positions[id]
    if (!old || (old.x === point.x && old.y === point.y)) return
    const ids = get().selectedIds.includes(id)
      ? [id, ...get().selectedIds.filter((x) => x !== id)]
      : [id]
    const moved = moveDevices(
      experiment,
      ids,
      { x: point.x - old.x, y: point.y - old.y },
      get().snap,
    )
    if (moved !== experiment) commit(moved)
    if (Math.abs(point.x) > LAYOUT_LIMIT || Math.abs(point.y) > LAYOUT_LIMIT)
      set({ notice: `Workspace safety limit: ±${LAYOUT_LIMIT} logical units.` })
  },
  remove(id) {
    const { experiment, commit } = get()
    const positions = { ...experiment.positions }
    delete positions[id]
    const target = experiment.devices.find((d) => d.id === id)
    const ends = new Set(target ? ports(target).map((p) => terminal(id, p)) : [])
    commit({
      ...experiment,
      positions,
      devices: experiment.devices.filter((d) => d.id !== id),
      wires: experiment.wires.filter((w) => !ends.has(w.from) && !ends.has(w.to)),
    })
    set({
      selected: null,
      selectedIds: [],
      selectedWire: null,
      pending: null,
      highlighted: null,
      reconnecting: null,
    })
  },
  removeWire(id) {
    const { experiment, commit } = get()
    commit({ ...experiment, wires: experiment.wires.filter((w) => w.id !== id) })
    set({ selectedWire: null, pending: null, highlighted: null, reconnecting: null })
  },
  undo() {
    const s = get(),
      doc = s.past.at(-1)
    if (!doc) return
    set({
      experiment: doc,
      autoWireColor: s.autoWireColor && autoColorWires(doc) === doc,
      past: s.past.slice(0, -1),
      future: [s.experiment, ...s.future],
      selectedIds: [],
      reconnecting: null,
      revision: s.revision + 1,
      selected: null,
      selectedWire: null,
      pending: null,
      highlighted: null,
      storage: save(doc, s.observations),
      notice: '',
    })
  },
  redo() {
    const s = get(),
      doc = s.future[0]
    if (!doc) return
    set({
      experiment: doc,
      past: [...s.past, s.experiment],
      autoWireColor: s.autoWireColor && autoColorWires(doc) === doc,
      future: s.future.slice(1),
      selectedIds: [],
      reconnecting: null,
      revision: s.revision + 1,
      selected: null,
      selectedWire: null,
      pending: null,
      highlighted: null,
      storage: save(doc, s.observations),
      notice: '',
    })
  },
  record(analysis) {
    if (!analysis.ok) return
    const s = get()
    if (s.observations.length >= 100) {
      set({ notice: 'Notebook is full (100 readings). Export before starting a new project.' })
      return
    }
    const note: Observation = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      title: s.experiment.title,
      experiment: structuredClone(s.experiment),
      values: s.experiment.devices
        .filter((d) => d.kind !== 'ground')
        .map((d) => ({ label: d.label, ...analysis.readings[d.id] })),
    }
    const observations = [...s.observations, note]
    set({
      observations,
      storage: save(s.experiment, observations),
      notice: 'Reading recorded with its circuit settings.',
    })
  },
  clearNotes() {
    const s = get()
    set({ observations: [], storage: save(s.experiment, []), notice: 'Notebook cleared.' })
  },
}))

export function projectFile(): ProjectFile {
  const { experiment, observations } = useProject.getState()
  return { format: 'labo-project', version: 4, experiment, observations }
}
export function newFile(preset: 'ohm' | 'divider' | 'blank'): ProjectFile {
  return {
    format: 'labo-project',
    version: 4,
    experiment: preset === 'blank' ? blank() : example(preset),
    observations: [],
  }
}
