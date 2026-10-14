import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const withClerk = clerkMiddleware({
  authorizedParties: process.env.APP_ORIGIN ? [process.env.APP_ORIGIN] : [],
})
export default function proxy(...args: Parameters<typeof withClerk>) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    return NextResponse.next()
  }
  return withClerk(...args)
}
export const config = { matcher: ['/', '/api/(.*)'] }
