import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom does not implement the temporary blob URLs the QR code image uses, so provide simple stand-ins.
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test-qr', configurable: true, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true, writable: true })
}

// jsdom does not implement scrolling. The route announcer scrolls to the top on navigation.
Object.defineProperty(window, 'scrollTo', { value: () => undefined, configurable: true, writable: true })

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})