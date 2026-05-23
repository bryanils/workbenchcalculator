import type { SheetLayoutOut } from "~/lib/types";
import { formatLength, type Unit } from "~/lib/units";
import { Card } from "~/components/ui/card";

type Props = {
  layout: SheetLayoutOut;
  index: number;
  unit: Unit;
};

const HUES = [
  "#3b82f6", "#16a34a", "#ca8a04", "#9333ea",
  "#ea580c", "#0d9488", "#dc2626", "#4f46e5",
];

export function SheetDiagram({ layout, index, unit }: Props) {
  const displayW = layout.nominalSheetW;
  const displayH = layout.nominalSheetH;
  const nominalArea = displayW * displayH;
  const wastePct = Math.max(0, ((nominalArea - layout.usedArea) / nominalArea) * 100);
  const displayLong = Math.max(displayW, displayH);

  const pad = 12;
  // Draw landscape for readability, but display the standard nominal sheet size.
  const viewW = 600;
  const viewH = viewW * (layout.sheetH / layout.sheetW);
  const scale = viewW / layout.sheetW;

  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold">
          Sheet {index + 1} — {layout.materialLabel} ({formatLength(displayW, unit)}×
          {formatLength(displayH, unit)})
        </div>
        <div className="text-xs text-muted-foreground">waste: {wastePct.toFixed(0)}%</div>
      </div>

      <svg
        viewBox={`0 0 ${viewW + pad * 2} ${viewH + pad * 2 + 20}`}
        className="w-full text-foreground"
        role="img"
        aria-label={`Sheet layout ${index + 1}`}
      >
        <g transform={`translate(${pad}, ${pad})`}>
          {/* sheet outline */}
          <rect
            x={0}
            y={0}
            width={viewW}
            height={viewH}
            className="fill-muted"
            stroke="currentColor"
            strokeOpacity={0.6}
            strokeWidth={1.5}
          />

          {/* grid lines every 12 inches */}
          {Array.from({ length: Math.floor(layout.sheetW / 12) + 1 }, (_, i) => (
            <line
              key={`vx${i}`}
              x1={i * 12 * scale}
              x2={i * 12 * scale}
              y1={0}
              y2={viewH}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={0.5}
            />
          ))}
          {Array.from({ length: Math.floor(layout.sheetH / 12) + 1 }, (_, i) => (
            <line
              key={`hx${i}`}
              x1={0}
              x2={viewW}
              y1={i * 12 * scale}
              y2={i * 12 * scale}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={0.5}
            />
          ))}

          {/* placed pieces */}
          {layout.pieces.map((p, i) => {
            const color = HUES[(i + index) % HUES.length] ?? "#3b82f6";
            const x = p.x * scale;
            const y = p.y * scale;
            const w = p.w * scale;
            const h = p.h * scale;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill={color}
                  fillOpacity={0.8}
                  stroke="#0c4a6e"
                  strokeWidth={1}
                />
                <text
                  x={x + w / 2}
                  y={y + h / 2 - 3}
                  textAnchor="middle"
                  className="fill-white text-[12px] font-bold"
                >
                  {p.partCode}
                </text>
                <text
                  x={x + w / 2}
                  y={y + h / 2 + 11}
                  textAnchor="middle"
                  className="fill-white text-[9px]"
                >
                  {formatLength(p.w, unit)} × {formatLength(p.h, unit)}
                </text>
                {p.rotated && (
                  <text
                    x={x + 4}
                    y={y + 10}
                    className="fill-white text-[8px] italic"
                  >
                    rotated
                  </text>
                )}
              </g>
            );
          })}

          {/* sheet dimension labels */}
          <text
            x={viewW / 2}
            y={viewH + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {formatLength(displayLong, unit)} ←
          </text>
        </g>
      </svg>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-foreground">
        {layout.pieces.map((p, i) => (
          <li key={i}>
            <span className="font-mono font-semibold">{p.partCode}</span> —{" "}
            {formatLength(p.w, unit)} × {formatLength(p.h, unit)} — {p.purpose}
          </li>
        ))}
      </ul>
    </Card>
  );
}
