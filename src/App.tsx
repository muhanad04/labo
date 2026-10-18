import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ClipboardPenLine,
  FilePlus2,
  List,
  LineChart,
  Minus,
  PanelRight,
  Plus,
  Redo2,
  Table2,
  Undo2,
  X,
} from 'lucide-react'
import { deviceNames, kinds, settings } from './core/circuit'
import { wireColors } from './core/wiring'
import { acExample, threePhaseExample, transformerExample } from './core/examples'
import type { Kind } from './core/circuit'
import { analyze } from './core/solve'
import { decodeProject, newFile, projectFile, useProject } from './state/project'
import { Bench } from './ui/Bench'
import { CommandMenu } from './ui/CommandMenu'
import { Inspector } from './ui/Inspector'
import { EquipmentSymbol } from './ui/EquipmentSymbol'
import { SchematicExport } from './ui/SchematicExport'
import { EQUIPMENT_DRAG } from './ui/equipmentDrag'
import { transformerInvestigation, transformerInvestigations } from './core/labExamples'
import type { TransformerInvestigation } from './core/labExamples'
import { withModelDefaults } from './core/modelDefaults'
import { Notebook } from './ui/Notebook'
import { download } from './ui/files'
const Projects = lazy(() =>
  import('./ui/Projects').then((module) => ({ default: module.Projects })),
)
const Sweep = lazy(() => import('./ui/Sweep').then((module) => ({ default: module.Sweep })))

const descriptions: Record<Kind, string> = {
  source: 'DC / RMS AC voltage source with optional internal resistance',
  resistor: 'Linear resistance',
  ammeter: 'Ideal series current meter',
  voltmeter: 'Ideal differential voltage meter',
  ground: 'Circuit reference, 0 V',
  switch: 'Ideal open/closed switch',
  inductor: 'AC inductance with optional winding resistance',
  capacitor: 'AC capacitance with optional ESR',
  transformer: 'Coupled windings with magnetizing current, leakage and explicit losses',
}

