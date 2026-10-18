import { beforeEach, expect, it, vi } from 'vitest'
import { example } from '../core/circuit'
import { acExample } from '../core/examples'
import { analyze } from '../core/solve'
import {
  decodeProject,
  LEGACY_STORAGE_KEY,
  PREVIOUS_STORAGE_KEY,
  newFile,
  projectFile,
  RECOVERY_KEY,
  STORAGE_KEY,
  useProject,
} from './project'
import {
  deleteNamed,
  LIBRARY_KEY,
  LEGACY_LIBRARY_KEY,
  putNamed,
  readLibrary,
  readRecovery,
} from './library'
let storage: Map<string, string>
beforeEach(() => {
  storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => storage.set(k, v),
  })
  useProject.setState({ autoWireColor: false })
  useProject.getState().replace(newFile('ohm'))
})
it('reads legacy projects without modifying them and writes v3 separately', () => {
  const old = JSON.stringify({
    format: 'labo-project',
    version: 1,
    experiment: example(),
    observations: [],
  })
  localStorage.setItem(LEGACY_STORAGE_KEY, old)
  expect(readRecovery()!.experiment).toEqual(example())
  const decoded = decodeProject(old)
  expect(decoded.version).toBe(3)
  expect(decoded.experiment).toEqual(example())
  useProject.getState().replace(decoded)
  useProject.getState().update('r1', { value: 2000 })
  expect(storage.get(LEGACY_STORAGE_KEY)).toBe(old)
  expect(decodeProject(storage.get(STORAGE_KEY)!).experiment.devices[1].value).toBe(2000)
})
it('round trips routed circuits and AC recorded quantities', () => {
  useProject.getState().replace({ ...newFile('blank'), experiment: acExample() })
  useProject.getState().setWireSlack('w0', 150)
  useProject.getState().record(analyze(useProject.getState().experiment))
  const file = projectFile()
  const restored = decodeProject(JSON.stringify(file))
  expect(restored).toEqual(file)
  expect(restored.observations[0].values.find((v) => v.label === 'A1')!.currentPhase).toBeCloseTo(
    -45,
    8,
  )
})
it('retains the previous known-valid autosave and does not replace it with malformed data', () => {
  useProject.getState().update('r1', { value: 2000 })
  expect(readRecovery()!.experiment.devices[1].value).toBe(1000)
  const backup = storage.get(RECOVERY_KEY)
  localStorage.setItem(STORAGE_KEY, '{invalid')
  useProject.getState().update('r1', { value: 3000 })
  expect(storage.get(RECOVERY_KEY)).toBe(backup)
})
it('saves named immutable snapshots, requires explicit replacement, and deletes only the chosen entry', () => {
  const file = projectFile()
  const first = putNamed('Lab A', file)
  useProject.getState().update('r1', { value: 5000 })
  expect(readLibrary()[0].file.experiment.devices[1].value).toBe(1000)
  expect(() => putNamed('Lab A', projectFile())).toThrow('exists')
  putNamed('Lab A', projectFile(), first[0].id)
  expect(readLibrary()[0].file.experiment.devices[1].value).toBe(5000)
  putNamed('Lab B', file)
  expect(deleteNamed(first[0].id)).toHaveLength(1)
  expect(readLibrary()[0].name).toBe('Lab B')
})
it('does not overwrite a corrupted project library or lose its old catalog on quota failure', () => {
  localStorage.setItem(LIBRARY_KEY, '{invalid')
  expect(() => putNamed('Lab', projectFile())).toThrow()
  expect(storage.get(LIBRARY_KEY)).toBe('{invalid')
  storage.delete(LIBRARY_KEY)
  putNamed('Lab', projectFile())
  const original = storage.get(LIBRARY_KEY)
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: () => {
      throw new Error('quota')
    },
  })
  expect(() => putNamed('Another', projectFile())).toThrow('quota')
  expect(storage.get(LIBRARY_KEY)).toBe(original)
})
it('group selection/deletion/duplication and routing edits remain undoable', () => {
  const original = useProject.getState().experiment
  useProject.getState().select('s1')
  useProject.getState().select('r1', true)
  useProject.getState().duplicate()
  expect(useProject.getState().experiment.devices).toHaveLength(7)
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(original)
  useProject.getState().select('s1')
  useProject.getState().select('r1', true)
  useProject.getState().removeSelected()
  expect(useProject.getState().experiment.devices).toHaveLength(3)
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(original)
  useProject.getState().setWireSlack('w0', 160)
  expect(useProject.getState().experiment.version).toBe(3)
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(original)
})
it('preserves v2 active data and the old named catalog while writing new namespaces', () => {
  const file = { ...projectFile(), version: 2 },
    active = JSON.stringify(file)
  localStorage.setItem(PREVIOUS_STORAGE_KEY, active)
  const catalog = JSON.stringify({
    version: 1,
    entries: [{ id: crypto.randomUUID(), name: 'Legacy', savedAt: new Date().toISOString(), file }],
  })
  localStorage.setItem(LEGACY_LIBRARY_KEY, catalog)
  expect(readLibrary()).toHaveLength(1)
  useProject.getState().replace(decodeProject(active))
  useProject.getState().update('s1', { seriesResistance: 1 })
  putNamed('New', projectFile())
  expect(storage.get(PREVIOUS_STORAGE_KEY)).toBe(active)
  expect(storage.get(LEGACY_LIBRARY_KEY)).toBe(catalog)
  expect(readLibrary()).toHaveLength(2)
  expect(decodeProject(storage.get(STORAGE_KEY)!).version).toBe(3)
})
it('preserves legacy route data until an explicit lead adjustment and restores it on undo', () => {
  const doc = acExample()
  doc.wires[0].points = [
    { x: 200, y: 250 },
    { x: 300, y: 280 },
  ]
  useProject.getState().replace({ ...newFile('blank'), experiment: doc })
  expect(useProject.getState().experiment.wires[0].points).toEqual(doc.wires[0].points)
  useProject.getState().setWireSlack('w0', 170)
  expect(useProject.getState().experiment.wires[0].points).toBeUndefined()
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(doc)
})
it('auto color updates existing leads in one undoable edit and keeps future edits classified', () => {
  const original = useProject.getState().experiment
  useProject.getState().setAutoWireColor(true)
  const colored = useProject.getState().experiment
  expect(colored.wires.find((w) => w.id === 'w1')!.color).toBe('#2b2b2b')
  expect(colored.wires.every((w) => w.color === '#2b2b2b' || w.color === '#b64c38')).toBe(true)
  expect(useProject.getState().past).toHaveLength(1)
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(original)
  expect(useProject.getState().autoWireColor).toBe(false)
  useProject.getState().setAutoWireColor(true)
  useProject.getState().connectPair('s1:p', 'v1:p')
  expect(useProject.getState().experiment.wires.at(-1)!.color).toBe('#b64c38')
})
it('rejects a self/duplicate reconnect without changing the circuit', () => {
  const original = useProject.getState().experiment
  useProject.getState().reconnectWire('w0', 'from', 'r1:p')
  expect(useProject.getState().experiment).toBe(original)
  useProject.getState().beginReconnect('w0', 'to')
  useProject.getState().connect('v1:p')
  expect(useProject.getState().experiment).not.toBe(original)
  useProject.getState().undo()
  expect(useProject.getState().experiment).toEqual(original)
})
