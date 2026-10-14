import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'demo-user', value: 'alice', url: 'http://localhost:3501' },
  ])
})
test('a failed revoke keeps the canvas usable and permits renewal before retrying exit', async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.DEMO_E2E_BREW_ORIGIN),
    'Protocol failure injection.'
  )
  await page.goto('/')
  await page.getByRole('button', { name: /Campaign group/ }).click()
  await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
  const currentSession = new URL(
    (await page.locator('iframe').getAttribute('src')) ?? ''
  ).pathname
    .split('/')
    .pop()
  let hasFailedRevoke = false
  await page.route('**/api/canvas-session', async (route) => {
    if (
      route.request().method() === 'DELETE' &&
      route.request().postDataJSON().sessionId === currentSession &&
      !hasFailedRevoke
    ) {
      hasFailedRevoke = true
      await route.fulfill({ status: 503 })
    } else {
      await route.continue()
    }
  })
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await expect(page.getByRole('alert')).toContainText('Could not close')
  const renewed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().endsWith('/api/canvas-session') &&
      Boolean(response.request().postDataJSON().sessionId)
  )
  await page
    .frameLocator('iframe')
    .getByRole('button', { name: 'Renew' })
    .click()
  expect((await renewed).status()).toBe(200)
  await expect(page.getByRole('button', { name: 'Save now' })).toBeEnabled()
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await expect(
    page.getByRole('button', { name: /Campaign group/ })
  ).toBeVisible()
})
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
        response.url().endsWith('/api/canvas-session') &&
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
test('anonymous callers fail closed and can leave the failed connection', async ({
  page,
  context,
}) => {
  await context.clearCookies()
  await page.goto('/')
  await page.getByRole('button', { name: /Campaign group/ }).click()
  await expect(page.getByRole('alert')).toContainText('Sign in')
  await page.getByRole('button', { name: 'Back to workspaces' }).click()
  await expect(
    page.getByRole('button', { name: /Campaign group/ })
  ).toBeVisible()
})
test('another signed-in user cannot refresh or revoke an owned session', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const owned = await page.evaluate(async () => {
    const response = await fetch('/api/canvas-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: { type: 'group', groupId: 'grp_validation' },
      }),
    })
    return response.json() as Promise<{
      sessionId: string
      ownershipToken: string
    }>
  })
  await context.addCookies([
    { name: 'demo-user', value: 'bob', url: 'http://localhost:3501' },
  ])
  const statuses = await page.evaluate(
    async (grant) =>
      Promise.all(
        ['POST', 'DELETE'].map(async (method) => {
          const response = await fetch('/api/canvas-session', {
            method,
            headers: {
              'Content-Type': 'application/json',
              'X-Canvas-Owner': grant.ownershipToken,
            },
            body: JSON.stringify({
              target: { type: 'group', groupId: 'grp_validation' },
              sessionId: grant.sessionId,
            }),
          })
          return response.status
        })
      ),
    owned
  )
  expect(statuses).toEqual([403, 403])
  await context.addCookies([
    { name: 'demo-user', value: 'alice', url: 'http://localhost:3501' },
  ])
  await page.evaluate(async (grant) => {
    await fetch('/api/canvas-session', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Canvas-Owner': grant.ownershipToken,
      },
      body: JSON.stringify({
        target: { type: 'group', groupId: 'grp_validation' },
        sessionId: grant.sessionId,
      }),
    })
  }, owned)
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
      response.url().endsWith('/api/canvas-session') &&
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
