import { randomUUID } from 'node:crypto'
import type { CanvasSession } from '@brew.new/sdk/embed'
import { createServer } from 'vite'
import { readConfig } from '../lib/config.ts'

const realOrigin = process.env.DEMO_E2E_BREW_ORIGIN
if (
  realOrigin &&
  !['localhost', '127.0.0.1'].includes(new URL(realOrigin).hostname)
) {
  throw new Error('Real backend browser tests require synthetic loopback data.')
}
const config = readConfig({
  NEXT_PUBLIC_BREW_CLIENT_ID:
    process.env.DEMO_E2E_CLIENT_ID ??
    'brew_client_0123456789abcdef0123456789abcdef',
  BREW_EMBED_ORIGIN: realOrigin ?? 'http://127.0.0.1:3501',
  BREW_GROUP_ID: 'grp_validation',
  BREW_EMAIL_ID: 'email_validation',
  BREW_BRAND_ID: realOrigin
    ? process.env.DEMO_E2E_BRAND_ID
    : 'brand_validation',
})
const grants = new Map<string, { grant: CanvasSession; owner: string }>()
const endpoint = `/api/embed/canvas/clients/${config.clientId}/sessions`
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
        '<!doctype html><html><head><title>Client ID demo fixture</title></head><body><div id="root"></div><script type="module" src="/tests/browser-entry.tsx"></script></body></html>'
      )
    )
  } else if (path === '/fixture-config') {
    response.setHeader('Content-Type', 'application/json')
    response.end(JSON.stringify(config))
  } else if (path === endpoint) {
    if (request.headers.origin !== 'http://localhost:3501') {
      response.writeHead(403)
      response.end()
      return
    }
    response.setHeader('Access-Control-Allow-Origin', 'http://localhost:3501')
    response.setHeader('Access-Control-Allow-Methods', 'POST, DELETE')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Cache-Control', 'no-store')
    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }
    try {
      const chunks: Array<Buffer> = []
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk))
      }
      const body = JSON.parse(Buffer.concat(chunks).toString()) as {
        sessionId?: string
        brandId?: string
        clientSessionToken: string
        target?: CanvasSession['target']
      }
      if (body.sessionId) {
        const owned = grants.get(body.sessionId)
        if (!owned || owned.owner !== body.clientSessionToken) {
          response.writeHead(403)
          response.end()
          return
        }
        if (request.method === 'DELETE') {
          grants.delete(body.sessionId)
          response.writeHead(204)
          response.end()
          return
        }
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(owned.grant))
        return
      }
      if (
        body.brandId !== config.brandId ||
        !body.target ||
        !/^[0-9a-f]{64}$/.test(body.clientSessionToken)
      ) {
        response.writeHead(400)
        response.end()
        return
      }
      const sessionId = randomUUID()
      const grant = {
        sessionId,
        target: body.target,
        bootstrapToken: 'fixture-only',
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        embedUrl: `${config.embedOrigin}/embed/canvas/${sessionId}`,
      }
      grants.set(sessionId, { grant, owner: body.clientSessionToken })
      response.setHeader('Content-Type', 'application/json')
      response.end(JSON.stringify(grant))
    } catch {
      response.writeHead(400)
      response.end()
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
