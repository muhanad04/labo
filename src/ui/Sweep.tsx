import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { formatQuantity, parseQuantity, settings, valueUnit } from '../core/circuit'
import { electricalSignature, measures, runSweep } from '../core/sweep'
import type { Measure, SweepResult } from '../core/sweep'
import { useProject } from '../state/project'
import { download, toCsv } from './files'

function trace(result: SweepResult, px: (x: number) => number, py: (y: number) => number) {
  let connected = false
  return result.points
    .map((p) => {
      if (p.y === null) {
        connected = false
        return ''
      }
      const command = connected ? 'L' : 'M'
      connected = true
      return `${command}${px(p.x).toFixed(2)},${py(p.y).toFixed(2)}`
    })
    .join(' ')
}
function Plot({
  result,
  previous,
  cursor,
}: {
  result: SweepResult
  previous: SweepResult | null
  cursor: number
}) {
  const both = [...result.points, ...(previous?.points ?? [])],
    ys = both.flatMap((p) => (p.y === null ? [] : [p.y]))
  const tx = (x: number) => (result.spec.spacing === 'log' ? Math.log(x) : x)
  const xmin = Math.min(...both.map((p) => tx(p.x))),
    xmax = Math.max(...both.map((p) => tx(p.x)))
  let ymin = Math.min(0, ...ys),
    ymax = Math.max(0, ...ys)
  if (ymax === ymin) {
    ymin -= 1
    ymax += 1
  }
  const px = (x: number) => 66 + ((tx(x) - xmin) / (xmax - xmin || 1)) * 414
  const py = (y: number) => 145 - ((y - ymin) / (ymax - ymin)) * 120
  return (
    <svg
      viewBox="0 0 510 190"
      className="sweep-plot"
      role="img"
      aria-label={`${result.xLabel} versus ${result.yLabel}. Exact values are in the adjacent data table.`}
    >
      <path d="M66 24V145H480" className="plot-axis" />
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1="66" x2="480" y1={25 + t * 120} y2={25 + t * 120} className="plot-grid" />
          <text x="60" y={29 + t * 120} textAnchor="end">
            {formatQuantity(ymax - t * (ymax - ymin), result.yUnit, 3)}
          </text>
        </g>
      ))}
      <text x="66" y="161">
        {formatQuantity(result.points[0].x, result.xUnit, 3)}
      </text>
      <text x="480" y="161" textAnchor="end">
        {formatQuantity(result.points.at(-1)!.x, result.xUnit, 3)}
      </text>
      <text x="273" y="181" textAnchor="middle">
        {result.xLabel} ({result.xUnit}){result.spec.spacing === 'log' ? ' · log axis' : ''}
      </text>
      <text x="66" y="13">
        {result.yLabel} ({result.yUnit || 'ratio'})
      </text>
      {previous ? <path d={trace(previous, px, py)} className="plot-previous" /> : null}
      <path d={trace(result, px, py)} className="plot-current" />
      <line
        x1={px(result.points[cursor].x)}
        x2={px(result.points[cursor].x)}
        y1="25"
        y2="145"
        className="plot-cursor"
      />
    </svg>
  )
}
export function Sweep({ onClose }: { onClose: () => void }) {
  const experiment = useProject((s) => s.experiment)
  const choices = experiment.devices.filter((d) =>
    ['source', 'resistor', 'inductor', 'capacitor'].includes(d.kind),
  )
  const [parameter, setParameter] = useState(
    choices.find((d) => d.kind === 'resistor')?.id ?? choices[0]?.id ?? '',
  )
  const [device, setDevice] = useState(
    experiment.devices.find((d) => d.kind === 'ammeter')?.id ?? choices[0]?.id ?? '',
  )
  const [measure, setMeasure] = useState<Measure>('current')
  const [start, setStart] = useState('100'),
    [stop, setStop] = useState('10k'),
    [count, setCount] = useState(21),
    [spacing, setSpacing] = useState<'linear' | 'log'>('linear')
  const [result, setResult] = useState<SweepResult | null>(null),
    [previous, setPrevious] = useState<SweepResult | null>(null),
    [compare, setCompare] = useState(false)
  const [running, setRunning] = useState(false),
    [progress, setProgress] = useState(0),
    [message, setMessage] = useState(''),
    [cursor, setCursor] = useState(0)
  const abort = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      abort.current?.abort()
      abort.current = null
    },
    [],
  )
  const stale = result && result.signature !== electricalSignature(experiment)
  const compatible =
    result &&
    previous &&
    result.spec.parameter === previous.spec.parameter &&
    result.spec.device === previous.spec.device &&
    result.spec.measure === previous.spec.measure &&
    result.spec.spacing === previous.spec.spacing &&
    settings(result.snapshot).mode === settings(previous.snapshot).mode
  async function run() {
    const a = parseQuantity(start),
      b = parseQuantity(stop)
    if (a === null || b === null) {
      setMessage('Invalid sweep limits.')
      return
    }
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setRunning(true)
    setProgress(0)
    setMessage('')
    try {
      const next = await runSweep(
        experiment,
        { parameter, start: a, stop: b, count, spacing, device, measure },
        controller.signal,
        setProgress,
      )
      if (abort.current !== controller) return
      setPrevious(result)
      setResult(next)
      setCursor(0)
      setMessage(
        `${next.points.length} points; ${next.points.filter((p) => p.y === null).length} unavailable.`,
      )
    } catch (e) {
      if (abort.current === controller) setMessage(e instanceof Error ? e.message : 'Sweep failed.')
    } finally {
      if (abort.current === controller) setRunning(false)
    }
  }
  function exportData() {
    if (!result) return
    const csv = toCsv([
      ['snapshot', result.snapshot.title],
      ['circuit_json', JSON.stringify(result.snapshot)],
      ['sweep_spec_json', JSON.stringify(result.spec)],
      [
        'analysis',
        settings(result.snapshot).mode,
        'frequency_Hz',
        settings(result.snapshot).frequency,
      ],
      ['parameter', result.xLabel, result.xUnit, 'channel', result.yLabel, result.yUnit],
      ['x', 'y', 'diagnostic'],
      ...result.points.map((p) => [p.x, p.y ?? '', p.diagnostic]),
    ])
    download('labo-sweep.csv', csv, 'text/csv;charset=utf-8')
  }
  return (
    <section className="tool-panel" aria-label="Parameter sweep">
      <div className="notebook-heading">
        <h2>Parameter sweep</h2>
        <span className="subtle">
          {settings(result?.snapshot ?? experiment).mode === 'ac'
            ? `RMS phasors · ${settings(result?.snapshot ?? experiment).frequency} Hz`
            : 'DC steady state'}
          {' · session only'}
        </span>
        <button className="icon-button dock-close" aria-label="Close sweep" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <form
        className="tool-form sweep-form"
        onSubmit={(e) => {
          e.preventDefault()
          void run()
        }}
      >
        <label>
          Parameter{' '}
          <select value={parameter} onChange={(e) => setParameter(e.target.value)}>
            {choices.map((d) => (
              <option value={d.id} key={d.id}>
                {d.label} ({valueUnit(d.kind)})
              </option>
            ))}
            {settings(experiment).mode === 'ac' ? (
              <option value="frequency">Frequency (Hz)</option>
            ) : null}
          </select>
        </label>
        <label>
          Start <input value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Stop <input value={stop} onChange={(e) => setStop(e.target.value)} />
        </label>
        <label>
          Points{' '}
          <input
            type="number"
            min={2}
            max={101}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
        <label>
          Spacing{' '}
          <select value={spacing} onChange={(e) => setSpacing(e.target.value as 'linear' | 'log')}>
            <option value="linear">Linear</option>
            <option value="log">Log</option>
          </select>
        </label>
        <label>
          Channel{' '}
          <select value={device} onChange={(e) => setDevice(e.target.value)}>
            {experiment.devices
              .filter((d) => d.kind !== 'ground')
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Quantity{' '}
          <select value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
            {Object.entries(measures)
              .filter(
                ([key]) =>
                  settings(experiment).mode === 'ac' ||
                  ['voltage', 'current', 'power'].includes(key),
              )
              .map(([key, v]) => (
                <option key={key} value={key}>
                  {v.label} ({v.unit || 'ratio'})
                </option>
              ))}
          </select>
        </label>
        <button className="button" disabled={running || !choices.length}>
          Run sweep
        </button>
        {running ? (
          <button type="button" className="button" onClick={() => abort.current?.abort()}>
            Cancel sweep
          </button>
        ) : null}
        <button type="button" className="button" disabled={!result} onClick={exportData}>
          Export sweep CSV
        </button>
      </form>
      <div className="tool-message" role="status">
        {running ? <progress value={progress} max={count} aria-label="Sweep progress" /> : null}
        {message}
        {stale ? ' Circuit changed: displayed results belong to the captured settings.' : ''}
      </div>
      {result ? (
        <>
          <div className="sweep-controls">
            <label>
              Cursor{' '}
              <input
                type="range"
                aria-label="Sweep cursor"
                min={0}
                max={result.points.length - 1}
                value={cursor}
                onChange={(e) => setCursor(Number(e.target.value))}
              />
            </label>
            <output>
              {formatQuantity(result.points[cursor].x, result.xUnit)} →{' '}
              {formatQuantity(result.points[cursor].y, result.yUnit)}
            </output>
            <label>
              <input
                type="checkbox"
                checked={compare && !!compatible}
                disabled={!compatible}
                onChange={(e) => setCompare(e.target.checked)}
              />{' '}
              Compare previous run
            </label>
            <button
              className="button small"
              onClick={() => useProject.getState().commit(structuredClone(result.snapshot))}
            >
              Restore captured circuit
            </button>
          </div>
          <div className="sweep-results">
            <div>
              <Plot
                result={result}
                previous={compare && compatible ? previous : null}
                cursor={cursor}
              />
              {compare && compatible ? (
                <p className="plot-legend">
                  Solid: current run. Dashed: previous run ({previous?.snapshot.title}).
                </p>
              ) : null}
            </div>
            <div className="table-scroll" role="region" tabIndex={0} aria-label="Sweep samples">
              <table>
                <caption className="sr-only">
                  Sweep samples with invalid points explicitly marked
                </caption>
                <thead>
                  <tr>
                    <th>
                      {result.xLabel} ({result.xUnit})
                    </th>
                    <th>
                      {result.yLabel} ({result.yUnit || 'ratio'})
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.points.map((p, i) => (
                    <tr key={i} aria-current={cursor === i ? 'true' : undefined}>
                      <td>{formatQuantity(p.x, result.xUnit)}</td>
                      <td>{formatQuantity(p.y, result.yUnit)}</td>
                      <td>{p.diagnostic || 'Valid'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
