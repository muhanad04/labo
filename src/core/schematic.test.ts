import { expect, it } from 'vitest'
import { blank, example } from './circuit'
import { acExample, threePhaseExample, transformerExample } from './examples'
import { schematicSvg } from './schematic'

it('exports every supported preset as standalone, connected black-and-white SVG without changing the circuit', () => {
  for (const doc of [
    example(),
    example('divider'),
    acExample(),
    threePhaseExample(),
    transformerExample(),
  ]) {
    const before = JSON.stringify(doc),
      svg = schematicSvg(doc)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).not.toContain('NaN')
    expect(svg).not.toContain('undefined')
    expect((svg.match(/data-device=/g) ?? []).length).toBe(doc.devices.length)
    expect((svg.match(/data-wire=/g) ?? []).length).toBe(doc.wires.length)
    for (const w of doc.wires) {
      expect(svg).toContain(`data-from="${w.from}"`)
      expect(svg).toContain(`data-to="${w.to}"`)
    }
    const encoded = svg.match(/<metadata>(.*?)<\/metadata>/s)![1]
    const restored = JSON.parse(
      encoded
        .replaceAll('&quot;', '"')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&'),
    )
    expect(restored.experiment).toEqual(doc)
    expect(JSON.stringify(doc)).toBe(before)
  }
})
it('offers both resistor conventions and explicitly includes non-ideal model parameters', () => {
  const doc = transformerExample(),
    svg = schematicSvg(doc, 'iec')
  expect(svg).toContain('internal resistance')
  expect(svg).toContain('primary-terminal shunt')
  expect(svg).toContain('Lp 2 H')
  expect(svg).toContain('k 0.995')
  expect(svg).not.toBe(schematicSvg(doc, 'ansi'))
  expect(svg).toContain('crossings without dots do not connect')
})
it('escapes labels/metadata and refuses an empty or obstructed drawing', () => {
  const doc = example()
  doc.title = '<script>alert("x")</script>'
  doc.devices[1].label = 'R <img onerror="bad()">'
  const svg = schematicSvg(doc)
  expect(svg).not.toContain('<script>')
  expect(svg).not.toContain('<img ')
  expect(svg).toContain('&lt;script&gt;')
  expect(() => schematicSvg(blank())).toThrow('Add a component')
  doc.positions.r1 = { ...doc.positions.s1 }
  expect(() => schematicSvg(doc)).toThrow('overlapping')
})
