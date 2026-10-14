import { ClerkProvider } from '@clerk/nextjs'
import type { ReactNode } from 'react'
import './styles.css'

export const metadata = {
  title: 'Brew embedded canvas demo',
  description: 'An authenticated email workspace inside your app.',
}
export default function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const hasClerk = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY
  )
  const content = hasClerk ? (
    <ClerkProvider>{children}</ClerkProvider>
  ) : (
    children
  )
  return (
    <html lang="en">
      <body>{content}</body>
    </html>
  )
}
