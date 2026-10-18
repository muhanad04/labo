import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('startup loads the Inspector export and keeps the window title plain', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await expect(page).toHaveTitle('labo')
  expect(
    await page.evaluate(async () => {
      const path = '/src/ui/Inspector.tsx'
      const module = await import(path)
      return typeof module.Inspector
    }),
  ).toBe('function')
  expect(errors).toEqual([])
})
test('circuit bar downloads a valid textbook-style SVG with exact captured topology', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('summary').getByText('Export drawing', { exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Drawing resistor style', exact: true })
    .selectOption('iec')
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download SVG', exact: true }).click()
  const file = await event
  expect(file.suggestedFilename()).toBe('labo-schematic.svg')
  const svg = await readFile((await file.path())!, 'utf8')
  const structure = await page.evaluate((value) => {
    const doc = new DOMParser().parseFromString(value, 'image/svg+xml')
    return {
      errors: doc.querySelectorAll('parsererror').length,
      scripts: doc.querySelectorAll('script').length,
      components: doc.querySelectorAll('[data-device]').length,
      wires: doc.querySelectorAll('[data-wire]').length,
    }
  }, svg)
  expect(structure).toEqual({ errors: 0, scripts: 0, components: 5, wires: 6 })
  expect(svg).toContain('resistorStyle&quot;:&quot;iec')
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
})
async function dragSocket(page: Page, from: string, to: string) {
  const a = await page.getByRole('button', { name: from, exact: true }).boundingBox(),
    b = await page.getByRole('button', { name: to, exact: true }).boundingBox()
  if (!a || !b) throw new Error('Missing terminal')
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
  await page.mouse.down()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 })
  await page.mouse.up()
}
test('number fields stay in place with fixed units and symbols while editing', async ({ page }) => {
  await page.goto('/')
  const field = page.getByRole('textbox', { name: 'Value of R1', exact: true }),
    display = page.getByTestId('reading-r1')
  const before = await display.boundingBox(),
    symbol = await page
      .getByRole('region', { name: 'R1 Resistor', exact: true })
      .locator('.circuit-symbol')
      .innerHTML()
  await expect(field).toHaveValue('1')
  await expect(display.locator('.component-unit')).toHaveText('kΩ')
  await field.click()
  expect(await display.boundingBox()).toEqual(before)
  expect(
    await page
      .getByRole('region', { name: 'R1 Resistor', exact: true })
      .locator('.circuit-symbol')
      .innerHTML(),
  ).toBe(symbol)
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await field.fill('2')
  expect(await display.boundingBox()).toEqual(before)
  await expect(display.locator('.component-unit')).toHaveText('kΩ')
  await field.press('Enter')
  await expect(field).toHaveValue('2')
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await field.fill('bad')
  await field.press('Enter')
  await expect(field).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await field.press('Escape')
  await expect(field).toHaveValue('2')
  await field.fill('3k')
  await field.press('Tab')
  await expect(page.getByTestId('reading-a1')).toHaveText('3.3333 mA')
})
test('focusing a rounded component display does not round its actual parameter', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('rl')
  const field = page.getByRole('textbox', { name: 'Value of L1', exact: true })
  await field.click()
  await field.press('Tab')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('labo.project.v3')!).experiment.devices.find(
          (d: { id: string }) => d.id === 'l1',
        ).value,
    ),
  ).toBe(1 / Math.PI)
  await expect(page.getByTestId('reading-a1')).toHaveText('70.711 mA')
})
test('auto color classifies existing leads without gold and remains undoable', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('checkbox', { name: 'Auto color', exact: true }).check()
  const colors = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('labo.project.v3')!).experiment.wires.map(
      (w: { color: string }) => w.color,
    ),
  )
  expect(colors).toEqual(['#b64c38', '#2b2b2b', '#2b2b2b', '#2b2b2b', '#b64c38', '#2b2b2b'])
  await expect(page.getByRole('combobox', { name: 'Wire color', exact: true })).toBeDisabled()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Auto color', exact: true })).not.toBeChecked()
})
test('grid is visible, snap enables it, zoom reaches real 50%, and neat routing is optional', async ({
  page,
}) => {
  await page.goto('/')
  const neat = page.getByRole('checkbox', { name: 'Neat wires (experimental)', exact: true })
  await expect(neat).not.toBeChecked()
  const wire = page.getByRole('button', { name: 'Select wire Source + to R1 +', exact: true }),
    curve = await wire.getAttribute('d')
  const before = await page.locator('.bench-world').boundingBox()
  await page.locator('summary').getByText('View', { exact: true }).click()
  await page.getByRole('button', { name: 'Snap to grid', exact: true }).click()
  await expect(page.locator('.bench-world')).toHaveClass(/show-grid/)
  expect(
    await page.locator('.bench-world').evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain('linear-gradient')
  for (let i = 0; i < 5; i++)
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Fit bench', exact: true })).toHaveText('50%')
  await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeDisabled()
  const after = await page.locator('.bench-world').boundingBox()
  expect(after!.width / before!.width).toBeCloseTo(0.5, 2)
  await neat.check()
  await expect(wire).not.toHaveAttribute('d', curve!)
  await expect(page.locator('.wire-hit[data-route-blocked="true"]')).toHaveCount(0)
  await neat.uncheck()
  await expect(wire).toHaveAttribute('d', curve!)
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
})
test('drag-to-wire creates a real series circuit without control points', async ({ page }) => {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('blank')
  for (const name of ['Voltage source', 'Resistor', 'Ammeter', 'Reference'])
    await page.getByRole('button', { name: `Add ${name}`, exact: true }).click()
  await dragSocket(page, 'Source1 positive terminal', 'R1 positive terminal')
  await dragSocket(page, 'R1 negative terminal', 'A1 positive terminal')
  await dragSocket(page, 'A1 negative terminal', 'Source1 negative terminal')
  await dragSocket(page, 'Source1 negative terminal', 'Reference1 positive terminal')
  await expect(
    page.getByRole('region', { name: 'A1 Ammeter', exact: true }).locator('.module-value'),
  ).toHaveText('10 mA')
  await expect(page.locator('.wire-hit')).toHaveCount(4)
  await expect(page.locator('.wire-point-handle,.wire-end-handle')).toHaveCount(0)
})
test('loaded transformer exposes real secondary readings and editable winding losses', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept())
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('transformer')
  await page.getByRole('button', { name: 'Select or move T1', exact: true }).click()
  const inspector = page.getByRole('complementary', { name: 'Module inspector' })
  await expect(inspector).toContainText('59.03 V')
  await expect(inspector).toContainText('Copper loss')
  await inspector.locator('summary').getByText('Winding model', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Primary winding resistance', exact: true }).fill('20')
  await page.getByRole('button', { name: 'Apply model', exact: true }).click()
  await expect(inspector).not.toContainText('59.03 V')
  await page.getByRole('button', { name: 'Record reading', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('table')).toContainText('AC RMS · 50 Hz')
})