export default function App() {
  const experiment = useProject((s) => s.experiment),
    storage = useProject((s) => s.storage),
    notice = useProject((s) => s.notice)
  const pending = useProject((s) => s.pending),
    past = useProject((s) => s.past),
    future = useProject((s) => s.future)
  const selected = useProject((s) => s.selected),
    selectedWire = useProject((s) => s.selectedWire),
    wireColor = useProject((s) => s.wireColor),
    autoWireColor = useProject((s) => s.autoWireColor)
  const snap = useProject((s) => s.snap),
    precision = useProject((s) => s.precision),
    selectedIds = useProject((s) => s.selectedIds)
  const analysisSettings = settings(experiment)
  const [tool, setTool] = useState<'sweep' | 'projects' | null>(null)
  const [neatWires, setNeatWires] = useState(false)
  const [defaultLosses,setDefaultLosses]=useState(true)
  const paletteDragged = useRef(false)
  const add = useProject((s) => s.add),
    undo = useProject((s) => s.undo),
    redo = useProject((s) => s.redo),
    record = useProject((s) => s.record),
    replace = useProject((s) => s.replace),
    cancel = useProject((s) => s.cancel)
  const setWireColor = useProject((s) => s.setWireColor),
    recolorWire = useProject((s) => s.recolorWire),
    clearWires = useProject((s) => s.clearWires)
  const [viewReset, setViewReset] = useState(0)
  const [zoom, setZoom] = useState(100),
    [help, setHelp] = useState(false),
    [fileError, setFileError] = useState('')
  const [showLibrary, setShowLibrary] = useState(true),
    [showInspector, setShowInspector] = useState(true),
    [showData, setShowData] = useState(() => useProject.getState().observations.length > 0),
    [showGrid, setShowGrid] = useState(false)
  const [library, setLibrary] = useState(''),
    [sort, setSort] = useState('type')
  const importInput = useRef<HTMLInputElement>(null)
  const analysis = useMemo(
    () => analyze(experiment),
    [experiment.devices, experiment.wires, experiment.analysis],
  )
  const selectedLead = experiment.wires.find((w) => w.id === selectedWire)
  const equipment = kinds.filter((k) =>
    `${deviceNames[k]} ${descriptions[k]}`.toLowerCase().includes(library.toLowerCase()),
  )
  if (sort === 'name') equipment.sort((a, b) => deviceNames[a].localeCompare(deviceNames[b]))
  function closeMenus() {
    document.querySelectorAll<HTMLDetailsElement>('.command-menu[open]').forEach((menu) => {
      menu.open = false
    })
  }
  function removeSelection() {
    useProject.getState().removeSelected()
  }
  function openTool(next: 'sweep' | 'projects') {
    setShowData(false)
    setTool(next)
  }
  function toggleData() {
    setTool(null)
    setShowData((v) => !v)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel()
        setHelp(false)
        closeMenus()
        return
      }
      if (
        e.target instanceof HTMLElement &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable)
      )
        return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        useProject.getState().selectAll()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        useProject.getState().duplicate()
      }
      if (e.key === 'Delete') {
        e.preventDefault()
        removeSelection()
      }
    }
    const outside = (e: PointerEvent) => {
      const current = e.target instanceof Element ? e.target.closest('.command-menu') : null
      document.querySelectorAll<HTMLDetailsElement>('.command-menu[open]').forEach((menu) => {
        if (menu !== current) menu.open = false
      })
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', outside)
    }
  }, [cancel, undo, redo])
  function loadPreset(preset: 'ohm' | 'divider' | 'blank' | 'rl' | 'wye' | 'transformer' | `lab:${TransformerInvestigation}`) {
    if (window.confirm('Replace the current circuit and recorded data?')) {
      const file=newFile('blank')
      file.experiment=preset.startsWith('lab:')?transformerInvestigation(preset.slice(4) as TransformerInvestigation):preset==='rl'?acExample():preset==='wye'?threePhaseExample():preset==='transformer'?transformerExample():newFile(preset as 'blank'|'ohm'|'divider').experiment
      replace({...file,experiment:withModelDefaults(file.experiment,defaultLosses)})
      setTool(null)
      setShowData(false)
      setFileError('')
    }
  }
  function exportProject() {
    download('labo-project.json', JSON.stringify(projectFile(), null, 2))
  }
  function recordReading() {
    if (analysis.ok) {
      record(analysis)
      setTool(null)
      setShowData(true)
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workbench">
        Skip to workbench
      </a>
      <header className="app-header">
        <span className="app-name">labo</span>
        <span className="title-separator">—</span>
        <h1>{experiment.title}</h1>
        <span className="analysis-mode">
          {analysisSettings.mode === 'ac'
            ? `AC RMS · ${analysisSettings.frequency} Hz`
            : 'DC · steady state'}
        </span>
      </header>
      <nav className="app-menubar" aria-label="Application commands">
        <CommandMenu label="File">
          <button onClick={() => loadPreset('blank')}>New circuit</button>
          <button onClick={() => importInput.current?.click()}>Import project…</button>
          <button onClick={exportProject}>Export project…</button>
          <hr />
          <button onClick={() => openTool('projects')}>Projects…</button>
        </CommandMenu>
        <CommandMenu label="Edit">
          <button disabled={!past.length} onClick={undo}>
            Undo <span>Ctrl+Z</span>
          </button>
          <button disabled={!future.length} onClick={redo}>
            Redo <span>Ctrl+Shift+Z</span>
          </button>
          <hr />
          <button onClick={() => useProject.getState().selectAll()}>
            Select all modules <span>Ctrl+A</span>
          </button>
          <button disabled={!selectedIds.length} onClick={() => useProject.getState().duplicate()}>
            Duplicate selection <span>Ctrl+D</span>
          </button>
          <button disabled={!selected && !selectedWire} onClick={removeSelection}>
            Delete selection <span>Del</span>
          </button>
          <button disabled={!experiment.wires.length} onClick={clearWires}>
            Remove all wires
          </button>
        </CommandMenu>
        <CommandMenu label="View">
          <button aria-pressed={showLibrary} onClick={() => setShowLibrary((v) => !v)}>
            Equipment list {showLibrary ? <Check size={12} /> : null}
          </button>
          <button aria-pressed={showInspector} onClick={() => setShowInspector((v) => !v)}>
            Inspector {showInspector ? <Check size={12} /> : null}
          </button>
          <button aria-pressed={showData} onClick={toggleData}>
            Data table {showData ? <Check size={12} /> : null}
          </button>
          <button aria-pressed={showGrid} onClick={() => setShowGrid((v) => !v)}>
            Grid {showGrid ? <Check size={12} /> : null}
          </button>
          <hr />
          <button
            aria-pressed={snap}
            onClick={() => {
              useProject.getState().setSnap(!snap)
              if (!snap) setShowGrid(true)
            }}
          >
            Snap to grid {snap ? <Check size={12} /> : null}
          </button>
          <button onClick={() => setZoom(100)}>Reset zoom</button>
        </CommandMenu>
        <CommandMenu label="Tools">
          <button disabled={!analysis.ok} onClick={recordReading}>
            Record reading
          </button>
          <button
            onClick={() => {
              setTool(null)
              setShowData(true)
            }}
          >
            Data table
          </button>
          <button onClick={() => openTool('sweep')}>Parameter sweep</button>
          <label className="model-defaults"><input type="checkbox" checked={defaultLosses} onChange={e=>setDefaultLosses(e.target.checked)}/>Default losses for new equipment/examples</label>
          <button onClick={()=>{if(window.confirm('Replace circuit loss parameters with generic defaults? Other component values remain unchanged. Undo restores custom parameters.'))useProject.getState().commit(withModelDefaults(experiment,true,true))}}>Reset loss parameters…</button>
          <button onClick={()=>{if(window.confirm('Set series and winding losses to zero, coupling to 1 and disable core-loss shunts? Finite magnetizing inductance remains. Undo restores the model.'))useProject.getState().commit(withModelDefaults(experiment,false,true))}}>Make circuit lossless…</button>
        </CommandMenu>
        <CommandMenu label="Help">
          <button onClick={() => setHelp((v) => !v)}>Controls and model information</button>
        </CommandMenu>
      </nav>
      <section className="app-toolbar" aria-label="Circuit tools">
        <div className="toolbar-group">
          <button
            className="icon-button"
            title="New circuit"
            aria-label="New circuit"
            onClick={() => loadPreset('blank')}
          >
            <FilePlus2 size={19} />
          </button>
          <button
            className="icon-button"
            title="Import project"
            aria-label="Import"
            onClick={() => importInput.current?.click()}
          >
            <ArrowUpFromLine size={19} />
          </button>
          <button
            className="icon-button"
            title="Export project"
            aria-label="Export project"
            onClick={exportProject}
          >
            <ArrowDownToLine size={19} />
          </button>
        </div>
        <span className="tool-divider" />
        <div className="toolbar-group">
          <button
            className="icon-button"
            disabled={!past.length}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            onClick={undo}
          >
            <Undo2 size={19} />
          </button>
          <button
            className="icon-button"
            disabled={!future.length}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            onClick={redo}
          >
            <Redo2 size={19} />
          </button>
        </div>
        <span className="tool-divider" />
        <div className="toolbar-group">
          <button
            className={`icon-button ${showLibrary ? 'is-active' : ''}`}
            aria-label="Equipment list"
            title="Equipment list"
            aria-pressed={showLibrary}
            onClick={() => setShowLibrary((v) => !v)}
          >
            <List size={18} />
          </button>
          <button
            className={`icon-button ${showInspector ? 'is-active' : ''}`}
            aria-label="Inspector"
            title="Inspector"
            aria-pressed={showInspector}
            onClick={() => setShowInspector((v) => !v)}
          >
            <PanelRight size={18} />
          </button>
          <button
            className={`icon-button ${showData ? 'is-active' : ''}`}
            aria-label="Data table"
            title="Data table"
            aria-pressed={showData}
            onClick={toggleData}
          >
            <Table2 size={18} />
          </button>
        </div>
        <button
          className={`icon-button ${tool === 'sweep' ? 'is-active' : ''}`}
          aria-label="Parameter sweep"
          title="Parameter sweep"
          onClick={() => (tool === 'sweep' ? setTool(null) : openTool('sweep'))}
        >
          <LineChart size={18} />
        </button>
        <span className="tool-divider" />
        <div className="toolbar-group zoom-tools">
          <button
            className="icon-button"
            aria-label="Zoom out"
            disabled={zoom <= 50}
            onClick={() => setZoom((v) => Math.max(50, v - 10))}
          >
            <Minus size={16} />
          </button>
          <button className="zoom-label" aria-label="Fit bench" title="Reset zoom and pan" onClick={() => { setZoom(100); setViewReset((v) => v + 1) }}>
            {zoom}%
          </button>
          <button
            className="icon-button"
            aria-label="Zoom in"
            disabled={zoom >= 180}
            onClick={() => setZoom((v) => Math.min(180, v + 10))}
          >
            <Plus size={16} />
          </button>
        </div>
        <span className="tool-divider" />
        <label className="toolbar-field">
          {selectedLead ? 'Selected wire' : 'Wire color'}
          <select
            aria-label={selectedLead ? 'Selected wire color' : 'Wire color'}
            disabled={autoWireColor}
            value={selectedLead?.color ?? wireColor}
            onChange={(e) => {
              if (selectedWire) recolorWire(selectedWire, e.target.value)
              else setWireColor(e.target.value)
            }}
          >
            {!wireColors.some(([hex]) => hex === (selectedLead?.color ?? wireColor)) ? (
              <option value={selectedLead?.color ?? wireColor}>Custom</option>
            ) : null}
            {wireColors.map(([hex, name]) => (
              <option key={hex} value={hex}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label
          className="toolbar-field auto-wire-color"
          title="Red: source leads. Black: reference/return, including through ammeters and closed switches. Blue: intermediate/secondary. AC phases: red/blue/green. Not a physical safety indication."
        >
          <input
            type="checkbox"
            checked={autoWireColor}
            onChange={(e) => useProject.getState().setAutoWireColor(e.target.checked)}
          />{' '}
          Auto color
        </label>
        <label
          className="toolbar-field auto-wire-color"
          title="Route leads around component boxes; off keeps free-curving leads."
        >
          <input
            type="checkbox"
            checked={neatWires}
            onChange={(e) => setNeatWires(e.target.checked)}
          />{' '}
          Neat wires <span className="subtle">(experimental)</span>
        </label>
        <button className="button record-button" disabled={!analysis.ok} onClick={recordReading}>
          <ClipboardPenLine size={15} /> Record reading
        </button>
        <input
          className="sr-only"
          tabIndex={-1}
          type="file"
          accept=".json,application/json"
          aria-label="Import labo project file"
          ref={importInput}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              if (file.size > 2_000_000) throw new Error('File exceeds 2 MB.')
              const parsed = decodeProject(await file.text())
              if (
                window.confirm('Replace the current circuit and recorded data with this project?')
              ) {
                replace(parsed)
                setTool(null)
                setShowData(parsed.observations.length > 0)
                setFileError('')
              }
            } catch (error) {
              setFileError(error instanceof Error ? error.message : 'Could not read file.')
            }
          }}
        />
      </section>
      {fileError ? (
        <div className="file-error" role="alert">
          Import failed. Your current work is unchanged. {fileError}
          <button
            className="icon-button"
            aria-label="Dismiss import error"
            onClick={() => setFileError('')}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      {help ? (
        <section className="help-panel" aria-label="Help and limitations">
          <div>
            <h2>Model information</h2>
            <p>
              DC and single-frequency sinusoidal AC: sources with optional internal resistance,
              R/L/C with explicit winding resistance/ESR, and linear coupled-winding transformers.
              Finite inductance, coupling and copper/core-shunt losses are parameters, not hardware
              ratings. Meters, switches and patch leads remain ideal. AC values are RMS phasors, not
              startup/switching transients. Phase references use one common frequency. No thermal,
              machine or protection models. References define the same mathematical 0 V, not
              protective earth. Not for physical wiring.
            </p>
          </div>
          <div>
            <h3>Controls</h3>
            <p>
              Click a component field to edit; Enter applies, Escape cancels. Click two terminals or
              drag between them to wire. Drag near either end of a lead to reconnect it; its middle
              selects only. Click empty space to cancel wiring or deselect. Drag equipment from
              the list onto the bench, or click to add. Inspector selectors remain
              available. Auto color classifies existing and new leads by connectivity; switch it off
              for manual colors. Crossing wires do not connect. Drag module headers or use arrows;
              Shift increases the step. Shift-click selects groups. Ctrl/⌘ A selects all, Ctrl/⌘ D
              duplicates, Ctrl/⌘ Z undoes, Ctrl/⌘ Shift Z redoes.
            </p>
            <p>
              Recorded data includes circuit snapshots. Browser storage may be cleared; export
              projects for backup.
            </p>
          </div>
          <button className="icon-button" aria-label="Close help" onClick={() => setHelp(false)}>
            <X size={18} />
          </button>
        </section>
      ) : null}
      <main
        className={`workspace-layout ${!showLibrary ? 'hide-library' : ''} ${!showInspector ? 'hide-inspector' : ''}`}
      >
        {showLibrary ? (
          <aside className="library" aria-label="Module library">
            <div className="panel-heading">
              <h2>Equipment</h2>
            </div>
            <div className="library-controls">
              <label htmlFor="module-search" className="sr-only">
                Find a module
              </label>
              <input
                id="module-search"
                placeholder="Filter"
                value={library}
                onChange={(e) => setLibrary(e.target.value)}
              />
              <label>
                Sort by{' '}
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="type">Type</option>
                  <option value="name">Name</option>
                </select>
              </label>
            </div>
            <div className="library-list">
              {equipment.map((kind) => (
                <button
                  key={kind}
                  className="library-item"
                  draggable={experiment.devices.length < 40}
                  onPointerDown={() => { paletteDragged.current = false }}
                  onDragStart={(e) => {
                    paletteDragged.current = true
                    e.dataTransfer.effectAllowed = 'copy'
                    e.dataTransfer.setData(EQUIPMENT_DRAG, JSON.stringify({ kind, losses: defaultLosses }))
                  }}
                  onClick={(e) => {
                    if (e.detail === 0 || !paletteDragged.current) add(kind,defaultLosses)
                  }}
                  disabled={experiment.devices.length >= 40}
                  aria-label={`Add ${deviceNames[kind]}`}
                  title={`${descriptions[kind]} Click to add, or drag onto the bench.`}
                >
                  <EquipmentSymbol kind={kind} />
                  <span>{deviceNames[kind]}</span>
                </button>
              ))}
              {!equipment.length ? <p className="empty-message">No matches.</p> : null}
            </div>
          </aside>
        ) : null}
        <section className="bench-column" id="workbench" aria-label="Circuit experiment">
          <div className="bench-toolbar">
            <label htmlFor="example-select">Circuit</label>
            <select
              id="example-select"
              aria-label="Load an experiment"
              value=""
              onChange={(e) =>
                loadPreset(
                  e.target.value as Parameters<typeof loadPreset>[0],
                )
              }
            >
              <option value="" disabled>
                Open example…
              </option>
              <option value="ohm">Ohm’s law</option>
              <option value="divider">Voltage divider</option>
              <option value="blank">Blank circuit</option>
              <option value="rl">Series RL · AC</option>
              <option value="wye">Three-phase wye</option>
              <option value="transformer">Loaded transformer</option>
              <optgroup label="Transformer investigations">{Object.entries(transformerInvestigations).map(([key,label])=><option key={key} value={`lab:${key}`}>{label}</option>)}</optgroup>
            </select>
            <label>
              Analysis{' '}
              <select
                aria-label="Analysis mode"
                value={analysisSettings.mode}
                onChange={(e) =>
                  useProject
                    .getState()
                    .setAnalysis(e.target.value as 'dc' | 'ac', analysisSettings.frequency)
                }
              >
                <option value="dc">DC</option>
                <option value="ac">AC RMS</option>
              </select>
            </label>
            {analysisSettings.mode === 'ac' ? (
              <form
                className="frequency-form"
                key={analysisSettings.frequency}
                onSubmit={(e) => {
                  e.preventDefault()
                  const value = Number(new FormData(e.currentTarget).get('frequency'))
                  useProject.getState().setAnalysis('ac', value)
                }}
              >
                <label>
                  Hz{' '}
                  <input
                    name="frequency"
                    aria-label="Analysis frequency"
                    type="number"
                    min={0.01}
                    max={1e6}
                    step="any"
                    defaultValue={analysisSettings.frequency}
                    required
                  />
                </label>
                <button className="button small">Set</button>
              </form>
            ) : null}
            <label>
              Digits{' '}
              <select
                aria-label="Display significant digits"
                value={precision}
                onChange={(e) => useProject.getState().setPrecision(Number(e.target.value))}
              >
                {[3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <SchematicExport experiment={experiment} />
            <span className="circuit-count">
              {experiment.devices.length} modules / {experiment.wires.length} wires
            </span>
          </div>
          <Bench
            analysis={analysis}
            zoom={zoom}
            viewReset={viewReset}
            onZoomChange={setZoom}
            showGrid={showGrid}
            neatWires={neatWires}
            onSelectWire={() => setShowInspector(true)}
          />
          {tool ? (
            <div className="analysis-dock">
              <Suspense
                fallback={
                  <p className="tool-message" role="status">
                    Loading…
                  </p>
                }
              >
                {tool === 'sweep' ? (
                  <Sweep onClose={() => setTool(null)} />
                ) : (
                  <Projects
                    onClose={() => setTool(null)}
                    onOpen={(file) => {
                      replace(file)
                      setTool(null)
                      setShowData(file.observations.length > 0)
                    }}
                  />
                )}
              </Suspense>
            </div>
          ) : null}
          {showData ? (
            <div className="data-dock">
              <Notebook onClose={() => setShowData(false)} />
            </div>
          ) : null}
        </section>
        {showInspector ? <Inspector analysis={analysis} neatWires={neatWires} /> : null}
      </main>
      <footer className="app-statusbar">
        <div className={`analysis-message ${analysis.ok ? 'valid' : 'invalid'}`} role="status">
          {analysis.ok ? (
            <>
              <Check size={13} />
              <span>{analysis.mode === 'ac' ? 'AC RMS' : 'DC'} solution valid</span>
            </>
          ) : (
            <span>{analysis.message}</span>
          )}
        </div>
        <div className="operation-status" role="status">
          {notice ||
            (pending
              ? 'Select destination terminal. Esc: cancel.'
              : selectedLead
                ? 'Wire selected. Del: remove.'
                : '')}
        </div>
        <span className="storage-status">{storage}</span>
      </footer>
    </div>
  )
}
