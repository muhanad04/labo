import { useEffect, useMemo, useRef, useState } from 'react'
import type { Experiment } from '../core/circuit'
import type { ResistorStyle, SchematicOptions } from '../core/schematic'
import { useProject } from '../state/project'
import { CommandMenu } from './CommandMenu'
import { download } from './files'

const STYLE_KEY = 'labo.drawing.resistor-style.v1'
function savedStyle(): ResistorStyle {
  try { return localStorage.getItem(STYLE_KEY) === 'iec' ? 'iec' : 'ansi' }
  catch { return 'ansi' }
}

export function SchematicExport({ experiment }: { experiment: Experiment }) {
  const [style, setStyle] = useState<ResistorStyle>(savedStyle)
  const [options, setOptions] = useState<SchematicOptions>({ title: true, values: true, modelNotes: true })
  const [busy, setBusy] = useState(false)
  const [snapshot, setSnapshot] = useState<Experiment | null>(null)
  const [rendered, setRendered] = useState<{ key: string; svg: string } | null>(null)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null), returnFocus = useRef<HTMLElement | null>(null)
  const key = JSON.stringify([style, options])
  const ready = snapshot !== null && rendered?.key === key
  const previewUrl = useMemo(() => rendered ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rendered.svg)}` : '', [rendered])

  useEffect(() => {
    try { localStorage.setItem(STYLE_KEY, style) }
    catch { /* Drawing export still works when preference storage is unavailable. */ }
  }, [style])

  useEffect(() => {
    if (!snapshot) return
    let cancelled = false
    setError('')
    const requestKey = JSON.stringify([style, options])
    void import('../core/schematic').then(({ schematicSvg }) => {
      const svg = schematicSvg(snapshot, style, options)
      if (!cancelled) setRendered({ key: requestKey, svg })
    }).catch((e: unknown) => {
      if (!cancelled) setError(e instanceof Error ? e.message : 'Drawing preview failed.')
    })
    return () => { cancelled = true }
  }, [snapshot, style, options])

  function openPreview(button: HTMLButtonElement) {
    returnFocus.current = button.closest('details')?.querySelector('summary') ?? null
    setRendered(null)
    setError('')
    setSnapshot(structuredClone(experiment))
    if (dialog.current && !dialog.current.open) dialog.current.showModal()
  }
  async function exportDrawing(print = false) {
    const captured = structuredClone(snapshot ?? experiment)
    const paper = print ? window.open('', '_blank') : null
    if (print && !paper) {
      useProject.setState({ notice: 'Allow the print window, or download SVG instead.' })
      return
    }
    if (paper) paper.opener = null
    setBusy(true)
    try {
      const { schematicSvg } = await import('../core/schematic')
      const svg = ready && rendered ? rendered.svg : schematicSvg(captured, style, options)
      if (paper) {
        paper.document.open()
        paper.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>labo schematic</title><style>@page{size:A4 landscape;margin:12mm}body{margin:0;background:white}svg{display:block;width:100%;height:auto;max-height:180mm}</style></head><body>${svg.replace(/^<\?xml[^>]+>\s*/, '')}</body></html>`)
        paper.document.close()
        await paper.document.fonts.ready
        paper.requestAnimationFrame(() => { paper.focus(); paper.print() })
      } else download('labo-schematic.svg', svg, 'image/svg+xml;charset=utf-8')
      useProject.setState({ notice: print ? 'Print window opened. Choose Save as PDF if required.' : 'Schematic SVG exported.' })
    } catch (e) {
      paper?.close()
      useProject.setState({ notice: e instanceof Error ? e.message : 'Drawing export failed.' })
    } finally { setBusy(false) }
  }
  function resistorControl() {
    return <label className="schematic-options">Resistor style{' '}
      <select aria-label="Drawing resistor style" value={style} disabled={busy} onChange={e => setStyle(e.target.value as ResistorStyle)}>
        <option value="ansi">ANSI · zig-zag</option><option value="iec">IEC · rectangle</option>
      </select>
    </label>
  }
  return <>
    <CommandMenu label="Export drawing">
      {resistorControl()}
      <button disabled={busy || !experiment.devices.length} onClick={e => openPreview(e.currentTarget)}>Preview / options…</button>
      <button disabled={busy || !experiment.devices.length} onClick={() => void exportDrawing()}>Download SVG</button>
      <button disabled={busy || !experiment.devices.length} onClick={() => void exportDrawing(true)}>Print / Save PDF</button>
      <p className="drawing-hint">Electrical layout, independent of the bench. Other networks use explicit net labels.</p>
    </CommandMenu>
    <dialog ref={dialog} className="drawing-dialog" aria-labelledby="drawing-preview-heading"
      onKeyDown={e => e.stopPropagation()}
      onClose={() => { setSnapshot(null); setRendered(null); returnFocus.current?.focus() }}>
      <header className="drawing-dialog-header">
        <h2 id="drawing-preview-heading">Drawing preview</h2>
        <form method="dialog"><button autoFocus type="submit">Close</button></form>
      </header>
      <div className="drawing-controls">
        {resistorControl()}
        {([['title', 'Title'], ['values', 'Nominal values'], ['modelNotes', 'Model notes']] as const).map(([field, label]) =>
          <label key={field}><input type="checkbox" checked={options[field]} disabled={busy}
            onChange={e => setOptions(current => ({ ...current, [field]: e.target.checked }))} />{label}</label>)}
      </div>
      <div className="drawing-preview" role="region" aria-label="Schematic preview" tabIndex={0} aria-busy={!!snapshot && !ready && !error}>
        {error ? <p role="alert">{error}</p> : ready ? <img src={previewUrl} alt={`Schematic: ${snapshot?.title}`} /> : <p>Rendering…</p>}
      </div>
      <footer className="drawing-dialog-footer">
        <span>Captured circuit. Full parameters stay in SVG metadata.</span>
        <button disabled={busy || !ready} onClick={() => void exportDrawing()}>Download SVG</button>
        <button disabled={busy || !ready} onClick={() => void exportDrawing(true)}>Print / Save PDF</button>
      </footer>
    </dialog>
  </>
}
