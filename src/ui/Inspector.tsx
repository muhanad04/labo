import { useState } from 'react'
import { ArrowRight, Trash2, Unplug } from 'lucide-react'
import {
  deviceNames,
  formatQuantity,
  parseQuantity,
  settings,
  validValue,
  valueUnit,
} from '../core/circuit'
import type { Device } from '../core/circuit'
import { terminals } from '../core/edit'
import { routeWire } from '../core/routing'
import type { Analysis, Reading } from '../core/solve'
import { useProject } from '../state/project'
import { ModelEditor } from './ModelEditor'

function ValueEditor({ device, ac }: { device: Device; ac: boolean }) {
  const update = useProject((s) => s.update),
    [error, setError] = useState('')
  const labels: Partial<Record<Device['kind'], string>> = {
    source: ac ? 'Voltage RMS' : 'Output voltage',
    resistor: 'Resistance',
    inductor: 'Inductance',
    capacitor: 'Capacitance',
    transformer: 'Turns ratio Np/Ns',
  }
  return (
    <form
      className="parameter-form"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget),
          number = parseQuantity(String(data.get('value')))
        const phase = ac && device.kind === 'source' ? Number(data.get('phase')) : undefined
        if (
          number === null ||
          !validValue(device.kind, number) ||
          (ac && device.kind === 'source' && number < 0)
        ) {
          setError('Value outside the supported model range.')
          return
        }
        if (phase !== undefined && (!Number.isFinite(phase) || Math.abs(phase) > 360)) {
          setError('Phase must be within ±360°.')
          return
        }
        setError('')
        update(device.id, { value: number, ...(phase !== undefined ? { phase } : {}) })
      }}
    >
      <label htmlFor="parameter-value">{labels[device.kind]}</label>
      <div className="input-with-unit">
        <input
          id="parameter-value"
          name="value"
          defaultValue={device.value}
          spellCheck={false}
          aria-describedby={error ? 'parameter-error' : 'parameter-hint'}
          aria-invalid={!!error}
        />
        <span>{valueUnit(device.kind)}</span>
      </div>
      {ac && device.kind === 'source' ? (
        <label className="phase-input">
          Source phase (°){' '}
          <input
            name="phase"
            type="number"
            step="any"
            min={-360}
            max={360}
            defaultValue={device.phase ?? 0}
            required
          />
        </label>
      ) : null}
      <div className="parameter-bottom">
        <small id="parameter-hint">SI prefixes: u, m, k, M</small>
        <button className="button small">
          Apply <ArrowRight size={13} />
        </button>
      </div>
      {error ? (
        <p id="parameter-error" className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
export function Inspector({ analysis, neatWires }: { analysis: Analysis; neatWires: boolean }) {
  const experiment = useProject((s) => s.experiment),
    selected = useProject((s) => s.selected),
    selectedIds = useProject((s) => s.selectedIds),
    selectedWire = useProject((s) => s.selectedWire),
    precision = useProject((s) => s.precision)
  const device = experiment.devices.find((d) => d.id === selected),
    wire = experiment.wires.find((w) => w.id === selectedWire)
  const reading = device && analysis.ok ? analysis.readings[device.id] : null,
    ac = settings(experiment).mode === 'ac'
  const wires = device
    ? experiment.wires.filter(
        (w) => w.from.startsWith(`${device.id}:`) || w.to.startsWith(`${device.id}:`),
      )
    : []
  const options = terminals(experiment),
    name = (end: string) => options.find((t) => t.id === end)?.label ?? end
  const fmt = (n: number | null | undefined, unit: string) =>
    formatQuantity(n ?? null, unit, precision)
  const angle = (n: number | null | undefined) =>
    n === null || n === undefined ? '— °' : `${Number(n.toPrecision(precision))} °`
  function rows(items: [string, keyof Reading, string][]) {
    return items.map(([label, key, unit]) => (
      <div key={key}>
        <dt>{label}</dt>
        <dd>{unit === '°' ? angle(reading?.[key]) : fmt(reading?.[key], unit)}</dd>
      </div>
    ))
  }
  return (
    <aside className="inspector" aria-label="Module inspector">
      <div className="section-heading">
        <h2>Inspector</h2>
        <span className="subtle">
          {wire
            ? 'Wire'
            : selectedIds.length > 1
              ? `${selectedIds.length} selected`
              : device
                ? 'Module'
                : ''}
        </span>
      </div>
      {wire ? (
        <div className="wire-inspector">
          <h3>Wire</h3>
          {(['from', 'to'] as const).map((end) => (
            <label className="inspector-field" key={end}>
              Wire {end}
              <select
                value={wire[end]}
                onChange={(e) =>
                  useProject
                    .getState()
                    .reconnectWire(wire.id, end, e.target.value as typeof wire.from)
                }
              >
                {options.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p className="wire-color-value">
            <span className="wire-swatch" style={{ backgroundColor: wire.color }} />
            {wire.color}
          </p>
          <div className="lead-actions">
            {(['from', 'to'] as const).map((end) => (
              <button
                className="button small"
                key={end}
                onClick={() => useProject.getState().beginReconnect(wire.id, end)}
              >
                Reconnect {end}
              </button>
            ))}
          </div>
          {neatWires && routeWire(experiment, wire).blocked ? (
            <p className="field-error" role="alert">
              Lead route blocked. Separate overlapping modules.
            </p>
          ) : null}
          <p className="technical-note">
            {neatWires ? 'Leads route around boxes. ' : ''}Drag near either wire end, or drag a
            selected lead’s socket, to reconnect. The middle of a wire only selects it.
          </p>
          <button
            className="button danger remove-module"
            onClick={() => useProject.getState().removeWire(wire.id)}
          >
            <Unplug size={14} /> Remove wire
          </button>
        </div>
      ) : device ? (
        <>
          <div className="inspector-title">
            <h3>{device.label}</h3>
            <p>{deviceNames[device.kind]}</p>
          </div>
          {['source', 'resistor', 'inductor', 'capacitor', 'transformer'].includes(device.kind) ? (
            <ValueEditor
              key={`${device.id}-${device.value}-${device.phase ?? 0}-${ac}`}
              device={device}
              ac={ac}
            />
          ) : null}
          {device.kind === 'switch' ? (
            <button
              className="button switch-control"
              onClick={() => useProject.getState().update(device.id, { closed: !device.closed })}
            >
              {device.closed ? 'Open switch' : 'Close switch'}
            </button>
          ) : null}
          <ModelEditor
            key={`${device.id}-${device.seriesResistance}-${JSON.stringify(device.transformer)}`}
            device={device}
          />
          <h3 className="small-heading">Calculated values{ac ? ' · RMS phasors' : ''}</h3>
          <dl className="readings-list">
            {rows([
              [
                device.kind === 'transformer'
                  ? 'Primary voltage RMS + to −'
                  : `Voltage${ac ? ' RMS' : ''} + to −`,
                'voltage',
                'V',
              ],
              [
                device.kind === 'transformer'
                  ? 'Primary current RMS + → −'
                  : `Current${ac ? ' RMS' : ''} + → −`,
                'current',
                'A',
              ],
              [
                device.kind === 'transformer' ? 'Net power absorbed' : 'Power absorbed',
                'power',
                'W',
              ],
            ])}
            {ac ? (
              <>
                {rows([
                  [
                    device.kind === 'transformer' ? 'Net reactive power' : 'Reactive power',
                    'reactivePower',
                    'var',
                  ],
                ])}
                {device.kind !== 'transformer' ? (
                  <>
                    {rows([
                      ['Apparent power', 'apparentPower', 'VA'],
                      ['Power factor', 'powerFactor', ''],
                    ])}
                  </>
                ) : null}
                {rows([
                  ['Voltage phase', 'voltagePhase', '°'],
                  ['Current phase', 'currentPhase', '°'],
                ])}
              </>
            ) : null}
            {device.kind === 'transformer'
              ? rows([
                  ['Secondary voltage RMS', 'secondaryVoltage', 'V'],
                  ['Secondary current RMS', 'secondaryCurrent', 'A'],
                  ['Secondary voltage phase', 'secondaryVoltagePhase', '°'],
                  ['Secondary current phase', 'secondaryCurrentPhase', '°'],
                  ['Primary input P', 'inputPower', 'W'],
                  ['Secondary output P', 'outputPower', 'W'],
                  ['Copper loss', 'loss', 'W'],
                  ['Core-shunt loss', 'coreLoss', 'W'],
                ])
              : device.seriesResistance !== undefined
                ? rows([['Series loss', 'loss', 'W']])
                : null}
          </dl>
          {['resistor', 'inductor', 'capacitor'].includes(device.kind) ? (
            <details className="model-details">
              <summary>Impedance{ac ? ` · ${settings(experiment).frequency} Hz` : ''}</summary>
              <dl className="readings-list">
                {rows([
                  ['Resistance R', 'impedanceReal', 'Ω'],
                  ['Reactance X', 'impedanceImag', 'Ω'],
                  ['Magnitude |Z|', 'impedanceMagnitude', 'Ω'],
                  ['Angle', 'impedancePhase', '°'],
                ])}
              </dl>
            </details>
          ) : null}
          <details className="model-details">
            <summary>Model</summary>
            <p className="technical-note">
              {device.kind === 'voltmeter'
                ? 'Non-loading differential voltage meter. Unconnected inputs are unavailable.'
                : device.kind === 'ammeter'
                  ? 'Ideal 0 V series branch. A source short or redundant ideal loop is invalid.'
                  : device.kind === 'ground'
                    ? 'Mathematical 0 V reference, not protective earth.'
                    : device.kind === 'transformer'
                      ? 'Two coupled windings, finite magnetizing inductance, leakage via k, explicit copper resistance and core-shunt loss. Each winding needs a declared reference. No saturation, hysteresis or transients.'
                      : ac
                        ? 'Sinusoidal steady state. RMS phasors; no startup or switching transient. Positive Q is inductive. Negative active power means delivery. PF is magnitude.'
                        : 'DC steady state. Negative terminal power means energy delivery.'}
            </p>
          </details>
          <div className="section-heading connections-heading">
            <h3>Connections</h3>
            <span className="count">{wires.length}</span>
          </div>
          {wires.length ? (
            <ul className="connection-list">
              {wires.map((w) => (
                <li key={w.id}>
                  <span>
                    {name(w.from)} <ArrowRight size={10} /> {name(w.to)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Remove wire ${name(w.from)} to ${name(w.to)}`}
                    onClick={() => useProject.getState().removeWire(w.id)}
                  >
                    <Unplug size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-message">No connections.</p>
          )}
          {selectedIds.length > 1 ? (
            <div className="selection-actions">
              <button className="button small" onClick={() => useProject.getState().duplicate()}>
                Duplicate selection
              </button>
              <button
                className="button small"
                onClick={() => useProject.getState().removeSelected()}
              >
                Delete selection
              </button>
            </div>
          ) : (
            <button
              className="button danger remove-module"
              onClick={() => useProject.getState().remove(device.id)}
            >
              <Trash2 size={14} /> Remove module
            </button>
          )}
        </>
      ) : (
        <p className="empty-message">No selection.</p>
      )}
    </aside>
  )
}
