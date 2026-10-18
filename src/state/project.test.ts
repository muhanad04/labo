import { beforeEach, describe, expect, it, vi } from 'vitest'
import { example } from '../core/circuit'
import { analyze } from '../core/solve'
import { decodeProject, newFile, projectFile, STORAGE_KEY, useProject } from './project'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  })
  useProject.getState().replace(newFile('ohm'))
  useProject.getState().setWireColor('#2b2b2b')
  useProject.getState().setSnap(false)
  useProject.getState().setPrecision(5)
})

describe('experiment edits and persistence', () => {
  it('supports undo/redo, drops redo after a new edit, and saves the document', () => {
    useProject.getState().update('r1', { value: 2000 })
    useProject.getState().undo()
    expect(useProject.getState().experiment.devices[1].value).toBe(1000)
    useProject.getState().redo()
    expect(useProject.getState().experiment.devices[1].value).toBe(2000)
    useProject.getState().undo()
    useProject.getState().update('r1', { value: 3000 })
    expect(useProject.getState().future).toHaveLength(0)
    expect(decodeProject(localStorage.getItem(STORAGE_KEY)!).experiment.devices[1].value).toBe(3000)
  })
  it('atomically removes connected leads, and undo restores them', () => {
    useProject.getState().remove('r1')
    expect(
      useProject
        .getState()
        .experiment.wires.some((w) => w.from.startsWith('r1:') || w.to.startsWith('r1:')),
    ).toBe(false)
    useProject.getState().undo()
    expect(useProject.getState().experiment).toEqual(example())
  })
  it('keeps recorded settings immutable after edits and round trips observations', () => {
    useProject.getState().record(analyze(useProject.getState().experiment))
    useProject.getState().update('r1', { value: 4000 })
    const file = projectFile()
    expect(file.observations[0].experiment.devices[1].value).toBe(1000)
    expect(file.observations[0].values.find((v) => v.label === 'A1')!.current).toBeCloseTo(0.01)
    expect(decodeProject(JSON.stringify(file))).toEqual(file)
  })
  it('rejects malformed/oversized imports and invalid edits without altering the document', () => {
    const initial = useProject.getState().experiment
    expect(() => decodeProject('{"version":2}')).toThrow()
    expect(() => decodeProject(' '.repeat(2_000_001))).toThrow('large')
    useProject.getState().update('r1', { value: 0 })
    expect(useProject.getState().experiment).toBe(initial)
  })
  it('rejects invalid observation snapshots', () => {
    useProject.getState().record(analyze(useProject.getState().experiment))
    const file = projectFile()
    file.observations[0].experiment.version = 99 as 1
    expect(() => decodeProject(JSON.stringify(file))).toThrow()
  })
  it('reports storage failure without losing the in-memory edit', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota')
      },
    })
    useProject.getState().update('r1', { value: 5000 })
    expect(useProject.getState().experiment.devices[1].value).toBe(5000)
    expect(useProject.getState().storage).toContain('Export')
  })
  it('allocates unused labels after deleting a module', () => {
    useProject.getState().add('resistor')
    const r2 = useProject.getState().experiment.devices.find((d) => d.label === 'R2')
    expect(r2).toBeDefined()
    useProject.getState().remove('r1')
    useProject.getState().add('resistor')
    const labels = useProject.getState().experiment.devices.map((d) => d.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).toContain('R1')
  })
  it('selects and recolors a lead without changing topology, and undoes the edit', () => {
    const original = useProject.getState().experiment
    useProject.getState().selectWire('w0')
    expect(useProject.getState().selectedWire).toBe('w0')
    expect(useProject.getState().selected).toBeNull()
    useProject.getState().recolorWire('w0', '#345c94')
    expect(useProject.getState().experiment.wires[0]).toEqual({
      ...original.wires[0],
      color: '#345c94',
    })
    expect(analyze(useProject.getState().experiment)).toEqual(analyze(original))
    useProject.getState().undo()
    expect(useProject.getState().experiment).toEqual(original)
    expect(useProject.getState().selectedWire).toBeNull()
  })
  it('removes all wires as one undoable edit and preserves recorded data', () => {
    const original = useProject.getState().experiment
    useProject.getState().record(analyze(original))
    useProject.getState().selectWire('w0')
    useProject.getState().clearWires()
    expect(useProject.getState().experiment.wires).toHaveLength(0)
    expect(useProject.getState().selectedWire).toBeNull()
    expect(useProject.getState().observations).toHaveLength(1)
    useProject.getState().undo()
    expect(useProject.getState().experiment).toEqual(original)
  })
  it('uses the chosen color for new leads and rejects invalid color data', () => {
    useProject.getState().removeWire('w0')
    useProject.getState().setWireColor('#345c94')
    useProject.getState().setWireColor('url(unsafe)')
    expect(useProject.getState().wireColor).toBe('#345c94')
    useProject.getState().connect('s1:p')
    useProject.getState().connect('r1:p')
    const doc = useProject.getState().experiment
    expect(doc.wires.at(-1)!.color).toBe('#345c94')
    useProject.getState().recolorWire(doc.wires.at(-1)!.id, 'red')
    expect(useProject.getState().experiment).toBe(doc)
  })
  it('cancels and prevents duplicate connections', () => {
    useProject.getState().connect('r1:p')
    useProject.getState().connect('s1:p')
    expect(useProject.getState().experiment.wires).toHaveLength(6)
    expect(useProject.getState().notice).toContain('already')
    useProject.getState().connect('r1:p')
    useProject.getState().cancel()
    expect(useProject.getState().pending).toBeNull()
  })
})
