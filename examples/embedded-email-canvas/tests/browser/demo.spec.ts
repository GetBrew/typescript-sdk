import { expect, test } from '@playwright/test'

test('real iframe manual edits persist through save, revoke, and reopen', async ({
  page,
}) => {
  test.skip(
    !process.env.DEMO_E2E_BREW_ORIGIN,
    'Requires the isolated real Brew backend.'
  )
  await page.goto('/')
  await page.getByRole('button', { name: /Single email/ }).click()
  await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
  const frame = page.frameLocator('iframe')
  await frame.locator('[data-embed-email="email_validation"]').click()
  const editor = frame.locator('.tiptap[contenteditable="true"]').first()
  await expect(editor).toBeVisible()
  await expect(
    frame.getByRole('dialog', { name: 'Email properties' })
  ).toBeVisible()
  await editor.click()
  const text = `Saved from the SDK demo ${Date.now()}`
  await editor.pressSequentially(text)
  await page.getByRole('button', { name: 'Save now' }).click()
  await expect(page.getByRole('status')).toContainText('Saved at')
  await page.screenshot({
    path: '.artifacts/demo-real-canvas.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await page.getByRole('button', { name: /Single email/ }).click()
  await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
  await expect(
    page.frameLocator('iframe').locator('[data-embed-email="email_validation"]')
  ).toContainText(text)
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
})
test('group and single email open with the real SDK, then save and revoke on exit', async ({
  page,
}) => {
  const errors: Array<string> = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  for (const label of ['Campaign group', 'Single email']) {
    // biome-ignore lint/performance/noAwaitInLoops: each target must close before the next opens
    await page.getByRole('button', { name: new RegExp(label) }).click()
    await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
    await page.getByRole('button', { name: 'Fit canvas' }).click()
    const closed = page.waitForResponse(
      (response) =>
        response.url().includes('/api/embed/canvas/clients/') &&
        response.url().endsWith('/sessions') &&
        response.request().method() === 'DELETE' &&
        response.status() === 204
    )
    await page.getByRole('button', { name: 'Back to workspaces' }).click()
    await closed
    await expect(
      page.getByRole('button', { name: /Campaign group/ })
    ).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
test('renewal preserves the iframe and dirty state; a failed flush keeps edits visible', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.DEMO_E2E_BREW_ORIGIN),
    'Protocol-only failure injection; real saves are covered by the Brew loopback suite.'
  )
  await page.goto('/')
  await page.getByRole('button', { name: /Campaign group/ }).click()
  await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
  const src = await page.locator('iframe').getAttribute('src')
  const frame = page.frameLocator('iframe')
  await frame.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Unsaved changes')
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes('/api/embed/canvas/clients/') &&
      response.url().endsWith('/sessions') &&
      response.request().method() === 'POST' &&
      Boolean(response.request().postDataJSON().sessionId)
  )
  await frame.getByRole('button', { name: 'Renew' }).click()
  await refreshed
  expect(await page.locator('iframe').getAttribute('src')).toBe(src)
  await expect(page.getByRole('status')).toContainText('Unsaved changes')
  await frame.getByRole('button', { name: 'Conflict' }).click()
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await expect(page.getByRole('alert')).toContainText('Save conflict')
  await expect(page.locator('iframe')).toHaveCount(1)
})

test('denied client access shows a useful error and can return to workspaces', async ({
  page,
}) => {
  await page.route('**/api/embed/canvas/clients/*/sessions', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 403,
      headers: { 'Access-Control-Allow-Origin': route.request().headers().origin ?? 'http://localhost:3501' },
      body: JSON.stringify({ error: 'Denied' }),
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Campaign group/ }).click()
  await expect(page.getByRole('alert')).toContainText('allowed origins')
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await expect(
    page.getByRole('button', { name: /Campaign group/ })
  ).toBeVisible()
})
