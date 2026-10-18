import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { example } from '../src/core/circuit'

async function openProjects(page: import('@playwright/test').Page) {
  await page.locator('summary').getByText('File', { exact: true }).click()
  await page.getByRole('button', { name: 'Projects…', exact: true }).click()
}

test('simple leads have keyboard loop controls and socket drag reconnection without route-point widgets', async ({
  page,
}) => {
  await page.goto('/')
  const wire = page.getByRole('button', { name: 'Select wire Source + to R1 +', exact: true })
  const original = await wire.getAttribute('d')
  await wire.focus()
  await page.keyboard.press('Enter')
  await wire.focus()
  await page.keyboard.press('ArrowDown')
  await expect(wire).not.toHaveAttribute('d', original!)
  await expect(page.locator('.wire-point-handle,.wire-end-handle')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add route point', exact: true })).toHaveCount(0)
  const origin = await page
      .getByRole('button', { name: 'R1 positive terminal', exact: true })
      .boundingBox(),
    destination = await page
      .getByRole('button', { name: 'V1 positive terminal', exact: true })
      .boundingBox()
  if (!origin || !destination) throw new Error('Missing socket')
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 8 },
  )
  await page.mouse.up()
  await expect(page.getByRole('combobox', { name: 'Wire to', exact: true })).toHaveValue('v1:p')
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.reload()
  const rerouted = page.getByRole('button', { name: 'Select wire Source + to V1 +', exact: true })
  await expect(rerouted).toHaveCount(1)
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('labo.project.v3')!).experiment.wires.find(
          (w: { id: string }) => w.id === 'w0',
        ).slack,
    ),
  ).toBe(120)
  await expect(page.locator('.wire-hit')).toHaveCount(6)
})

