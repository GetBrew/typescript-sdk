import { SignIn, SignOutButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { Suspense } from 'react'
import { AuthenticatedDemo } from '../components/authenticated-demo'
import { missingConfiguration, readConfig } from '../lib/config'

export const dynamic = 'force-dynamic'

async function Content() {
  const missing = missingConfiguration(process.env)
  if (missing.length) {
    return (
      <main className="welcome">
        <p className="eyebrow">Brew SDK example</p>
        <h1>Your email workspace, inside your app.</h1>
        <p>
          Copy .env.example to .env.local and run pnpm doctor to finish setup.
        </p>
        <p>Still needed: {missing.join(', ')}.</p>
        <a href="https://github.com/GetBrew/typescript-sdk">Explore the SDK</a>
      </main>
    )
  }
  const { userId } = await auth()
  if (!userId) {
    return (
      <main className="welcome">
        <p className="eyebrow">Brew SDK example</p>
        <h1>Sign in to your email workspace.</h1>
        <p>
          Review a campaign together, edit its emails, and see new content
          appear live.
        </p>
        <SignIn routing="hash" fallbackRedirectUrl="/" />
      </main>
    )
  }
  const config = readConfig(process.env)
  if (!config.allowedUserIds.includes(userId)) {
    return (
      <main className="welcome">
        <h1>You're signed in.</h1>
        <p>
          Your account does not have access to this workspace yet. Ask the app
          owner for access, or sign in with a different account.
        </p>
        <SignOutButton>
          <button type="button">Use a different account</button>
        </SignOutButton>
      </main>
    )
  }
  return (
    <AuthenticatedDemo
      targets={config.targets}
      embedOrigin={config.embedOrigin}
      canEdit={config.canEdit}
    />
  )
}
export default function Page() {
  return (
    <Suspense
      fallback={<main className="welcome">Loading your workspace…</main>}
    >
      <Content />
    </Suspense>
  )
}
