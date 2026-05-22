import type { ReactElement } from "react";
// Architectural-style front + side elevations. Every structural member is
// drawn as a filled rectangle with its true thickness — top, aprons,
// floor stretchers, legs, lower shelf, vise chop, dog holes, casters,
// pegboard. Splayed legs render at the actual splay angle.

import type { BenchConfig } from "~/lib/types";
import { formatLength, type Unit } from "~/lib/units";
import { getLumber, getSheet } from "~/lib/materials";
import { deriveGeometry } from "~/lib/derive";
import { Card } from "~/components/ui/card";

type Props = {
  config: BenchConfig;
  unit: Unit;
};

const VIEW_W = 520;
const VIEW_H = 360;
const PAD_L = 56;
const PAD_R = 56;
const PAD_T = 40;
const PAD_B = 48;

// Wood palette (must read on light and dark theme cards)
const TOP_FILL = "#fde68a";
const TOP_EDGE = "#b45309";
const LEG_FILL = "#a16f4d";
const APRON_FILL = "#b88560";
const STRETCHER_FILL = "#8d6a4a";
const SHELF_FILL = "#d4b896";
const VISE_FILL = "#1c1917";
const CASTER_FILL = "#1c1917";
const PEGBOARD_FILL = "#e7e5e4";
const DIM = "#3f3f3f";

function fitScale(L: number, H: number) {
  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = VIEW_H - PAD_T - PAD_B;
  return Math.min(innerW / L, innerH / H);
}

// ----- Hatching pattern defs (used for plywood + lamination shading) -----
function Defs() {
  return (
    <defs>
      <pattern
        id="plyHatch"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <line x1="0" y1="0" x2="0" y2="6" stroke="#92400e" strokeWidth="0.6" />
      </pattern>
      <pattern
        id="lamLines"
        width="6"
        height="6"
        patternUnits="userSpaceOnUse"
      >
        <line x1="0" y1="0" x2="6" y2="0" stroke="#92400e" strokeWidth="0.5" />
      </pattern>
      <pattern
        id="endGrain"
        width="4"
        height="4"
        patternUnits="userSpaceOnUse"
      >
        <circle cx="2" cy="2" r="0.8" fill="#6d4527" opacity="0.6" />
      </pattern>
    </defs>
  );
}

// ======================================================================

export function ElevationViews({ config, unit }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FrontElevation config={config} unit={unit} />
      <SideElevation config={config} unit={unit} />
    </div>
  );
}

// ----------------------------------------------------------------------
// FRONT ELEVATION — viewer looks at the bench's long face.
// ----------------------------------------------------------------------

