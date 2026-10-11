import { useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { SankeyGraph, SankeyLink, SankeyNode } from 'd3-sankey';
import { formatDeltaPct, formatShare } from '../shared/trafficFormat';

/** One ranked source or destination flowing through the central domain node. */
export interface SankeyFlowNodeDatum {
  name: string;
  /** Share of the central domain's traffic, 0–1 — encodes band thickness. */
  share: number;
  /** Period-over-period delta (percentage points); omit/null hides the delta. */
  deltaPct?: number | null;
}

export interface SankeyFlowProps {
  /** Central domain node label. */
  center: string;
  /** Ranked traffic sources (left column). */
  sources: SankeyFlowNodeDatum[];
  /** Outgoing destinations (right column). Omit for the sources-only layout. */
  destinations?: SankeyFlowNodeDatum[];
  /** Logical drawing height in px, default 380. */
  height?: number;
  /** Max rows per side before the tail is folded into "Other", default 8. */
  maxPerSide?: number;
}

interface FlowNodeExtra {
  name: string;
  share: number | null;
  deltaPct: number | null;
  kind: 'source' | 'center' | 'destination';
}

interface FlowLinkExtra {
  sourceName: string;
  targetName: string;
  share: number;
}

type FlowNode = SankeyNode<FlowNodeExtra, FlowLinkExtra>;
type FlowLink = SankeyLink<FlowNodeExtra, FlowLinkExtra>;

const LOGICAL_WIDTH = 900;
/** Horizontal room reserved for the source/destination labels. */
const LABEL_GUTTER = 218;
const ACCENT = 'hsl(var(--accent))';

/** Sort by share desc and fold everything past `max` into a single "Other" row. */
function foldTail(items: SankeyFlowNodeDatum[], max: number): SankeyFlowNodeDatum[] {
  const sorted = [...items].sort((a, b) => b.share - a.share);
  if (sorted.length <= max) return sorted;
  const otherShare = sorted.slice(max).reduce((sum, d) => sum + d.share, 0);
  return [...sorted.slice(0, max), { name: 'Other', share: otherShare, deltaPct: null }];
}

function truncate(name: string, max = 26): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

/** Label beside a source/destination node: name, share %, colored delta. */
function NodeLabel({ node, anchor }: { node: FlowNode; anchor: 'start' | 'end' }) {
  const x = anchor === 'end' ? (node.x0 ?? 0) - 10 : (node.x1 ?? 0) + 10;
  const y = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;
  const delta = node.deltaPct;
  return (
    <text x={x} y={y} textAnchor={anchor} dominantBaseline="central" fontSize={12}>
      <tspan fill="hsl(var(--foreground))" fontWeight={500}>
        {truncate(node.name)}
      </tspan>
      {node.share !== null && (
        <tspan dx={8} fill="hsl(var(--muted-foreground))" className="tabular-nums">
          {formatShare(node.share)}
        </tspan>
      )}
      {delta !== null && delta !== undefined && delta !== 0 && (
        <tspan
          dx={6}
          fontSize={10.5}
          fontWeight={600}
          fill={delta > 0 ? '#16a34a' : '#dc2626'}
          className="tabular-nums"
        >
          {formatDeltaPct(delta)}
        </tspan>
      )}
    </text>
  );
}

/**
 * Source → domain → destination traffic-flow diagram (Semrush "Traffic Journey"
 * parity). Layout is computed by `d3-sankey`; rendering is plain React SVG with
 * a responsive viewBox. Band thickness encodes share; bands render as a
 * low-opacity accent wash that deepens on hover with a tooltip. Pass no
 * `destinations` for the sources-only mode used by the per-channel "Top
 * Sources" panels. Loading/empty states are handled by callers.
 */
export function SankeyFlow({ center, sources, destinations, height = 380, maxPerSide = 8 }: SankeyFlowProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; label: string; index: number } | null>(null);

  const graph = useMemo<SankeyGraph<FlowNodeExtra, FlowLinkExtra> | null>(() => {
    const src = foldTail(sources, maxPerSide);
    const dst = destinations ? foldTail(destinations, maxPerSide) : [];
    if (src.length === 0 && dst.length === 0) return null;

    const nodes: FlowNodeExtra[] = [
      ...src.map(d => ({ name: d.name, share: d.share, deltaPct: d.deltaPct ?? null, kind: 'source' as const })),
      { name: center, share: null, deltaPct: null, kind: 'center' as const },
      ...dst.map(d => ({ name: d.name, share: d.share, deltaPct: d.deltaPct ?? null, kind: 'destination' as const })),
    ];
    const centerIndex = src.length;
    const links: FlowLink[] = [
      ...src.map((d, i) => ({
        source: i,
        target: centerIndex,
        value: Math.max(d.share, 1e-4),
        sourceName: d.name,
        targetName: center,
        share: d.share,
      })),
      ...dst.map((d, i) => ({
        source: centerIndex,
        target: centerIndex + 1 + i,
        value: Math.max(d.share, 1e-4),
        sourceName: center,
        targetName: d.name,
        share: d.share,
      })),
    ];

    const layout = sankey<FlowNodeExtra, FlowLinkExtra>()
      .nodeWidth(10)
      .nodePadding(14)
      .extent([
        [LABEL_GUTTER, 30],
        [LOGICAL_WIDTH - (dst.length > 0 ? LABEL_GUTTER : 48), height - 12],
      ]);
    return layout({ nodes, links });
  }, [center, sources, destinations, height, maxPerSide]);

  const linkPath = useMemo(() => sankeyLinkHorizontal<FlowNodeExtra, FlowLinkExtra>(), []);

  if (!graph) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No flow data.
      </div>
    );
  }

  const handleLinkMove = (event: ReactMouseEvent<SVGPathElement>, label: string, index: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12, label, index });
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        viewBox={`0 0 ${LOGICAL_WIDTH} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Traffic flow through ${center}`}
      >
        {/* Flow bands */}
        {graph.links.map((link, i) => {
          const d = linkPath(link);
          if (!d) return null;
          const label = `${link.sourceName} → ${link.targetName} · ${formatShare(link.share)}`;
          return (
            <path
              key={`link-${i}`}
              d={d}
              fill="none"
              stroke={ACCENT}
              strokeOpacity={hover?.index === i ? 0.5 : 0.22}
              strokeWidth={Math.max(1, link.width ?? 1)}
              className="transition-[stroke-opacity] duration-150"
              onMouseMove={e => handleLinkMove(e, label, i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}

        {/* Nodes */}
        {graph.nodes.map((node, i) => (
          <rect
            key={`node-${i}`}
            x={node.x0 ?? 0}
            y={node.y0 ?? 0}
            width={(node.x1 ?? 0) - (node.x0 ?? 0)}
            height={Math.max(1, (node.y1 ?? 0) - (node.y0 ?? 0))}
            rx={2}
            fill={ACCENT}
            fillOpacity={node.kind === 'center' ? 0.95 : 0.6}
          />
        ))}

        {/* Labels */}
        {graph.nodes.map((node, i) => {
          if (node.kind === 'center') {
            const cx = ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2;
            return (
              <text
                key={`label-${i}`}
                x={Math.min(LOGICAL_WIDTH - 70, Math.max(70, cx))}
                y={Math.max(18, (node.y0 ?? 0) - 12)}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                fill="hsl(var(--foreground))"
              >
                {truncate(node.name, 32)}
              </text>
            );
          }
          return <NodeLabel key={`label-${i}`} node={node} anchor={node.kind === 'source' ? 'end' : 'start'} />;
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x, top: hover.y }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
