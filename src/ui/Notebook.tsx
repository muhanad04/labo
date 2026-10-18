import { Download, RotateCcw, X } from 'lucide-react'
import { formatQuantity, settings } from '../core/circuit'
import { useProject } from '../state/project'
import type { Observation } from '../state/project'
import { download, toCsv } from './files'

function meter(note: Observation, kind: 'ammeter' | 'voltmeter') {
  const label = note.experiment.devices.find((d) => d.kind === kind)?.label
  return note.values.find((v) => v.label === label)
}
export function Notebook({ onClose }: { onClose: () => void }) {
  const notes = useProject((s) => s.observations),
    commit = useProject((s) => s.commit)
  function exportCsv() {
    const rows: unknown[][] = [
      [
        'recorded_at',
        'experiment',
        'mode',
        'frequency_Hz',
        'module',
        'voltage_V',
        'current_A',
        'power_W',
        'reactive_var',
        'apparent_VA',
        'power_factor',
        'voltage_phase_deg',
        'current_phase_deg',
        'series_or_copper_loss_W',
        'core_shunt_loss_W',
        'primary_input_W',
        'secondary_output_W',
        'secondary_voltage_V',
        'secondary_current_A',
        'secondary_voltage_phase_deg',
        'secondary_current_phase_deg',
        'impedance_R_ohm',
        'impedance_X_ohm',
        'impedance_magnitude_ohm',
        'impedance_phase_deg',
      ],
    ]
    for (const note of notes)
      for (const value of note.values)
        rows.push([
          note.at,
          note.title,
          settings(note.experiment).mode,
          settings(note.experiment).mode === 'ac' ? settings(note.experiment).frequency : '',
          value.label,
          value.voltage,
          value.current,
          value.power,
          value.reactivePower,
          value.apparentPower,
          value.powerFactor,
          value.voltagePhase,
          value.currentPhase,
          value.loss,
          value.coreLoss,
          value.inputPower,
          value.outputPower,
          value.secondaryVoltage,
          value.secondaryCurrent,
          value.secondaryVoltagePhase,
          value.secondaryCurrentPhase,
          value.impedanceReal,
          value.impedanceImag,
          value.impedanceMagnitude,
          value.impedancePhase,
        ])
    download('labo-observations.csv', toCsv(rows), 'text/csv;charset=utf-8')
  }
  return (
    <section className="notebook" aria-label="Recorded data">
      <div className="notebook-heading">
        <h2>
          Data table{' '}
          <span className="subtle">
            {notes.length} {notes.length === 1 ? 'record' : 'records'}
          </span>
        </h2>
        <button className="button small" disabled={!notes.length} onClick={exportCsv}>
          <Download size={13} /> Export CSV
        </button>
        <button className="icon-button" aria-label="Close data table" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Recorded measurements">
        <table>
          <caption className="sr-only">
            Recorded circuit snapshots. Voltage and current summarize the first matching meter in
            each snapshot.
          </caption>
          <thead>
            <tr>
              <th>Record</th>
              <th>Mode</th>
              <th>Source</th>
              <th>Resistance</th>
              <th>Voltmeter</th>
              <th>Ammeter</th>
              <th>
                <span className="sr-only">Restore circuit</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!notes.length ? (
              <tr>
                <td colSpan={7} className="empty-message">
                  No recorded data.
                </td>
              </tr>
            ) : (
              notes.map((note, i) => {
                const source = note.experiment.devices.find((d) => d.kind === 'source')
                const resistor = note.experiment.devices.find((d) => d.kind === 'resistor')
                return (
                  <tr key={note.id}>
                    <th scope="row">
                      <span>{i + 1}</span>
                      <small>
                        {new Date(note.at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </small>
                    </th>
                    <td>
                      {settings(note.experiment).mode === 'ac'
                        ? `AC RMS · ${settings(note.experiment).frequency} Hz`
                        : 'DC'}
                    </td>
                    <td>{formatQuantity(source?.value ?? null, 'V')}</td>
                    <td>{formatQuantity(resistor?.value ?? null, 'Ω')}</td>
                    <td>{formatQuantity(meter(note, 'voltmeter')?.voltage ?? null, 'V')}</td>
                    <td>{formatQuantity(meter(note, 'ammeter')?.current ?? null, 'A')}</td>
                    <td>
                      <button
                        className="icon-button"
                        title="Restore circuit settings"
                        aria-label={`Restore circuit from reading ${i + 1}`}
                        onClick={() => commit(structuredClone(note.experiment))}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
