import { useEffect, useLayoutEffect, useRef } from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent, MouseEvent } from 'react'
import type { Point } from '../core/circuit'

const interactive = '.bench-module, .wire-hit, button, input, select, textarea, form, a'

/** One camera: native scroll offsets. No ordinary-wheel interception or per-frame React state. */
export function useBenchPan(
  isBlocked: () => boolean, reset: number, onBlankClick: () => void,
  zoom: number, onZoomChange: (zoom: number) => void, positions: Record<string, Point>,
) {
  const viewport = useRef<HTMLDivElement>(null), world = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null), target = useRef<Point>({ x: 0, y: 0 })
  const metrics = useRef<{ scale: number; x: number; y: number } | null>(null)
  const active = useRef<{ pointerId: number; client: Point; origin: Point; moved: boolean } | null>(null)
  const latest = useRef({ isBlocked, zoom, onZoomChange, positions })
  latest.current = { isBlocked, zoom, onZoomChange, positions }
  const zoomDelta = useRef(0)
  const anchor = useRef<{ u: number; v: number; x: number; y: number } | null>(null)

  function alignGrid() {
    const node = viewport.current, m = metrics.current
    if (!node || !m) return
    node.style.setProperty('--bench-pan-x', `${m.x - node.scrollLeft}px`)
    node.style.setProperty('--bench-pan-y', `${m.y - node.scrollTop}px`)
  }
  function scroll(point: Point, immediate = false) {
    target.current = point
    const apply = () => {
      frame.current = null
      const node = viewport.current
      if (!node) return
      node.scrollLeft = target.current.x
      node.scrollTop = target.current.y
      alignGrid()
    }
    if (immediate) {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      apply()
    } else if (frame.current === null) frame.current = requestAnimationFrame(apply)
  }
  function configure() {
    const node = viewport.current, board = world.current
    if (!node || !board || !node.clientWidth) return
    const old = metrics.current
    const view = old ? { x: (node.scrollLeft - old.x) / old.scale, y: (node.scrollTop - old.y) / old.scale } : { x: 0, y: 0 }
    const values = Object.values(latest.current.positions)
    const width = Math.max(680, node.clientWidth) * latest.current.zoom / 100
    const scale = width / 1200
    // Content-based scroll range plus a board of breathing room on each side.
    // Component movement remains independent of this view window.
    const left = Math.min(0, view.x, ...values.map(p => p.x)) - 1200
    const top = Math.min(0, view.y, ...values.map(p => p.y)) - 800
    const right = Math.max(1200, view.x + node.clientWidth / scale, ...values.map(p => p.x + 200)) + 1200
    const bottom = Math.max(800, view.y + node.clientHeight / scale, ...values.map(p => p.y + 120)) + 800
    const x = -left * scale, y = -top * scale
    metrics.current = { scale, x, y }
    node.style.setProperty('--bench-world-width', `${width}px`)
    node.style.setProperty('--bench-world-left', `${x}px`)
    node.style.setProperty('--bench-world-top', `${y}px`)
    node.style.setProperty('--bench-space-width', `${Math.max((right - left) * scale, x + node.clientWidth + 64)}px`)
    node.style.setProperty('--bench-space-height', `${Math.max((bottom - top) * scale, y + node.clientHeight + 64)}px`)
    node.style.setProperty('--grid-cell-width', `${100 * scale}px`)
    node.style.setProperty('--grid-cell-height', `${120 * scale}px`)
    const saved = anchor.current
    anchor.current = null
    scroll(saved ? {
      x: x + saved.u * width - saved.x,
      y: y + saved.v * width * 2 / 3 - saved.y,
    } : { x: x + view.x * scale, y: y + view.y * scale }, true)
  }
  function release() {
    const session = active.current
    active.current = null
    viewport.current?.classList.remove('panning')
    if (session && viewport.current?.hasPointerCapture(session.pointerId)) viewport.current.releasePointerCapture(session.pointerId)
  }
  function finish(e: PointerEvent<HTMLDivElement>, cancelled = false) {
    const session = active.current
    if (!session || session.pointerId !== e.pointerId) return
    if (cancelled && session.moved) scroll(session.origin)
    if (!cancelled && !session.moved) onBlankClick()
    release()
  }
  function resetPan() {
    const m = metrics.current
    if (m) scroll({ x: m.x, y: m.y }, true)
  }

  useLayoutEffect(configure, [zoom, positions])
  useLayoutEffect(() => {
    anchor.current = null
    zoomDelta.current = 0
    release()
    resetPan()
  }, [reset])

  useEffect(() => {
    const node = viewport.current, board = world.current
    if (!node || !board) return
    const resize = new ResizeObserver(configure)
    resize.observe(node)
    const wheel = (e: WheelEvent) => {
      // Native scrolling/inertia stays native. Ctrl-wheel alone is circuit zoom.
      if (!e.ctrlKey) {
        zoomDelta.current = 0
        if (latest.current.isBlocked() || active.current) e.preventDefault()
        return
      }
      e.preventDefault()
      if (latest.current.isBlocked() || active.current || !e.deltaY) return
      zoomDelta.current += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 200 : 1)
      if (Math.abs(zoomDelta.current) < 40) return
      const next = Math.max(50, Math.min(180, latest.current.zoom - Math.sign(zoomDelta.current) * 10))
      zoomDelta.current %= 40
      if (next === latest.current.zoom) return
      const rect = board.getBoundingClientRect(), view = node.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      anchor.current = {
        u: (e.clientX - rect.left) / rect.width, v: (e.clientY - rect.top) / rect.height,
        x: e.clientX - view.left - node.clientLeft, y: e.clientY - view.top - node.clientTop,
      }
      latest.current.onZoomChange(next)
      latest.current.zoom = next
    }
    node.addEventListener('wheel', wheel, { passive: false })
    node.addEventListener('scroll', alignGrid, { passive: true })
    return () => {
      resize.disconnect()
      node.removeEventListener('wheel', wheel)
      node.removeEventListener('scroll', alignGrid)
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [])

  return {
    viewport, world,
    handlers: {
      onPointerDown(e: PointerEvent<HTMLDivElement>) {
        if (e.button !== 0 || !e.isPrimary || isBlocked() || active.current) return
        if (!(e.target instanceof Element) || e.target.closest(interactive)) return
        e.currentTarget.dataset.focusOrigin = 'pointer'
        // Leave native scrollbar tracks/thumbs entirely to the browser.
        const r = e.currentTarget.getBoundingClientRect()
        if (e.clientX >= r.left + e.currentTarget.clientLeft + e.currentTarget.clientWidth ||
            e.clientY >= r.top + e.currentTarget.clientTop + e.currentTarget.clientHeight) return
        e.preventDefault()
        e.currentTarget.focus({ preventScroll: true })
        e.currentTarget.setPointerCapture(e.pointerId)
        active.current = {
          pointerId: e.pointerId, client: { x: e.clientX, y: e.clientY },
          origin: { x: e.currentTarget.scrollLeft, y: e.currentTarget.scrollTop }, moved: false,
        }
      },
      onPointerMove(e: PointerEvent<HTMLDivElement>) {
        const session = active.current
        if (!session || session.pointerId !== e.pointerId) return
        const dx = e.clientX - session.client.x, dy = e.clientY - session.client.y
        if (!session.moved && Math.hypot(dx, dy) <= 4) return
        session.moved = true
        e.currentTarget.classList.add('panning')
        scroll({ x: session.origin.x - dx, y: session.origin.y - dy })
      },
      onPointerUp(e: PointerEvent<HTMLDivElement>) { finish(e) },
      onPointerCancel(e: PointerEvent<HTMLDivElement>) { finish(e, true) },
      onLostPointerCapture(e: PointerEvent<HTMLDivElement>) { finish(e, true) },
      onDoubleClick(e: MouseEvent<HTMLDivElement>) {
        if (isBlocked() || !(e.target instanceof Element) || e.target.closest(interactive)) return
        release(); resetPan()
      },
      onBlur(e: FocusEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) delete e.currentTarget.dataset.focusOrigin
      },
      onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) e.currentTarget.dataset.focusOrigin = 'keyboard'
        if (e.key === 'Escape' && active.current) {
          e.preventDefault(); scroll(active.current.origin); release(); return
        }
        if (e.target !== e.currentTarget || isBlocked()) return
        const step = e.shiftKey ? 120 : 40
        const directions: Record<string, Point> = {
          ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
          ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
        }
        if (e.key === 'Home') { e.preventDefault(); resetPan() }
        else if (directions[e.key]) {
          e.preventDefault()
          scroll({ x: e.currentTarget.scrollLeft + directions[e.key].x, y: e.currentTarget.scrollTop + directions[e.key].y })
        }
      },
    },
  }
}
