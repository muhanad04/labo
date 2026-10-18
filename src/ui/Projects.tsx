import { useState } from 'react'
import { X } from 'lucide-react'
import { deleteNamed, putNamed, readLibrary, readRecovery } from '../state/library'
import type { SavedProject } from '../state/library'
import { projectFile, useProject } from '../state/project'
import type { ProjectFile } from '../state/project'
import { download } from './files'

export function Projects({
  onClose,
  onOpen,
}: {
  onClose: () => void
  onOpen: (file: ProjectFile) => void
}) {
  const title = useProject((s) => s.experiment.title)
  const [name, setName] = useState(title),
    [entries, setEntries] = useState<SavedProject[]>(() => {
      try {
        return readLibrary()
      } catch {
        return []
      }
    })
  const [message, setMessage] = useState(() => {
    try {
      readLibrary()
      return ''
    } catch (e) {
      return String(e)
    }
  })
  function attempt(action: () => void) {
    try {
      action()
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Storage operation failed. Export projects for backup.',
      )
    }
  }
  return (
    <section className="tool-panel" aria-label="Project library">
      <div className="notebook-heading">
        <h2>Projects</h2>
        <span className="subtle">This browser · {entries.length}/8</span>
        <button className="icon-button dock-close" aria-label="Close projects" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      <form
        className="tool-form"
        onSubmit={(e) => {
          e.preventDefault()
          attempt(() => {
            const existing = entries.find((entry) => entry.name === name.trim())
            if (existing && !window.confirm(`Replace saved project “${existing.name}”?`)) return
            setEntries(putNamed(name, projectFile(), existing?.id))
            setMessage('Project saved.')
          })
        }}
      >
        <label>
          Project name{' '}
          <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="button">Save named project</button>
        <button
          className="button"
          type="button"
          onClick={() =>
            attempt(() => {
              const recovered = readRecovery()
              if (!recovered) {
                setMessage('No previous autosave.')
                return
              }
              if (
                window.confirm(
                  'Restore the previous autosave, replacing the active circuit and data?',
                )
              ) {
                onOpen(recovered)
                setMessage('Previous autosave restored.')
              }
            })
          }
        >
          Recover previous autosave
        </button>
      </form>
      {message ? (
        <p className="tool-message" role="status">
          {message}
        </p>
      ) : null}
      <div className="table-scroll" role="region" tabIndex={0} aria-label="Saved projects">
        <table>
          <caption className="sr-only">Saved local projects</caption>
          <thead>
            <tr>
              <th>Name</th>
              <th>Saved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length ? (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <th>{entry.name}</th>
                  <td>{new Date(entry.savedAt).toLocaleString()}</td>
                  <td className="table-actions">
                    <button
                      className="button small"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Open “${entry.name}”, replacing the active circuit and data?`,
                          )
                        )
                          onOpen(entry.file)
                      }}
                    >
                      Open
                    </button>
                    <button
                      className="button small"
                      onClick={() =>
                        download('labo-project.json', JSON.stringify(entry.file, null, 2))
                      }
                    >
                      Export
                    </button>
                    <button
                      className="button small"
                      onClick={() =>
                        attempt(() => {
                          if (window.confirm(`Delete saved project “${entry.name}”?`))
                            setEntries(deleteNamed(entry.id))
                        })
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>No saved projects.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
