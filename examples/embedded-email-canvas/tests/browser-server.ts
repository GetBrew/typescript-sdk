import { randomUUID } from 'node:crypto'
import { createBrewClient } from '@brew.new/sdk'
import type { CanvasSession } from '@brew.new/sdk/embed'
import { createServer } from 'vite'
import { readConfig } from '../lib/config.ts'
import { handleSession } from '../lib/session-handler.ts'

// A test-only identity adapter. The production Next adapter always uses Clerk.
const realOrigin = process.env.DEMO_E2E_BREW_ORIGIN
if (
  realOrigin &&
  !['localhost', '127.0.0.1'].includes(new URL(realOrigin).hostname)
) {
  throw new Error('Real backend browser tests require synthetic loopback data.')
}
const config = readConfig({
  APP_ORIGIN: 'http://localhost:3501',
  BREW_EMBED_ORIGIN: realOrigin ?? 'http://127.0.0.1:3501',
  CLERK_SECRET_KEY: 'test-only',
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test-only',
  DEMO_ALLOWED_USER_IDS: 'alice,bob',
  CANVAS_SESSION_SECRET: 'test-only-'.repeat(8),
  BREW_API_KEY: 'brew_embed_validation_00000000000000000000000000000000',
  BREW_BRAND_ID: process.env.DEMO_E2E_BRAND_ID ?? 'brand-fixture',
  BREW_GROUP_ID: 'grp_validation',
  BREW_EMAIL_ID: 'email_validation',
})
const grants = new Map<string, CanvasSession>()
const stub = {
  create: async (
    input: Parameters<
      ReturnType<typeof createBrewClient>['canvas']['sessions']['create']
    >[0]
  ) => {
    const sessionId = randomUUID()
    const grant = {
      sessionId,
      target: input.target,
      bootstrapToken: 'fixture-only',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      embedUrl: `${config.embedOrigin}/embed/canvas/${sessionId}`,
    }
    grants.set(sessionId, grant)
    return grant
  },
  refresh: async (id: string) => {
    const grant = grants.get(id)
    if (!grant) {
      throw new Error('Revoked')
    }
    return grant
  },
  revoke: async (id: string) => {
    grants.delete(id)
  },
}
const sessions = realOrigin
  ? createBrewClient({
      apiKey: config.apiKey,
      brandId: config.brandId,
      baseUrl: `${realOrigin}/api`,
    }).canvas.sessions
  : stub
const server = await createServer({
  server: { host: '0.0.0.0', port: 3501, strictPort: true },
  appType: 'custom',
})
server.middlewares.use(async (request, response, next) => {
  const path = request.url?.split('?')[0]
  if (path === '/') {
    response.setHeader('Content-Type', 'text/html')
    response.end(
      await server.transformIndexHtml(
        '/',
        '<!doctype html><html><head><title>Hermetic demo fixture</title></head><body><div id="root"></div><script type="module" src="/tests/browser-entry.tsx"></script></body></html>'
      )
    )
  } else if (path === '/fixture-config') {
    response.setHeader('Content-Type', 'application/json')
    response.end(
      JSON.stringify({
        targets: config.targets,
        embedOrigin: config.embedOrigin,
        canEdit: config.canEdit,
      })
    )
  } else if (path === '/api/canvas-session') {
    try {
      const chunks: Array<Buffer> = []
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk))
      }
      const user = /(?:^|;\s*)demo-user=(alice|bob)/.exec(
        request.headers.cookie ?? ''
      )?.[1]
      const result = await handleSession(
        new Request(`${config.appOrigin}${path}`, {
          method: request.method,
          headers: new Headers(
            Object.entries(request.headers).flatMap(([key, value]) =>
              typeof value === 'string' ? [[key, value]] : []
            )
          ),
          body: Buffer.concat(chunks).toString(),
        }),
        {
          config,
          sessions,
          authenticate: async () =>
            user
              ? { userId: user, loginSessionId: `fixture-${user}`, name: user }
              : null,
        }
      )
      response.writeHead(result.status, Object.fromEntries(result.headers))
      response.end(await result.text())
    } catch {
      response.writeHead(500)
      response.end('Fixture failed')
    }
  } else if (path?.startsWith('/embed/canvas/')) {
    response.setHeader('Content-Type', 'text/html')
    response.end(`<!doctype html><html><body><p>Protocol fixture</p><button id="edit">Edit</button><button id="renew">Renew</button><button id="conflict">Conflict</button><script>
      let instanceId = new URL(location.href).searchParams.get('instanceId'); let dirty = false; let conflict = false;
      const send = (message) => parent.postMessage({protocol:'brew.canvas.v1',instanceId,...message},'http://localhost:3501');
      addEventListener('message', (event) => {
        if(event.origin !== 'http://localhost:3501' || event.source !== parent) return;
        instanceId = event.data.instanceId;
        if(event.data.type === 'authenticate') send({type:'ready'});
        if(event.data.type === 'command') {
          if(event.data.command.type === 'flush' && conflict) { send({type:'result',requestId:event.data.requestId,error:'Save conflict'}); return; }
          if(event.data.command.type === 'flush') { dirty = false; send({type:'dirty',hasUnsavedEdits:false}); send({type:'saved',saved:{emailId:'email_validation',emailVersionId:null,updatedAt:new Date().toISOString()}}); }
          send({type:'result',requestId:event.data.requestId});
        }
      });
      document.getElementById('edit').onclick = () => { dirty = true; send({type:'dirty',hasUnsavedEdits:true}); };
      document.getElementById('renew').onclick = () => send({type:'renew'});
      document.getElementById('conflict').onclick = () => { conflict = true; dirty = true; send({type:'dirty',hasUnsavedEdits:true}); };
      send({type:'handshake'});
    </script></body></html>`)
  } else {
    next()
  }
})
await server.listen()
