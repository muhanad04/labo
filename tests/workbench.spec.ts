import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('edit, undo, record, reload and export a real DC experiment', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.getByRole('button', { name: 'Select or move R1', exact: true }).click()
  await page.getByLabel('Resistance', { exact: true }).fill('2k')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.getByRole('button', { name: 'Redo', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await page.getByRole('button', { name: 'Record reading', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('5 mA')
  await page.reload()
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await expect(page.getByRole('table')).toContainText('5 mA')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export project', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('labo-project.json')
  const saved = await readFile((await download.path())!, 'utf-8')
  expect(JSON.parse(saved).observations).toHaveLength(1)
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('blank')
  await page.getByLabel('Import labo project file').setInputFiles({
    name: 'restored.json',
    mimeType: 'application/json',
    buffer: Buffer.from(saved),
  })
  await expect(page.getByTestId('reading-a1')).toHaveText('5 mA')
  await expect(page.getByRole('table')).toContainText('5 mA')
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('keyboard wiring from a blank bench creates the expected series circuit', async ({ page }) => {
  await page.goto('/')
  page.on('dialog', (dialog) => dialog.accept())
  await page.getByRole('combobox', { name: 'Load an experiment' }).selectOption('blank')
  for (const name of ['Voltage source', 'Resistor', 'Ammeter', 'Voltmeter', 'Reference']) {
    await page.getByRole('button', { name: `Add ${name}`, exact: true }).click()
  }
  async function wire(a: string, b: string) {
    await page.getByRole('button', { name: a, exact: true }).focus()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: b, exact: true }).focus()
    await page.keyboard.press('Enter')
  }
  await wire('Source1 positive terminal', 'R1 positive terminal')
  await wire('R1 negative terminal', 'A1 positive terminal')
  await wire('A1 negative terminal', 'Source1 negative terminal')
  await wire('Source1 negative terminal', 'Reference1 positive terminal')
  await wire('R1 positive terminal', 'V1 positive terminal')
  await wire('R1 negative terminal', 'V1 negative terminal')
  await expect(
    page.getByRole('region', { name: 'A1 Ammeter', exact: true }).locator('.module-value'),
  ).toHaveText('10 mA')
  await expect(
    page.getByRole('region', { name: 'V1 Voltmeter', exact: true }).locator('.module-value'),
  ).toHaveText('10 V')
  await expect(page.getByRole('button', { name: 'Record reading' })).toBeEnabled()
  await page.getByRole('button', { name: 'R1 positive terminal', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'R1 positive terminal', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('invalid imports preserve work, disconnected probes do not display zero, layout stays within a phone', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Import labo project file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  })
  await expect(page.getByRole('alert')).toContainText('Your current work is unchanged')
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.getByRole('button', { name: 'Select or move V1', exact: true }).click()
  await page.getByRole('button', { name: 'Remove wire R1 + to V1 +', exact: true }).click()
  await expect(page.getByTestId('reading-v1')).toHaveText('— V')
  await expect(page.getByRole('button', { name: 'Record reading' })).toBeEnabled()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await expect(page.getByRole('button', { name: 'Record reading' })).toBeVisible()
})

test('module dragging and keyboard movement preserve connections; deletion and undo are atomic', async ({
  page,
}) => {
  await page.goto('/')
  const handle = page.getByRole('button', { name: 'Select or move R1', exact: true })
  const before = await handle.boundingBox()
  if (!before) throw new Error('Missing module')
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + before.width / 2 + 35, before.y + before.height / 2 + 25, {
    steps: 5,
  })
  await page.mouse.up()
  const after = await handle.boundingBox()
  expect(after!.x).toBeGreaterThan(before.x + 20)
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await handle.focus()
  await page.keyboard.press('ArrowRight')
  await page.getByRole('button', { name: 'Remove module', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('0 A')
  await expect(page.getByTestId('reading-v1')).toHaveText('— V')
  await expect(page.getByRole('button', { name: 'Select or move R1', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
})
