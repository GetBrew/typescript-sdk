import { connection } from 'next/server'
import { Suspense } from 'react'
import { CanvasDemo } from '../components/canvas-demo'
import { checkConfiguration } from '../lib/config'

async function Content() {
  await connection()
  const { config, problems } = checkConfiguration(process.env)
  if (!config) {
    return (
      <main className="welcome">
        <p className="eyebrow">Brew SDK example</p>
        <h1>Your email workspace, inside your app.</h1>
        <p>
          Create a client ID in Brew Settings → API → Client apps. Add this
          app’s exact origin, then copy .env.example to .env.local and run pnpm
          run doctor.
        </p>
        <ul role="alert">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
        <a href="https://github.com/GetBrew/typescript-sdk">Explore the SDK</a>
      </main>
    )
  }
  return <CanvasDemo {...config} />
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
