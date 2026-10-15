import type { ReactNode } from 'react'
import './styles.css'
export const metadata = {
  title: 'Brew embedded canvas demo',
  description:
    'An email workspace inside your app, authenticated with a client ID.',
}
export default function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
