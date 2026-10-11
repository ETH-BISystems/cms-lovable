// Typed frontend config placeholder. Populate from `import.meta.env` when a
// real backend is wired in. Kept here so config lookups do not spread through
// the codebase.

export const config = {
  /** Base URL for the future REST/GraphQL API. Empty while mocks are in use. */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  /** Enables verbose service-layer logging in the console. */
  debugServices: import.meta.env.VITE_DEBUG_SERVICES === 'true',
  /** True when the app should render the "mocked backend" UI badge. */
  showMockBadge: import.meta.env.VITE_SHOW_MOCK_BADGE !== 'false',
} as const;

export type AppConfig = typeof config;
