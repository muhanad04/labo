import { expect, it } from 'vitest'
import { example } from './circuit'
import { acExample } from './examples'
import { electricalSignature, runSweep } from './sweep'
import type { SweepSpec } from './sweep'
import { toCsv } from './csv'
const spec: SweepSpec = {
  parameter: 'r1',
  start: 100,
  stop: 1000,
  count: 10,
  spacing: 'linear',
  device: 'a1',
  measure: 'current',
}
it('sweeps the captured circuit without mutating it or silently applying values', async () => {
  const doc = example(),
    before = structuredClone(doc)
  const result = await runSweep(doc, spec)
  expect(result.points[0].y).toBeCloseTo(0.1, 10)
  expect(result.points.at(-1)!.y).toBeCloseTo(0.01, 10)
  expect(doc).toEqual(before)
  expect(result.snapshot).toEqual(before)
  expect(result.xUnit).toBe('Ω')
  expect(result.yUnit).toBe('A')
})
it('retains invalid points as unavailable instead of fabricating measurements', async () => {
  const result = await runSweep(example(), { ...spec, start: 0, stop: 1000, count: 3 })
  expect(result.points[0].y).toBeNull()
  expect(result.points[0].diagnostic).toContain('Resistance')
  expect(result.points[1].y).toBeCloseTo(0.02, 10)
})
it('supports logarithmic AC frequency points', async () => {
  const r = await runSweep(acExample(), {
    ...spec,
    parameter: 'frequency',
    start: 5,
    stop: 500,
    count: 3,
    spacing: 'log',
  })
  expect(r.points.map((p) => Math.round(p.x))).toEqual([5, 50, 500])
  expect(r.points[1].y).toBeCloseTo(1 / Math.sqrt(200), 9)
})
it('rejects unbounded/invalid requests and allows cancellation', async () => {
  await expect(runSweep(example(), { ...spec, count: 10000 })).rejects.toThrow('2–101')
  await expect(runSweep(example(), { ...spec, spacing: 'log', start: 0 })).rejects.toThrow(
    'positive',
  )
  await expect(runSweep(example(), { ...spec, parameter: 'frequency' })).rejects.toThrow('AC')
  const abort = new AbortController()
  abort.abort()
  await expect(runSweep(example(), spec, abort.signal)).rejects.toThrow('cancelled')
})
it('cancels between batches without producing a partial result', async () => {
  const controller = new AbortController()
  let completed = 0
  await expect(
    runSweep(example(), { ...spec, count: 101 }, controller.signal, (n) => {
      completed = n
      if (n === 4) controller.abort()
    }),
  ).rejects.toThrow('cancelled')
  expect(completed).toBe(4)
})
it('detects electrical changes but ignores labels, layout, lead color and routing', () => {
  const doc = example(),
    before = electricalSignature(doc)
  doc.positions.r1.x += 20
  doc.devices[0].label = 'Renamed source'
  doc.wires[0].color = '#000000'
  doc.wires[0].points = [{ x: 100, y: 250 }]
  expect(electricalSignature(doc)).toBe(before)
  doc.devices[1].value = 2000
  expect(electricalSignature(doc)).not.toBe(before)
})
it('CSV preserves numeric negatives and neutralizes formula-like text', () => {
  const csv = toCsv([['=UNSAFE()', -10, 'a"b', null]])
  expect(csv).toBe('"\'=UNSAFE()","-10","a""b",""')
  expect(toCsv([['  =UNSAFE()', '\n+UNSAFE()', ' safe']])).toBe(
    '"\'  =UNSAFE()","\'\n+UNSAFE()"," safe"',
  )
})
