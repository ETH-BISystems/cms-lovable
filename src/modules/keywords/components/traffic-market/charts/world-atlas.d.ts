/**
 * Ambient module declaration for the `world-atlas` TopoJSON file.
 *
 * The repo's tsconfig does not enable `resolveJsonModule`, so the JSON import
 * is typed here instead (Vite resolves and parses the JSON at build time).
 * `react-simple-maps` accepts the topology as `Record<string, unknown>`.
 */
declare module 'world-atlas/countries-110m.json' {
  const topology: Record<string, unknown>;
  export default topology;
}