test('group selection, movement, duplication and deletion are atomic and undoable', async ({
  page,
}) => {
  await page.goto('/')
  const source = page.getByRole('button', { name: 'Select or move Source', exact: true }),
    resistor = page.getByRole('button', { name: 'Select or move R1', exact: true })
  await source.click()
  await resistor.click({ modifiers: ['Shift'] })
  await expect(page.locator('.bench-module.selected')).toHaveCount(2)
  const a = await source.boundingBox(),
    b = await resistor.boundingBox()
  if (!a || !b) throw new Error('Missing group')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  const moved = await source.boundingBox()
  expect(moved!.x).toBeGreaterThan(a.x + 10)
  await resistor.focus()
  await page.keyboard.press('Control+d')
  await expect(page.locator('.bench-module')).toHaveCount(7)
  await page.keyboard.press('Control+z')
  await expect(page.locator('.bench-module')).toHaveCount(5)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await expect(page.locator('.bench-module')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
})

test('sweeps produce real sampled data, cursor values, stale detection and a previous-run comparison', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Parameter sweep', exact: true }).click()
  await page.getByRole('textbox', { name: 'Stop', exact: true }).fill('1k')
  await page.getByRole('spinbutton', { name: 'Points', exact: true }).fill('3')
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Parameter sweep', exact: true })).toContainText(
    '3 points; 0 unavailable.',
  )
  await expect(page.getByRole('table')).toContainText('100 mA')
  await expect(page.getByRole('table')).toContainText('10 mA')
  await page.getByRole('slider', { name: 'Sweep cursor' }).focus()
  await page.keyboard.press('End')
  await expect(page.locator('.sweep-controls output')).toContainText('10 mA')
  await page.getByRole('button', { name: 'Select or move Source', exact: true }).click()
  await page.getByRole('textbox', { name: 'Output voltage', exact: true }).fill('20')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Parameter sweep', exact: true })).toContainText(
    'Circuit changed',
  )
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('200 mA')
  await page.getByRole('checkbox', { name: 'Compare previous run' }).check()
  await expect(page.locator('.plot-previous')).toHaveCount(1)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export sweep CSV' }).click()
  const downloaded = await downloadPromise
  expect(downloaded.suggestedFilename()).toBe('labo-sweep.csv')
  const csv = await readFile((await downloaded.path())!, 'utf-8')
  function metadata(name: string) {
    const row = csv.split('\r\n').find((line) => line.startsWith(`"${name}",`))
    expect(row).toBeDefined()
    return JSON.parse(row!.slice(name.length + 4, -1).replaceAll('""', '"'))
  }
  expect(metadata('sweep_spec_json')).toMatchObject({
    parameter: 'r1',
    start: 100,
    stop: 1000,
    count: 3,
    spacing: 'linear',
    device: 'a1',
    measure: 'current',
  })
  expect(
    metadata('circuit_json').devices.find((d: { kind: string }) => d.kind === 'source').value,
  ).toBe(20)
  expect(csv).toContain('"analysis","dc","frequency_Hz","50"')
  const firstRow = csv.split('\r\n').slice(-3)[0].split(',')
  expect(Number(firstRow[1].slice(1, -1))).toBeCloseTo(0.2, 12)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('AC instruments update when frequency changes and three-phase examples use real phasor results', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('rl')
  await expect(page.getByTestId('reading-a1')).toHaveText('70.711 mA')
  await page.getByRole('button', { name: 'Select or move L1', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Module inspector' })).toContainText(
    '500 mvar',
  )
  await page.getByRole('spinbutton', { name: 'Analysis frequency' }).fill('100')
  await page.getByRole('button', { name: 'Set', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('44.721 mA')
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('wye')
  await expect(page.getByTestId('reading-v1')).toHaveText('398.37 V')
  await expect(page.getByTestId('reading-a1')).toHaveText('2.3 A')
  await page.getByRole('button', { name: 'Record reading', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Analysis mode' })).toHaveValue('ac')
  await expect(page.getByRole('table')).toContainText('AC RMS · 50 Hz')
  await page.getByRole('combobox', { name: 'Display significant digits' }).selectOption('7')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(
    await page
      .locator('.module-value')
      .evaluateAll((elements) => elements.every((el) => el.scrollWidth <= el.clientWidth)),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('named projects and previous autosave recover actual circuit settings', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await page.goto('/')
  await openProjects(page)
  await page.getByRole('textbox', { name: 'Project name' }).fill('Experiment A')
  await page.getByRole('button', { name: 'Save named project' }).click()
  await expect(page.getByRole('table')).toContainText('Experiment A')
  await page.getByRole('button', { name: 'Close projects' }).click()
  await page.getByRole('button', { name: 'Select or move R1', exact: true }).click()
  await page.getByRole('textbox', { name: 'Resistance', exact: true }).fill('2k')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await openProjects(page)
  await page
    .getByRole('row')
    .filter({ hasText: 'Experiment A' })
    .getByRole('button', { name: 'Open', exact: true })
    .click()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await openProjects(page)
  await page.getByRole('button', { name: 'Recover previous autosave', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
})

test('invalid autosave remains intact and its warning fits a phone', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('labo.project.v2', '{invalid'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.storage-status')).toContainText('Saved project could not be read')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(await page.evaluate(() => localStorage.getItem('labo.project.v2'))).toBe('{invalid')
})
test('legacy autosave stays intact after a v3 edit and reload', async ({ page }) => {
  const legacy = JSON.stringify({
    format: 'labo-project',
    version: 1,
    experiment: example(),
    observations: [],
  })
  await page.addInitScript((text) => localStorage.setItem('labo.project.v1', text), legacy)
  await page.goto('/')
  const wire = page.getByRole('button', { name: 'Select wire Source + to R1 +', exact: true })
  await wire.focus()
  await page.keyboard.press('Enter')
  await wire.focus()
  await page.keyboard.press('ArrowDown')
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('labo.project.v3')!).version),
  ).toBe(3)
  expect(await page.evaluate(() => localStorage.getItem('labo.project.v1'))).toBe(legacy)
  await page.reload()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await wire.focus()
  await page.keyboard.press('Enter')
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('labo.project.v3')!).experiment.wires[0].slack,
    ),
  ).toBe(120)
})
