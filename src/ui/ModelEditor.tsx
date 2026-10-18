import { useState } from 'react'
import { parseExperiment, parseQuantity } from '../core/circuit'
import type { Device, TransformerModel } from '../core/circuit'
import { useProject } from '../state/project'

const windingFields: [keyof TransformerModel, string, string][] = [
  ['primaryInductance', 'Primary inductance', 'H'],
  ['coupling', 'Coupling k', ''],
  ['primaryResistance', 'Primary winding resistance', 'Ω'],
  ['secondaryResistance', 'Secondary winding resistance', 'Ω'],
  ['coreResistance', 'Core-loss shunt resistance', 'Ω'],
]
export function ModelEditor({ device }: { device: Device }) {
  const [error, setError] = useState('')
  if (!['source', 'inductor', 'capacitor', 'transformer'].includes(device.kind)) return null
  const transformer = device.kind === 'transformer'
  return (
    <details className="model-details loss-editor">
      <summary>{transformer ? 'Winding model' : 'Impedance / losses'}</summary>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const data = new FormData(e.currentTarget)
          const change: Partial<Device> = {}
          if (transformer) {
            const params = {} as TransformerModel
            for (const [key] of windingFields) {
              const text = String(data.get(key) ?? '').trim()
              const n = text === '' && key === 'coreResistance' ? null : parseQuantity(text)
              if (n === null && !(key === 'coreResistance' && text === '')) {
                setError('Enter numeric parameters, with optional SI prefixes.')
                return
              }
              if (key === 'coreResistance') params.coreResistance = n
              else params[key] = n!
            }
            change.transformer = params
          } else {
            const n = parseQuantity(String(data.get('seriesResistance')))
            if (n === null) {
              setError('Enter a resistance in ohms.')
              return
            }
            change.seriesResistance = n
          }
          const state = useProject.getState()
          const doc = {
            ...state.experiment,
            version: state.experiment.version === 4 ? 4 as const : 3 as const,
            devices: state.experiment.devices.map((d) =>
              d.id === device.id ? { ...d, ...change } : d,
            ),
          }
          try {
            parseExperiment(doc)
            state.commit(doc)
            setError('')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Invalid model parameters.')
          }
        }}
      >
        {transformer ? (
          windingFields.map(([key, label, unit]) => (
            <label className="inspector-field" key={key}>
              {label}
              <div className="input-with-unit">
                <input
                  name={key}
                  aria-label={label}
                  defaultValue={device.transformer![key] ?? ''}
                  spellCheck={false}
                />
                <span>{unit}</span>
              </div>
            </label>
          ))
        ) : (
          <label className="inspector-field">
            {device.kind === 'source'
              ? 'Internal resistance'
              : device.kind === 'capacitor'
                ? 'Equivalent series resistance'
                : 'Winding resistance'}
            <div className="input-with-unit">
              <input
                name="seriesResistance"
                aria-label="Series resistance"
                defaultValue={device.seriesResistance ?? 0}
                spellCheck={false}
                required
              />
              <span>Ω</span>
            </div>
          </label>
        )}
        <button className="button small">Apply model</button>
        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}
        <p className="technical-note">
          {transformer
            ? 'Linear coupled windings. Ratio is Np/Ns. P+ and S+ are dotted. Core loss is a primary-terminal shunt; blank disables it. No saturation or thermal model.'
            : '0 Ω is ideal. Enter measured or specified resistance; constant values do not model temperature, bias or high-frequency parasitics.'}
        </p>
      </form>
    </details>
  )
}
