import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Inspect the actual local tarball, not a workspace import or a published version.
const temporary = mkdtempSync(join(tmpdir(), 'brew-sdk-release-'))
try {
  const [packed] = JSON.parse(
    execFileSync(
      'npm',
      ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
  )
  execFileSync('tar', [
    '-xzf',
    join(temporary, packed.filename),
    '-C',
    temporary,
  ])
  const packageRoot = join(temporary, 'package')
  const manifest = JSON.parse(
    readFileSync(join(packageRoot, 'package.json'), 'utf8')
  )
  const require = createRequire(join(packageRoot, 'package.json'))
  const [esm, cjs] = await Promise.all([
    import(
      pathToFileURL(join(packageRoot, manifest.exports['.'].import.default))
        .href
    ),
    Promise.resolve(
      require(join(packageRoot, manifest.exports['.'].require.default))
    ),
  ])
  await Promise.all(
    [esm, cjs].map(async ({ createBrewClient }) => {
      const requests = []
      const response = {
        data: [],
        sources: [],
        pagination: { hasMore: false, cursor: null },
      }
      const client = createBrewClient({
        apiKey: 'brew_release_smoke_dummy',
        brandId: 'brand_release_smoke',
        baseUrl: 'https://smoke.invalid',
        fetch: (input, init) => {
          assert.equal(init.method, 'GET', 'release smoke must never mutate')
          assert.equal(
            new Headers(init.headers).get('x-brand-id'),
            'brand_release_smoke'
          )
          assert.match(
            new Headers(init.headers).get('user-agent'),
            new RegExp(manifest.version.replaceAll('.', '\\.'))
          )
          requests.push(new URL(String(input)))
          return Promise.resolve(
            new Response(JSON.stringify(response), {
              headers: { 'content-type': 'application/json' },
            })
          )
        },
      })
      assert.equal(
        typeof client.automations.triggers.ensureIntegrationEvent,
        'function'
      )
      assert.equal(typeof client.webhooks.verify, 'function')
      const results = await Promise.all([
        client.integrations.events.list({ provider: 'posthog', limit: 1 }),
        client.integrations.events.get('definition/one'),
        client.webhooks.list({ limit: 1 }),
        client.webhooks.get('webhook/one'),
        client.webhooks.events({ webhookId: 'webhook/one' }),
        client.webhooks.attempts({
          webhookId: 'webhook/one',
          eventId: 'event/one',
        }),
        client.analytics.automations({
          automationId: 'automation_release_smoke',
          outcomesVersionId: 'version/one',
          outcomesCursor: 'cursor+/=',
        }),
      ])
      for (const result of results) assert.deepEqual(result, response)
      assert.deepEqual(
        requests.map((url) => url.pathname).sort(),
        [
          '/v1/integrations/events',
          '/v1/integrations/events/definition%2Fone',
          '/v1/webhooks',
          '/v1/webhooks/webhook%2Fone',
          '/v1/webhooks/webhook%2Fone/events',
          '/v1/webhooks/webhook%2Fone/events/event%2Fone/attempts',
          '/v1/analytics/automations',
        ].sort()
      )
      assert.equal(requests[0].searchParams.get('provider'), 'posthog')
      const analytics = requests.find(
        (url) => url.pathname === '/v1/analytics/automations'
      )
      assert.equal(
        analytics.searchParams.get('outcomesVersionId'),
        'version/one'
      )
      assert.equal(analytics.searchParams.get('outcomesCursor'), 'cursor+/=')
    })
  )
  console.log(
    `Local packed SDK ${manifest.version}: ESM and CJS event, webhook and outcome reads passed with injected fetch; no network requests or mutations.`
  )
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
