import { memo, useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent, KeyboardEvent, PointerEvent } from 'react'
import {
  deviceNames,
  LAYOUT_LIMIT,
  formatQuantity,
  ports,
  portLabel,
  settings,
  terminal,
  valueUnit,
} from '../core/circuit'
import type { Device, Point, Terminal } from '../core/circuit'
import { moveDevices, portPoint, terminalPoint } from '../core/edit'
import { wirePath } from '../core/wiring'
import { routeWires } from '../core/routing'
import type { Analysis } from '../core/solve'
import { useProject } from '../state/project'
import { InlineValue } from './InlineValue'
import { useBenchPan } from './useBenchPan'
import { EQUIPMENT_DRAG, readEquipmentDrag } from './equipmentDrag'

function Symbol({ kind, closed, ac }: { kind: Device['kind']; closed: boolean; ac: boolean }) {
  return (
    <svg className="circuit-symbol" viewBox="0 0 80 32" aria-hidden="true">
      {kind === 'resistor' ? (
        <path d="M2 16h12l5-9 8 18 8-18 8 18 8-18 8 18 5-9h14" />
      ) : kind === 'inductor' ? (
        <path d="M2 23h10c0-24 14-24 14 0c0-24 14-24 14 0c0-24 14-24 14 0c0-24 14-24 14 0h10" />
      ) : kind === 'capacitor' ? (
        <path d="M2 16h31M33 3v26M47 3v26M47 16h31" />
      ) : kind === 'transformer' ? (
        <>
          <path d="M5 3h8c20 0 20 8 0 8c20 0 20 8 0 8c20 0 20 8 0 8H5M75 3h-8c-20 0-20 8 0 8c-20 0-20 8 0 8c-20 0-20 8 0 8h8M36 2v28M43 2v28" />
          <circle cx="8" cy="3" r="2" />
          <circle cx="72" cy="3" r="2" />
        </>
      ) : kind === 'source' ? (
        <>
          <circle cx="40" cy="16" r="14" />
          <path
            d={
              ac
                ? 'M2 16h24m28 0h24M30 16c5-14 15 14 20 0'
                : 'M2 16h24m28 0h24M34 11h12m-6-6v12m-6 7h12'
            }
          />
        </>
      ) : kind === 'ground' ? (
        <path d="M40 2v12M21 14h38M27 21h26M34 28h12" />
      ) : kind === 'switch' ? (
        <>
          <path d={closed ? 'M2 21h22l32 0h22' : 'M2 21h22l30-17M56 21h22'} />
          <circle cx="24" cy="21" r="2" />
          <circle cx="56" cy="21" r="2" />
        </>
      ) : (
        <>
          <circle cx="40" cy="16" r="14" />
          <path d="M2 16h24m28 0h24" />
          <text x="40" y="21" textAnchor="middle">
            {kind === 'ammeter' ? 'A' : 'V'}
          </text>
        </>
      )}
    </svg>
  )
}
interface ModuleProps {
  device: Device
  point: Point
  analysis: Analysis
  selected: boolean
  ac: boolean
  highlightedNet: string | null
  pending: Terminal | null
  onPreview: (id: string, point: Point | null) => void
  onTerminalDown: (id: Terminal, e: PointerEvent<HTMLButtonElement>) => void
  onTerminalClick: (id: Terminal) => void
}
const BenchModule = memo(function BenchModule({
  device: d,
  point,
  analysis,
  selected,
  ac,
  highlightedNet,
  pending,
  onPreview,
  onTerminalDown,
  onTerminalClick,
}: ModuleProps) {
  const select = useProject((s) => s.select),
    move = useProject((s) => s.move),
    precision = useProject((s) => s.precision)
  const [dragging, setDragging] = useState(false)
  const skipClick = useRef(false)
  const drag = useRef<{
    start: Point
    client: Point
    scaleX: number
    scaleY: number
    moved: boolean
  } | null>(null)
  const reading = analysis.ok ? analysis.readings[d.id] : null
  const value =
    d.kind === 'transformer'
      ? `${Number(d.value.toPrecision(precision))} : 1`
      : ['source', 'resistor', 'inductor', 'capacitor'].includes(d.kind)
        ? formatQuantity(d.value, valueUnit(d.kind), precision)
        : d.kind === 'ground'
          ? '0 V'
          : d.kind === 'switch'
            ? d.closed
              ? 'Closed'
              : 'Open'
            : formatQuantity(
                d.kind === 'ammeter' ? (reading?.current ?? null) : (reading?.voltage ?? null),
                d.kind === 'ammeter' ? 'A' : 'V',
                precision,
              )
  function start(e: PointerEvent<HTMLElement>) {
    if (e.button !== 0 || !(e.target instanceof Element)) return
    const header = e.target.closest('.module-handle')
    if (!header && e.target.closest('button,input,select,textarea,form,a')) return
    skipClick.current = false
    if (e.shiftKey) {
      select(d.id, true)
      skipClick.current = true
      return
    }
    if (!header) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLButtonElement>('.module-handle')?.focus({ preventScroll: true })
    }
    if (!selected) select(d.id)
    const rect = e.currentTarget.closest('.bench-world')!.getBoundingClientRect()
    drag.current = {
      start: point,
      client: { x: e.clientX, y: e.clientY },
      scaleX: 1200 / rect.width,
      scaleY: 800 / rect.height,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function next(e: PointerEvent<HTMLElement>): Point | null {
    const s = drag.current
    if (!s) return null
    if (!s.moved && Math.hypot(e.clientX - s.client.x, e.clientY - s.client.y) > 4) {
      s.moved = true
      setDragging(true)
    }
    return s.moved
      ? {
          x: s.start.x + Math.round((e.clientX - s.client.x) * s.scaleX),
          y: s.start.y + Math.round((e.clientY - s.client.y) * s.scaleY),
        }
      : null
  }
  function finish(e: PointerEvent<HTMLElement>, cancel = false) {
    const session = drag.current
    if (!session) return
    const p = cancel ? null : next(e)
    skipClick.current = session.moved
    if (p) move(d.id, p)
    drag.current = null
    setDragging(false)
    onPreview(d.id, null)
  }
  function nudge(e: KeyboardEvent<HTMLButtonElement>) {
    const snap = useProject.getState().snap
    const xStep = snap ? 100 : 10
    const yStep = snap ? 120 : 10
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -xStep, y: 0 },
      ArrowRight: { x: xStep, y: 0 },
      ArrowUp: { x: 0, y: -yStep },
      ArrowDown: { x: 0, y: yStep },
    }
    if (!delta[e.key]) return
    e.preventDefault()
    const step = e.shiftKey ? 5 : 1
    move(d.id, { x: point.x + delta[e.key].x * step, y: point.y + delta[e.key].y * step })
  }
  return (
    <section
      className={`bench-module ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''} kind-${d.kind}`}
      style={{ left: `${point.x / 12}%`, top: `${point.y / 8}%` }}
      aria-label={`${d.label} ${deviceNames[d.kind]}`}
      onPointerDown={start}
      onPointerMove={(e) => {
        const p = next(e)
        if (p) onPreview(d.id, p)
      }}
      onPointerUp={(e) => finish(e)}
      onPointerCancel={(e) => finish(e, true)}
      onLostPointerCapture={(e) => finish(e, true)}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !drag.current) return
        e.stopPropagation()
        drag.current = null
        skipClick.current = true
        setDragging(false)
        onPreview(d.id, null)
        useProject.getState().cancel()
      }}
      onClick={(e) => {
        if (skipClick.current) {
          skipClick.current = false
          return
        }
        if (!(e.target as Element).closest('button,input,form')) select(d.id, e.shiftKey)
      }}
    >
      <button
        className="module-handle"
        aria-label={`Select or move ${d.label}`}
        title="Drag or use arrows. Shift-click: group selection."
        aria-pressed={selected}
        onClick={(e) => {
          if (e.detail === 0) select(d.id, e.shiftKey)
        }}
        onKeyDown={nudge}
      >
        <span className="module-label">{d.label}</span>
        <svg className="grip" viewBox="0 0 12 16" aria-hidden="true">
          <path
            d="M3 3h1m4 0h1M3 8h1m4 0h1M3 13h1m4 0h1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="module-body" title="Drag to move. Fields and terminals keep their own controls.">
        <span className="module-type">
          {deviceNames[d.kind]}
          {ac && ['source', 'voltmeter', 'ammeter'].includes(d.kind) ? ' · RMS' : ''}
        </span>
        <Symbol kind={d.kind} closed={d.closed} ac={ac} />
        <InlineValue device={d} text={value} ac={ac} />
      </div>
      <div className="module-terminals">
        {ports(d).map((p) => {
          const id = terminal(d.id, p),
            active =
              pending === id ||
              (analysis.ok && highlightedNet !== null && analysis.nets[id] === highlightedNet)
          const polarity = p === 'p' || p === 's' ? 'positive' : 'negative'
          const name =
            (d.kind === 'transformer' ? (p === 'p' || p === 'n' ? 'primary ' : 'secondary ') : '') +
            polarity
          return (
            <button
              key={p}
              data-terminal={id}
              style={{ left: `${portPoint({ x: 0, y: 0 }, p, d.kind === 'transformer').x / 2}%` }}
              className={`terminal ${polarity} ${active ? 'highlighted' : ''}`}
              aria-label={`${d.label} ${name} terminal`}
              aria-pressed={pending === id}
              title={`${d.label} ${d.kind === 'transformer' && (p === 'p' || p === 'n') ? 'P' : ''}${portLabel(p)}`}
              onPointerDown={(e) => onTerminalDown(id, e)}
              onClick={() => onTerminalClick(id)}
            >
              <span aria-hidden="true">{d.kind === 'ground' ? '0' : portLabel(p)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
})
type LeadGesture = {
  from: Terminal
  client: Point
  moved: boolean
  reconnect: { id: string; end: 'from' | 'to' } | null
}
export function Bench({
  analysis,
  zoom,
  viewReset = 0,
  onZoomChange,
  showGrid,
  neatWires,
  onSelectWire,
}: {
  analysis: Analysis
  zoom: number
  viewReset?: number
  onZoomChange: (zoom: number) => void
  showGrid: boolean
  neatWires: boolean
  onSelectWire: () => void
}) {
  const experiment = useProject((s) => s.experiment),
    selectedIds = useProject((s) => s.selectedIds),
    pending = useProject((s) => s.pending),
    highlighted = useProject((s) => s.highlighted),
    snap = useProject((s) => s.snap)
  const selectedWire = useProject((s) => s.selectedWire),
    reconnecting = useProject((s) => s.reconnecting)
  const [preview, setPreview] = useState<{ id: string; point: Point } | null>(null),
    [cursor, setCursor] = useState<Point | null>(null)
  const [terminalPreview, setTerminalPreview] = useState<{
      from: Terminal
      reconnect: { id: string; end: 'from' | 'to' } | null
    } | null>(null)
  const gesture = useRef<LeadGesture | null>(null),
    suppressClick = useRef(false)
  const camera = useBenchPan(() => Boolean(gesture.current || preview), viewReset, () => {
    clear()
    useProject.setState({
      selected: null,
      selectedIds: [],
      selectedWire: null,
      highlighted: null,
      pending: null,
      reconnecting: null,
      notice: '',
    })
  }, zoom, onZoomChange, experiment.positions)
  const previewModule = useCallback((id: string, p: Point | null) => setPreview(p ? { id, point: p } : null), [])
  const clickTerminal = useCallback((id: Terminal) => {
    if (!suppressClick.current) useProject.getState().connect(id)
  }, [])
  const layout = useMemo(() => {
    if (!preview || !experiment.positions[preview.id]) return experiment
    const origin = experiment.positions[preview.id],
      ids = selectedIds.includes(preview.id)
        ? [preview.id, ...selectedIds.filter((id) => id !== preview.id)]
        : [preview.id]
    return moveDevices(
      experiment,
      ids,
      { x: preview.point.x - origin.x, y: preview.point.y - origin.y },
      snap,
    )
  }, [experiment, preview, selectedIds, snap])
  const routes = useMemo(
    () => (neatWires ? routeWires(layout) : null),
    [layout.positions, layout.devices, layout.wires, neatWires],
  )
  const highlightedNet = analysis.ok && highlighted ? analysis.nets[highlighted] : null
  const point = (id: Terminal) => terminalPoint(layout, id)
  function world(e: PointerEvent<HTMLElement>): Point {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * 1200) / r.width, y: ((e.clientY - r.top) * 800) / r.height }
  }
  function nearWireEnd(e: { clientX: number; clientY: number; pointerType?: string }, from: Terminal, to: Terminal): 'from' | 'to' | null {
    const rect = camera.world.current!.getBoundingClientRect()
    const distance = (id: Terminal) => {
      const p = point(id)
      return Math.hypot(e.clientX - rect.left - p.x * rect.width / 1200, e.clientY - rect.top - p.y * rect.height / 800)
    }
    const a = distance(from), b = distance(to)
    const start = point(from), end = point(to)
    const separation = Math.hypot((start.x - end.x) * rect.width / 1200, (start.y - end.y) * rect.height / 800)
    const radius = Math.min(e.pointerType === 'touch' ? 40 : 32, separation * 0.4)
    return Math.min(a, b) <= radius ? (a <= b ? 'from' : 'to') : null
  }
  function equipmentPoint(e: { clientX: number; clientY: number }): Point | null {
    const rect = camera.world.current?.getBoundingClientRect()
    if (!rect || !rect.width || !rect.height) return null
    const x = (e.clientX - rect.left) * 1200 / rect.width, y = (e.clientY - rect.top) * 800 / rect.height
    const at = { x: x - 100, y: y - 60 }
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(at.x) <= LAYOUT_LIMIT && Math.abs(at.y) <= LAYOUT_LIMIT ? at : null
  }
  function dropEquipment(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes(EQUIPMENT_DRAG)) return
    e.preventDefault()
    e.stopPropagation()
    const item = readEquipmentDrag(e.dataTransfer.getData(EQUIPMENT_DRAG)), at = equipmentPoint(e)
    if (item && at) useProject.getState().add(item.kind, item.losses, at)
    else useProject.setState({ notice: 'Drop position exceeds the workspace safety range.' })
  }
  const terminalDown = useCallback((id: Terminal, e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const w = experiment.wires.find((w) => w.id === selectedWire),
      end = w?.from === id ? 'from' : w?.to === id ? 'to' : null
    gesture.current = {
      from: id,
      client: { x: e.clientX, y: e.clientY },
      moved: false,
      reconnect: w && end ? { id: w.id, end } : null,
    }
  }, [experiment.wires, selectedWire])
  function clear() {
    gesture.current = null
    setTerminalPreview(null)
    setCursor(null)
  }
  function finish(e: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current
    if (!g) return
    if (g.moved) {
      suppressClick.current = true
      setTimeout(() => {
        suppressClick.current = false
      }, 0)
    }
    if (g.moved && !cancel) {
      const target = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => el.closest<HTMLElement>('[data-terminal]'))
        .find(Boolean)?.dataset.terminal as Terminal | undefined
      if (target && target !== g.from) {
        if (g.reconnect) {
          const wire = experiment.wires.find((w) => w.id === g.reconnect!.id)
          const fixed = g.reconnect.end === 'from' ? wire?.to : wire?.from
          if (wire && target !== fixed) useProject.getState().reconnectWire(wire.id, g.reconnect.end, target)
        } else useProject.getState().connectPair(g.from, target)
      }
    }
    clear()
  }
  return (
    <div
      ref={camera.viewport}
      className={`bench-scroll ${showGrid ? 'show-grid' : ''}`}
      role="region"
      tabIndex={0}
      aria-label="Wiring workbench"
      title="Drag empty space to pan. Ctrl+wheel zooms at the cursor; wheel pans, Shift+wheel horizontally. Double-click empty space or Home resets pan."
      {...camera.handlers}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(EQUIPMENT_DRAG)) return
        e.preventDefault()
        e.dataTransfer.dropEffect = equipmentPoint(e) && experiment.devices.length < 40 ? 'copy' : 'none'
      }}
      onDrop={dropEquipment}
    >
      <div className="bench-space">
      <div
        ref={camera.world}
        className="bench-world"
        style={
          {
            width: 'var(--bench-world-width, 680px)',
            '--bench-zoom': zoom / 100,
          } as CSSProperties
        }
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            clear()
            useProject.getState().cancel()
          }
        }}
        onPointerMove={(e) => {
          const g = gesture.current
          if (g) {
            g.moved ||= Math.hypot(e.clientX - g.client.x, e.clientY - g.client.y) > 4
            if (!g.moved) return
            setTerminalPreview({ from: g.from, reconnect: g.reconnect })
            setCursor(world(e))
          } else if (pending || reconnecting) setCursor(world(e))
        }}
        onPointerUp={(e) => finish(e)}
        onPointerCancel={(e) => finish(e, true)}
      >
        <svg
          className="wire-layer"
          viewBox="0 0 1200 800"
          preserveAspectRatio="none"
          role="group"
          aria-label="Circuit wires"
        >
          {layout.wires.map((w) => {
            const label = (end: Terminal) => {
              const [id, p] = end.split(':')
              return `${experiment.devices.find((d) => d.id === id)?.label} ${portLabel(p as 'p' | 'n' | 's' | 't')}`
            }
            const active =
              selectedWire === w.id || (analysis.ok && highlightedNet === analysis.nets[w.from])
            const draggedEnd = terminalPreview?.reconnect
            const from =
              draggedEnd?.id === w.id && draggedEnd.end === 'from' && cursor
                ? cursor
                : point(w.from)
            const to =
              draggedEnd?.id === w.id && draggedEnd.end === 'to' && cursor ? cursor : point(w.to)
            const routed = !neatWires
              ? { path: wirePath(from, to, w), blocked: false }
              : routes!.get(w.id)!
            const d = draggedEnd?.id === w.id && cursor ? wirePath(from, to) : routed.path
            return (
              <g key={w.id}>
                <path
                  d={d}
                  stroke={active ? '#165eae' : w.color}
                  className={`wire ${active ? 'active-wire' : ''} ${routed.blocked ? 'wire-obstructed' : ''}`}
                  aria-hidden="true"
                />
                <path
                  d={d}
                  className="wire-hit"
                  data-wire-id={w.id}
                  data-route-blocked={routed.blocked}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select wire ${label(w.from)} to ${label(w.to)}`}
                  aria-pressed={selectedWire === w.id}
                  style={{
                    pointerEvents: pending || reconnecting || terminalPreview ? 'none' : undefined,
                  }}
                  onPointerDown={(e) => {
                    if (e.button !== 0) return
                    e.stopPropagation()
                    e.currentTarget.focus({ preventScroll: true })
                    useProject.getState().selectWire(w.id)
                    onSelectWire()
                    const end = nearWireEnd(e, w.from, w.to)
                    if (!end) return
                    camera.world.current!.setPointerCapture(e.pointerId)
                    gesture.current = {
                      from: w[end],
                      client: { x: e.clientX, y: e.clientY },
                      moved: false,
                      reconnect: { id: w.id, end },
                    }
                  }}
                  onPointerMove={(e) => {
                    if (!gesture.current) e.currentTarget.style.cursor = nearWireEnd(e, w.from, w.to) ? 'grab' : 'pointer'
                  }}
                  onPointerLeave={(e) => { e.currentTarget.style.cursor = '' }}
                  onClick={() => {
                    if (!suppressClick.current) {
                      useProject.getState().selectWire(w.id)
                      onSelectWire()
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      useProject.getState().selectWire(w.id)
                      onSelectWire()
                    }
                  }}
                />
              </g>
            )
          })}
          {cursor && (pending || (terminalPreview && !terminalPreview.reconnect)) ? (
            <path
              d={wirePath(point(terminalPreview?.from ?? pending!), cursor)}
              className="wire preview-wire"
            />
          ) : null}
        </svg>
        {experiment.devices.map((d) => (
          <BenchModule
            key={d.id}
            device={d}
            point={layout.positions[d.id]}
            analysis={analysis}
            selected={selectedIds.includes(d.id)}
            ac={settings(experiment).mode === 'ac'}
            highlightedNet={highlightedNet}
            pending={pending}
            onPreview={previewModule}
            onTerminalDown={terminalDown}
            onTerminalClick={clickTerminal}
          />
        ))}
        {!experiment.devices.length ? (
          <div className="bench-empty">
            <p>No modules.</p>
          </div>
        ) : null}
      </div>
      </div>
    </div>
  )
}
