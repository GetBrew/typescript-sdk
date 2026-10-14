'use client'
import { useClerk } from '@clerk/nextjs'
import type { DemoTarget } from '../lib/config'
import { CanvasDemo } from './canvas-demo'

export function AuthenticatedDemo(
  props: Readonly<{
    targets: ReadonlyArray<DemoTarget>
    embedOrigin: string
    canEdit: boolean
  }>
) {
  const { signOut } = useClerk()
  return (
    <CanvasDemo {...props} onSignOut={() => signOut({ redirectUrl: '/' })} />
  )
}
