import 'server-only'
import { createBrewClient } from '@brew.new/sdk'
import { auth, currentUser } from '@clerk/nextjs/server'
import { readConfig } from './config'
import { handleSession } from './session-handler'

export async function sessionRoute(request: Request): Promise<Response> {
  try {
    const config = readConfig(process.env)
    const brew = createBrewClient({
      apiKey: config.apiKey,
      brandId: config.brandId,
      baseUrl: `${config.embedOrigin}/api`,
      timeoutMs: 20_000,
      maxRetries: 0,
    })
    return await handleSession(request, {
      config,
      sessions: brew.canvas.sessions,
      authenticate: async () => {
        const { userId, sessionId } = await auth()
        if (!userId || !sessionId) {
          return null
        }
        const user = await currentUser()
        return {
          userId,
          loginSessionId: sessionId,
          name: user?.fullName || user?.username || 'Collaborator',
        }
      },
    })
  } catch {
    return Response.json(
      { error: 'Demo setup is incomplete. Run pnpm doctor.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
