import { useRef } from 'react'
import type { ReactNode } from 'react'

/** Native disclosure semantics; no ARIA menu role without a full menu interaction model. */
export function CommandMenu({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  function close() {
    if (ref.current) ref.current.open = false
  }
  return (
    <details
      className="command-menu"
      ref={ref}
      onToggle={(e) => {
        if (!e.currentTarget.open) return
        e.currentTarget.parentElement?.querySelectorAll('details').forEach((other) => {
          if (other !== e.currentTarget) other.open = false
        })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          close()
          ref.current?.querySelector('summary')?.focus()
          e.stopPropagation()
        }
        if (
          e.key === 'ArrowDown' &&
          e.target instanceof HTMLElement &&
          e.target.tagName === 'SUMMARY'
        ) {
          e.preventDefault()
          if (ref.current) ref.current.open = true
          ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
        }
      }}
    >
      <summary>{label}</summary>
      <div
        className="command-list"
        role="group"
        aria-label={`${label} commands`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) close()
        }}
      >
        {children}
      </div>
    </details>
  )
}
