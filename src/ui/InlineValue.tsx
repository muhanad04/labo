import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { parseQuantity, validValue } from '../core/circuit'
import type { Device } from '../core/circuit'
import { useProject } from '../state/project'

/** The display is always the editor: only the number changes, never its unit or geometry. */
export function InlineValue({ device, text, ac }: { device: Device; text: string; ac: boolean }) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(''),
    [invalid, setInvalid] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const session = useRef<{ active: boolean; initial: string; scale: number }>({
    active: false,
    initial: '',
    scale: 1,
  })
  const editable = ['source', 'resistor', 'inductor', 'capacitor', 'transformer'].includes(
    device.kind,
  )
  const split = text.trim().match(/^(\S+)\s*(.*)$/)!
  const numeric = split[1],
    unit = split[2]
  const scale =
    device.kind === 'transformer' ? 1 : ({ M: 1e6, k: 1e3, m: 1e-3, µ: 1e-6 }[unit[0]] ?? 1)
  const style: CSSProperties = {
    fontSize: `min(18px, ${Math.min(1.65, 14 / (text.length + 1))}cqw)`,
  }
  function begin() {
    session.current = { active: true, initial: numeric, scale }
    setDraft(numeric)
    setInvalid(false)
    setEditing(true)
    const state = useProject.getState()
    if (state.pending || state.reconnecting) state.cancel()
    state.select(device.id)
  }
  function cancel() {
    session.current.active = false
    setEditing(false)
    setInvalid(false)
  }
  function save() {
    const current = session.current
    if (!current.active) return true
    // Focusing an already rounded display must never round the actual stored parameter.
    if (draft === current.initial) {
      cancel()
      return true
    }
    const parsed = parseQuantity(draft)
    const number =
      parsed === null ? null : parsed * (/[pnumkMG]$/.test(draft.trim()) ? 1 : current.scale)
    if (
      number === null ||
      !validValue(device.kind, number) ||
      (ac && device.kind === 'source' && number < 0)
    ) {
      setInvalid(true)
      useProject.setState({
        notice: `${device.label}: value outside the supported range. Enter a number or an explicit SI suffix.`,
      })
      return false
    }
    cancel()
    if (number !== device.value) useProject.getState().update(device.id, { value: number })
    else useProject.setState({ notice: '' })
    return true
  }
  if (!editable)
    return (
      <button
        type="button"
        className="module-value"
        data-testid={`reading-${device.id}`}
        style={style}
        aria-label={
          device.kind === 'switch' ? `Toggle ${device.label}` : `Inspect ${device.label} reading`
        }
        title={text}
        onClick={(e) => {
          e.stopPropagation()
          const state = useProject.getState()
          state.select(device.id)
          if (device.kind === 'switch') state.update(device.id, { closed: !device.closed })
        }}
      >
        {text}
      </button>
    )
  return (
    <form
      className="module-value editable-value"
      data-testid={`reading-${device.id}`}
      style={style}
      onSubmit={(e) => {
        e.preventDefault()
        save()
      }}
      onClick={(e) => {
        e.stopPropagation()
        input.current?.focus()
      }}
    >
      <input
        ref={input}
        className="component-number"
        aria-label={`Value of ${device.label}`}
        aria-describedby={`unit-${device.id}`}
        aria-invalid={invalid}
        value={editing ? draft : numeric}
        spellCheck={false}
        autoComplete="off"
        title={`Value in ${unit || 'base units'}. Explicit SI suffixes override the displayed prefix. Enter: apply. Escape: cancel.`}
        onFocus={(e) => {
          begin()
          e.currentTarget.select()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          if (!session.current.active) begin()
          setDraft(e.target.value)
          setInvalid(false)
        }}
        onBlur={() => {
          if (!save()) cancel()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            cancel()
          }
        }}
      />
      <span id={`unit-${device.id}`} className="component-unit">
        {unit}
      </span>
    </form>
  )
}
