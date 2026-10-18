import { expect, test } from '@playwright/test'

test('workspace has no promotional/coaching blocks or rounded instrument cards', async ({
  page,
}) => {
  await page.goto('/')
  for (const copy of [
    'Built for the curious',
    'Original educational models',
    'A question to start with',
    'If resistance doubles',
    'Make a prediction',
    'Your first reading belongs here',
    'Your next experiment starts here',
    'Follow the circuit',
    'A small lab. Real calculations',
  ])
    await expect(page.locator('body')).not.toContainText(copy)
  const style = await page
    .locator('.bench-module')
    .first()
    .evaluate((node) => {
      const s = getComputedStyle(node)
      return { radius: s.borderRadius, shadow: s.boxShadow }
    })
  expect(style).toEqual({ radius: '0px', shadow: 'none' })
  await expect(page.getByRole('region', { name: 'Recorded data' })).toHaveCount(0)
  await page.locator('summary').getByText('Help', { exact: true }).click()
  await page.getByRole('button', { name: 'Controls and model information' }).click()
  await expect(page.getByRole('region', { name: 'Help and limitations' })).toContainText(
    'Not for physical wiring',
  )
})

test('panel commands, sorting, keyboard menu entry and data docking work', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Equipment list', exact: true }).click()
  await expect(page.getByRole('complementary', { name: 'Module library' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Equipment list', exact: true }).click()
  await page.getByRole('combobox', { name: 'Sort by' }).selectOption('name')
  await expect(page.locator('.library-item').first()).toHaveAccessibleName('Add Ammeter')
  const view = page.locator('summary').getByText('View', { exact: true })
  await view.focus()
  await page.keyboard.press('ArrowDown')
  await expect(
    page
      .getByRole('group', { name: 'View commands' })
      .getByRole('button', { name: 'Equipment list' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(view).toBeFocused()
  await page.getByRole('button', { name: 'Data table', exact: true }).click()
  await expect(page.getByRole('table')).toContainText('No recorded data.')
  await page.getByRole('button', { name: 'Close data table' }).click()
  await expect(page.getByRole('table')).toHaveCount(0)
  await view.click()
  await page.getByRole('button', { name: 'Grid', exact: true }).click()
  await expect(page.locator('.bench-world')).toHaveClass(/show-grid/)
})

test('a lead can be selected by pointer, recolored, deleted, and restored; bulk deletion is undoable', async ({
  page,
}) => {
  await page.goto('/')
  const wire = page.getByRole('button', { name: 'Select wire Source + to R1 +', exact: true })
  const point = await wire.evaluate((element) => {
    const path = element as SVGPathElement
    const p = path.getPointAtLength(path.getTotalLength() / 2)
    const transformed = new DOMPoint(p.x, p.y).matrixTransform(path.getScreenCTM()!)
    return { x: transformed.x, y: transformed.y }
  })
  await page.mouse.click(point.x, point.y)
  await expect(wire).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('combobox', { name: 'Selected wire color' }).selectOption('#345c94')
  await expect(page.getByRole('complementary', { name: 'Module inspector' })).toContainText(
    '#345c94',
  )
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  // Move focus away from the select: Delete should edit the lead, not the input.
  await wire.focus()
  await page.keyboard.press('Delete')
  await expect(wire).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(wire).toHaveCount(1)
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
  await page.locator('summary').getByText('Edit', { exact: true }).click()
  await page.getByRole('button', { name: 'Remove all wires', exact: true }).click()
  await expect(page.locator('.wire-hit')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Record reading', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.wire-hit')).toHaveCount(6)
  await expect(page.getByTestId('reading-a1')).toHaveText('10 mA')
})
