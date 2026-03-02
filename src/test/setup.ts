import '@testing-library/jest-dom/vitest'
import { Component } from 'react'

// Mirror the runtime componentProps getter from main.tsx so class components work in tests
if (!Object.getOwnPropertyDescriptor(Component.prototype, 'componentProps')) {
  Object.defineProperty(Component.prototype, 'componentProps', {
    get() { return this.props },
    configurable: true,
  })
}

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = () => {}

// jsdom doesn't implement ResizeObserver (needed by radix-ui)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown
}
