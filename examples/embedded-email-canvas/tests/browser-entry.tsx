import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CanvasDemo } from '../components/canvas-demo'
import '../app/styles.css'
import type { DemoTarget } from '../lib/config'

const configuration: {
  targets: Array<DemoTarget>
  embedOrigin: string
  canEdit: boolean
} = await fetch('/fixture-config').then((response) => response.json())
const root = document.getElementById('root')
if (!root) {
  throw new Error('Missing fixture root.')
}
createRoot(root).render(
  <StrictMode>
    <CanvasDemo {...configuration} />
  </StrictMode>
)
