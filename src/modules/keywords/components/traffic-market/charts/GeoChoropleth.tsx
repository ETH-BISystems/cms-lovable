import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import worldTopology from 'world-atlas/countries-110m.json';
import { numericToAlpha2 } from './isoCountries';
import { formatShare } from '../shared/trafficFormat';

/** One country's traffic share. */
export interface GeoChoroplethDatum {
  /** ISO 3166-1 alpha-2, case-insensitive (e.g. 'us'). */
  countryCode: string;
  countryName: string;
  /** Share of traffic, 0–1 — encodes the fill intensity. */
  value: number;
}

export interface GeoChoroplethProps {
  data: GeoChoroplethDatum[];
  /** Map height in px, default 380. */
  height?: number;
}

/** Shape of the geography features `react-simple-maps` derives from world-atlas. */
interface GeoFeature {
  rsmKey: string;
  id?: string | number;
  properties?: { name?: string };
}

const LOW_RGB: [number, number, number] = [230, 244, 246]; // #E6F4F6
const HIGH_RGB: [number, number, number] = [0, 147, 167]; // #0093A7 ≈ hsl(var(--accent))
const NO_DATA_FILL = '#F1F5F7';
const NO_DATA_HOVER_FILL = '#E2E8F0';

/** Interpolate the light→accent ramp at t ∈ [0, 1]. */
function rampColor(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const channel = (i: number) => Math.round(LOW_RGB[i] + (HIGH_RGB[i] - LOW_RGB[i]) * clamped);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

/**
 * World choropleth of traffic share by country (Semrush "Geo Distribution"
 * parity). Countries shade light→accent by `value / maxValue`; countries
 * without data get a neutral fill. Features are matched primarily by ISO
 * numeric id → alpha-2 code, falling back to a case-insensitive name match.
 * Hover shows a tooltip with the country name and formatted share.
 */
export function GeoChoropleth({ data, height = 380 }: GeoChoroplethProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; name: string; value: string } | null>(null);

  const { byCode, byName, maxValue } = useMemo(() => {
    const codeMap = new Map<string, GeoChoroplethDatum>();
    const nameMap = new Map<string, GeoChoroplethDatum>();
    let max = 0;
    data.forEach(d => {
      codeMap.set(d.countryCode.toLowerCase(), d);
      nameMap.set(d.countryName.trim().toLowerCase(), d);
      if (d.value > max) max = d.value;
    });
    return { byCode: codeMap, byName: nameMap, maxValue: max };
  }, [data]);

  const matchDatum = (geo: GeoFeature): GeoChoroplethDatum | undefined => {
    const alpha2 = numericToAlpha2(geo.id);
    if (alpha2) {
      const byIso = byCode.get(alpha2);
      if (byIso) return byIso;
    }
    const name = geo.properties?.name?.trim().toLowerCase();
    return name ? byName.get(name) : undefined;
  };

  const handleMove = (
    event: ReactMouseEvent<SVGPathElement>,
    geo: GeoFeature,
    datum: GeoChoroplethDatum | undefined,
  ) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      x: event.clientX - rect.left + 12,
      y: event.clientY - rect.top + 12,
      name: datum?.countryName ?? geo.properties?.name ?? 'Unknown',
      value: datum ? formatShare(datum.value) : 'No data',
    });
  };

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden" style={{ height }}>
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 152, center: [10, 4] }}
        width={800}
        height={400}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={worldTopology}>
          {({ geographies }) =>
            geographies
              // Drop Antarctica — dead space on a traffic map.
              .filter((geo: GeoFeature) => numericToAlpha2(geo.id) !== 'aq')
              .map((geo: GeoFeature) => {
                const datum = matchDatum(geo);
                const fill = datum && maxValue > 0 ? rampColor(datum.value / maxValue) : NO_DATA_FILL;
                const hoverFill = datum ? 'hsl(var(--accent))' : NO_DATA_HOVER_FILL;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseMove={e => handleMove(e, geo, datum)}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      default: { fill, stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
                      hover: { fill: hoverFill, stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none', cursor: 'pointer' },
                      pressed: { fill: hoverFill, stroke: '#FFFFFF', strokeWidth: 0.5, outline: 'none' },
                    }}
                  />
                );
              })
          }
        </Geographies>
      </ComposableMap>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x, top: hover.y }}
        >
          <span className="font-medium">{hover.name}</span>
          <span className="ml-2 tabular-nums text-muted-foreground">{hover.value}</span>
        </div>
      )}
    </div>
  );
}