export function FrontElevation({ config, unit }: Props) {
  const g = deriveGeometry(config);
  const L = config.topLength;
  const H = config.totalHeight + (config.pegboard ? config.pegboardHeight : 0);
  const scale = fitScale(L, H);
  const baseX = PAD_L + ((VIEW_W - PAD_L - PAD_R) - L * scale) / 2;
  const baseY = PAD_T + ((VIEW_H - PAD_T - PAD_B) - H * scale);

  const px = (xIn: number) => baseX + xIn * scale;
  const py = (zIn: number) => baseY + (H - zIn) * scale;

  const leg = getLumber(config.legMaterialId);
  const apron = getLumber(config.apronMaterialId);
  const stretcher = getLumber(config.stretcherMaterialId);
  const top = getSheet(config.topMaterialId);
  const legW = leg?.actualWidth ?? 3.5;
  const apronH = apron?.actualDepth ?? 3.5;
  const stretcherH = stretcher?.actualDepth ?? 3.5;
  const topT = g.topThickness;

  const casterH = g.casterHeight;
  const legBottomZ = casterH;
  const legTopZ = legBottomZ + g.legCutLength;
  const xL0 = config.overhangSide;
  const xL1 = L - config.overhangSide - legW;

  const topFill = top
    ? config.topConstruction === "doubled-sheet"
      ? "url(#plyHatch)"
      : config.topConstruction === "single-sheet"
        ? "url(#plyHatch)"
        : TOP_FILL
    : TOP_FILL;

  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold text-card-foreground">
          Front elevation
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          looking at the long side
        </div>
      </div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Front elevation"
      >
        <Defs />

        {/* floor line */}
        <line
          x1={px(0) - 24}
          y1={py(0)}
          x2={px(L) + 24}
          y2={py(0)}
          stroke={DIM}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Pegboard */}
        {config.pegboard && (
          <rect
            x={px(0)}
            y={py(config.totalHeight + config.pegboardHeight)}
            width={L * scale}
            height={config.pegboardHeight * scale}
            fill={PEGBOARD_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* Top */}
        <rect
          x={px(0)}
          y={py(legTopZ + topT)}
          width={L * scale}
          height={topT * scale}
          fill={topFill}
          stroke={TOP_EDGE}
          strokeWidth={1}
        />
        {/* For slab/laminated top, draw the lamination layers as horizontal lines */}
        {config.topConstruction === "slab" &&
          drawLamLines(px(0), py(legTopZ + topT), L * scale, topT * scale, "horizontal", 1.5 * scale)}
        {config.topConstruction === "laminated-2x" &&
          drawLamLines(px(0), py(legTopZ + topT), L * scale, topT * scale, "horizontal", 1.5 * scale)}

        {/* Dog holes on top — shown as small black circles along the top edge */}
        {config.dogHoles &&
          Array.from({ length: Math.max(4, Math.floor((L - 8) / config.dogHoleSpacing) + 1) }).map((_, i) => {
            const xPos = 4 + i * config.dogHoleSpacing;
            if (xPos > L - 4) return null;
            return (
              <circle
                key={`dog-${i}`}
                cx={px(xPos)}
                cy={py(legTopZ + topT) - 1}
                r={Math.max(1.2, scale * 0.4)}
                fill="#3f2d1d"
              />
            );
          })}

        {/* Front apron */}
        <rect
          x={px(xL0)}
          y={py(legTopZ)}
          width={(xL1 + legW - xL0) * scale}
          height={apronH * scale}
          fill={APRON_FILL}
          stroke={DIM}
          strokeWidth={0.8}
        />

        {/* Front floor stretcher */}
        {config.stretchers.floorStretchers && (
          <rect
            x={px(xL0)}
            y={py(legBottomZ + config.stretchers.floorStretcherHeight + stretcherH / 2)}
            width={(xL1 + legW - xL0) * scale}
            height={stretcherH * scale}
            fill={STRETCHER_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* Lower shelf (front edge visible) */}
        {config.stretchers.lowerShelf && (
          <rect
            x={px(xL0 + legW)}
            y={py(legBottomZ + config.stretchers.shelfHeight + 0.5)}
            width={(xL1 - xL0 - legW) * scale}
            height={Math.max(2, 0.75 * scale)}
            fill={SHELF_FILL}
            stroke={DIM}
            strokeWidth={0.6}
          />
        )}

        {/* Legs — front-left and front-right. If splayed, lean outward. */}
        {[xL0, xL1].map((lxTop, i) => {
          const splayed = config.legSplayDeg > 0;
          const lxBottom = splayed
            ? lxTop // front view, splay is in depth not length — legs look straight in this view
            : lxTop;
          return (
            <polygon
              key={`leg-${i}`}
              points={`${px(lxTop)},${py(legTopZ)} ${px(lxTop + legW)},${py(legTopZ)} ${px(lxBottom + legW)},${py(legBottomZ)} ${px(lxBottom)},${py(legBottomZ)}`}
              fill={LEG_FILL}
              stroke={DIM}
              strokeWidth={0.8}
            />
          );
        })}

        {/* Vise chop on front-left */}
        {config.vise === "leg-vise" && (
          <>
            <rect
              x={px(xL0 + legW)}
              y={py(legTopZ)}
              width={Math.max(4, 1.5 * scale)}
              height={(legTopZ - legBottomZ - 2) * scale}
              fill={VISE_FILL}
              stroke={DIM}
              strokeWidth={0.8}
            />
            <circle
              cx={px(xL0 + legW) + Math.max(4, 1.5 * scale) / 2}
              cy={py(legTopZ) + 14}
              r={Math.max(2, scale * 0.8)}
              fill="#78716c"
              stroke={DIM}
              strokeWidth={0.6}
            />
          </>
        )}
        {(config.vise === "front-face-vise" || config.vise === "quick-release-9in") && (
          <rect
            x={px(xL0 + legW + 2)}
            y={py(legTopZ - 1)}
            width={Math.max(10, 8 * scale)}
            height={Math.max(6, 5 * scale)}
            fill={VISE_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* Casters */}
        {config.casters &&
          [xL0 + legW / 2, xL1 + legW / 2].map((cx, i) => (
            <g key={`caster-${i}`}>
              <rect
                x={px(cx) - 7}
                y={py(legBottomZ) - 2}
                width={14}
                height={4}
                fill={CASTER_FILL}
              />
              <ellipse
                cx={px(cx)}
                cy={py(0) - 2}
                rx={Math.max(4, 1.6 * scale)}
                ry={Math.max(3, 1.4 * scale)}
                fill={CASTER_FILL}
              />
            </g>
          ))}

        {/* Dimensions */}
        <DimH x1={px(0)} x2={px(L)} y={PAD_T - 22} label={formatLength(L, unit)} />
        <DimV
          x={VIEW_W - PAD_R + 28}
          y1={py(0)}
          y2={py(config.totalHeight)}
          label={formatLength(config.totalHeight, unit)}
        />
        {config.stretchers.floorStretchers && (
          <DimV
            x={PAD_L - 28}
            y1={py(0)}
            y2={py(legBottomZ + config.stretchers.floorStretcherHeight)}
            label={formatLength(config.stretchers.floorStretcherHeight, unit)}
            flip
          />
        )}
      </svg>
    </Card>
  );
}

// ----------------------------------------------------------------------
// SIDE ELEVATION — viewer looks at the bench's narrow end.
// ----------------------------------------------------------------------

export function SideElevation({ config, unit }: Props) {
  const g = deriveGeometry(config);
  const D = Math.max(g.floorSpanShort + 2 * 1.5, config.topDepth + 4); // include splay footprint
  const H = config.totalHeight + (config.pegboard ? config.pegboardHeight : 0);
  const scale = fitScale(D, H);
  const baseX = PAD_L + ((VIEW_W - PAD_L - PAD_R) - D * scale) / 2;
  const baseY = PAD_T + ((VIEW_H - PAD_T - PAD_B) - H * scale);

  const px = (yIn: number) => baseX + yIn * scale;
  const py = (zIn: number) => baseY + (H - zIn) * scale;

  const leg = getLumber(config.legMaterialId);
  const apron = getLumber(config.apronMaterialId);
  const stretcher = getLumber(config.stretcherMaterialId);
  const top = getSheet(config.topMaterialId);
  const legW = leg?.actualWidth ?? 3.5;
  const apronH = apron?.actualDepth ?? 3.5;
  const stretcherH = stretcher?.actualDepth ?? 3.5;
  const topT = g.topThickness;

  const casterH = g.casterHeight;
  const legBottomZ = casterH;
  const legTopZ = legBottomZ + g.legCutLength;

  // Center the bench depth within the projected area; topDepth is offset from
  // origin by (D - config.topDepth) / 2 so splayed leg feet fit on the canvas.
  const topOffset = (D - config.topDepth) / 2;
  const yT0 = topOffset; // front edge of top
  const yT1 = topOffset + config.topDepth; // back edge of top

  // Leg positions at top — inset by overhangFront
  const yLegFrontTop = topOffset + config.overhangFront;
  const yLegBackTop = topOffset + config.topDepth - config.overhangFront - legW;

  // Splayed leg feet are wider at the floor
  const splayRad = (config.legSplayDeg * Math.PI) / 180;
  const splayDelta = Math.tan(splayRad) * g.legCutLength;
  const yLegFrontBottom = yLegFrontTop - splayDelta;
  const yLegBackBottom = yLegBackTop + splayDelta;

  const topFill = top
    ? config.topConstruction === "doubled-sheet" || config.topConstruction === "single-sheet"
      ? "url(#plyHatch)"
      : TOP_FILL
    : TOP_FILL;

  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold text-card-foreground">
          Side elevation
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          end view — front is at left
        </div>
      </div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Side elevation"
      >
        <Defs />

        {/* floor */}
        <line
          x1={PAD_L - 16}
          y1={py(0)}
          x2={VIEW_W - PAD_R + 16}
          y2={py(0)}
          stroke={DIM}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Pegboard at back */}
        {config.pegboard && (
          <rect
            x={px(yT1 - 0.25)}
            y={py(config.totalHeight + config.pegboardHeight)}
            width={Math.max(2, 0.25 * scale)}
            height={config.pegboardHeight * scale}
            fill={PEGBOARD_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* TOP — full depth */}
        <rect
          x={px(yT0)}
          y={py(legTopZ + topT)}
          width={config.topDepth * scale}
          height={topT * scale}
          fill={topFill}
          stroke={TOP_EDGE}
          strokeWidth={1.1}
        />
        {/* Slab/laminated layers */}
        {(config.topConstruction === "slab" || config.topConstruction === "laminated-2x") &&
          drawLamLines(
            px(yT0),
            py(legTopZ + topT),
            config.topDepth * scale,
            topT * scale,
            "horizontal",
            1.5 * scale,
          )}

        {/* Top dog hole (one) — visible at front edge as a slot */}
        {config.dogHoles && (
          <rect
            x={px(yT0 + 2) - 1.2}
            y={py(legTopZ + topT) - 0.5}
            width={2.4}
            height={topT * scale + 0.5}
            fill="#3f2d1d"
          />
        )}

        {/* Top apron (side) — runs between front + back legs along the depth */}
        <rect
          x={px(yLegFrontTop + legW)}
          y={py(legTopZ)}
          width={(yLegBackTop - yLegFrontTop - legW) * scale}
          height={apronH * scale}
          fill={APRON_FILL}
          stroke={DIM}
          strokeWidth={0.8}
        />

        {/* Side floor stretcher */}
        {config.stretchers.floorStretchers && (
          <polygon
            points={`
              ${px(yLegFrontBottom + legW * 0.5)},${py(legBottomZ + config.stretchers.floorStretcherHeight + stretcherH / 2)}
              ${px(yLegBackBottom + legW * 0.5)},${py(legBottomZ + config.stretchers.floorStretcherHeight + stretcherH / 2)}
              ${px(yLegBackBottom + legW * 0.5)},${py(legBottomZ + config.stretchers.floorStretcherHeight - stretcherH / 2)}
              ${px(yLegFrontBottom + legW * 0.5)},${py(legBottomZ + config.stretchers.floorStretcherHeight - stretcherH / 2)}
            `}
            fill={STRETCHER_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* Center stretcher under top */}
        {config.stretchers.centerStretcher && (
          <rect
            x={px(yLegFrontTop + legW)}
            y={py(legTopZ - apronH + stretcherH)}
            width={(yLegBackTop - yLegFrontTop - legW) * scale}
            height={stretcherH * scale}
            fill={STRETCHER_FILL}
            stroke={DIM}
            strokeWidth={0.8}
            opacity={0.85}
          />
        )}

        {/* Lower shelf — side view shows it edge-on (thin) */}
        {config.stretchers.lowerShelf && (
          <rect
            x={px(yLegFrontTop + legW)}
            y={py(legBottomZ + config.stretchers.shelfHeight + 0.75)}
            width={(yLegBackTop - yLegFrontTop - legW) * scale}
            height={Math.max(2, 0.75 * scale)}
            fill={SHELF_FILL}
            stroke={DIM}
            strokeWidth={0.6}
          />
        )}

        {/* Diagonal brace, if used */}
        {config.stretchers.diagonalBraces && !config.stretchers.floorStretchers && (
          <line
            x1={px(yLegFrontTop + legW)}
            y1={py(legTopZ - apronH)}
            x2={px(yLegBackTop)}
            y2={py(legBottomZ + config.stretchers.shelfHeight + 2)}
            stroke={STRETCHER_FILL}
            strokeWidth={Math.max(3, 1.5 * scale)}
            strokeLinecap="round"
          />
        )}

        {/* Legs (front and back) — splayed legs render as trapezoids */}
        {[
          { top: yLegFrontTop, bottom: yLegFrontBottom },
          { top: yLegBackTop, bottom: yLegBackBottom },
        ].map((p2, i) => (
          <polygon
            key={`leg-${i}`}
            points={`${px(p2.top)},${py(legTopZ)} ${px(p2.top + legW)},${py(legTopZ)} ${px(p2.bottom + legW)},${py(legBottomZ)} ${px(p2.bottom)},${py(legBottomZ)}`}
            fill={LEG_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        ))}

        {/* Vise chop (visible on front-left leg = front side here) */}
        {config.vise === "leg-vise" && (
          <rect
            x={px(yLegFrontTop - 1.5)}
            y={py(legTopZ)}
            width={Math.max(4, 1.5 * scale)}
            height={(legTopZ - legBottomZ - 2) * scale}
            fill={VISE_FILL}
            stroke={DIM}
            strokeWidth={0.8}
          />
        )}

        {/* Casters */}
        {config.casters &&
          [yLegFrontBottom + legW / 2, yLegBackBottom + legW / 2].map((cy, i) => (
            <g key={`caster-${i}`}>
              <rect
                x={px(cy) - 7}
                y={py(legBottomZ) - 2}
                width={14}
                height={4}
                fill={CASTER_FILL}
              />
              <ellipse
                cx={px(cy)}
                cy={py(0) - 2}
                rx={Math.max(4, 1.6 * scale)}
                ry={Math.max(3, 1.4 * scale)}
                fill={CASTER_FILL}
              />
            </g>
          ))}

        {/* Dimensions */}
        <DimH x1={px(yT0)} x2={px(yT1)} y={PAD_T - 22} label={formatLength(config.topDepth, unit)} />
        <DimV
          x={VIEW_W - PAD_R + 28}
          y1={py(0)}
          y2={py(config.totalHeight)}
          label={formatLength(config.totalHeight, unit)}
        />
        {config.legSplayDeg > 0 && (
          <text
            x={VIEW_W / 2}
            y={py(0) + 18}
            textAnchor="middle"
            fontSize={10}
            fill={DIM}
            fontStyle="italic"
          >
            legs splay {config.legSplayDeg}° outward
          </text>
        )}
      </svg>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function drawLamLines(
  x: number,
  y: number,
  w: number,
  h: number,
  orientation: "horizontal" | "vertical",
  stepPx: number,
) {
  const lines: ReactElement[] = [];
  if (orientation === "horizontal") {
    const step = Math.max(2, stepPx);
    for (let i = 1; i * step < h; i++) {
      lines.push(
        <line
          key={`lh-${i}`}
          x1={x}
          y1={y + i * step}
          x2={x + w}
          y2={y + i * step}
          stroke="#92400e"
          strokeWidth={0.5}
          opacity={0.6}
        />,
      );
    }
  } else {
    const step = Math.max(2, stepPx);
    for (let i = 1; i * step < w; i++) {
      lines.push(
        <line
          key={`lv-${i}`}
          x1={x + i * step}
          y1={y}
          x2={x + i * step}
          y2={y + h}
          stroke="#92400e"
          strokeWidth={0.5}
          opacity={0.6}
        />,
      );
    }
  }
  return <g>{lines}</g>;
}

function DimH({
  x1, x2, y, label,
}: {
  x1: number; x2: number; y: number; label: string;
}) {
  const arrow = 5;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={DIM} strokeWidth={0.8} />
      <line x1={x1} y1={y - arrow} x2={x1} y2={y + arrow} stroke={DIM} strokeWidth={0.8} />
      <line x1={x2} y1={y - arrow} x2={x2} y2={y + arrow} stroke={DIM} strokeWidth={0.8} />
      <rect x={(x1 + x2) / 2 - 26} y={y - 9} width={52} height={14} fill="var(--card)" />
      <text x={(x1 + x2) / 2} y={y + 2} textAnchor="middle" fontSize={11} fill={DIM}>
        {label}
      </text>
    </g>
  );
}

function DimV({
  x, y1, y2, label, flip = false,
}: {
  x: number; y1: number; y2: number; label: string; flip?: boolean;
}) {
  const arrow = 5;
  const cy = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={DIM} strokeWidth={0.8} />
      <line x1={x - arrow} y1={y1} x2={x + arrow} y2={y1} stroke={DIM} strokeWidth={0.8} />
      <line x1={x - arrow} y1={y2} x2={x + arrow} y2={y2} stroke={DIM} strokeWidth={0.8} />
      <text
        x={x + (flip ? -8 : 8)}
        y={cy}
        textAnchor={flip ? "end" : "start"}
        fontSize={11}
        fill={DIM}
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  );
}
