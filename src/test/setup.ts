import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement matchMedia — polyfill it so hooks reading
// prefers-reduced-motion/prefers-color-scheme etc. don't crash in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
