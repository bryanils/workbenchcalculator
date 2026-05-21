import type { LumberBoardOut } from "~/lib/types";
import { formatLength, type Unit } from "~/lib/units";

type Props = {
  board: LumberBoardOut;
  index: number;
  unit: Unit;
};

const HUES = [
  "#0ea5e9", "#22c55e", "#eab308", "#a855f7",
  "#f97316", "#14b8a6", "#ef4444", "#6366f1",
];

export function LumberDiagram({ board, index, unit }: Props) {
  const padding = 16;
  const totalWidth = 720;
  const drawableWidth = totalWidth - padding * 2;
  const height = 64;
  const scale = drawableWidth / board.stockLen;

  let cursor = 0;
  const segments: {
    x: number; w: number; len: number;
    partCode: string; purpose: string; color: string;
  }[] = [];

  board.cuts.forEach((c, i) => {
    segments.push({
      x: cursor * scale,
      w: c.len * scale,
      len: c.len,
      partCode: c.partCode,
      purpose: c.purpose,
      color: HUES[(i + index) % HUES.length] ?? "#0ea5e9",
    });
    cursor += c.len;
    // kerf gap after each cut except the last
    if (i < board.cuts.length - 1) {
      // Visual kerf is too small to draw to scale; render as a 1px black line.
    }
  });

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold">
          Board {index + 1} — {board.materialLabel} @ {board.stockLen / 12} ft (
          {board.stockLen}")
        </div>
        <div className="text-xs text-stone-500">
          waste: {formatLength(board.wasteLen, unit)} (
          {((board.wasteLen / board.stockLen) * 100).toFixed(0)}%)
        </div>
      </div>

      <svg
        viewBox={`0 0 ${totalWidth} ${height + 30}`}
        className="w-full"
        role="img"
        aria-label={`Cut diagram for board ${index + 1}`}
      >
        <g transform={`translate(${padding}, 8)`}>
          {/* full board outline */}
          <rect
            x={0}
            y={0}
            width={drawableWidth}
            height={height}
            fill="#fef3c7"
            stroke="#a16207"
            strokeWidth={1.5}
          />

          {/* cuts */}
          {segments.map((s, i) => (
            <g key={i}>
              <rect
                x={s.x}
                y={0}
                width={s.w}
                height={height}
                fill={s.color}
                fillOpacity={0.85}
                stroke="#0c4a6e"
                strokeWidth={0.5}
              />
              <text
                x={s.x + s.w / 2}
                y={height / 2 - 4}
                textAnchor="middle"
                className="fill-white text-[11px] font-bold"
              >
                {s.partCode}
              </text>
              <text
                x={s.x + s.w / 2}
                y={height / 2 + 10}
                textAnchor="middle"
                className="fill-white text-[10px]"
              >
                {formatLength(s.len, unit)}
              </text>
            </g>
          ))}

          {/* kerf marks between cuts */}
          {segments.slice(0, -1).map((s, i) => (
            <line
              key={`k${i}`}
              x1={s.x + s.w}
              x2={s.x + s.w}
              y1={-2}
              y2={height + 2}
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          ))}

          {/* total length tick */}
          <line
            x1={0}
            x2={drawableWidth}
            y1={height + 14}
            y2={height + 14}
            stroke="#57534e"
            strokeWidth={1}
          />
          <text
            x={drawableWidth / 2}
            y={height + 26}
            textAnchor="middle"
            className="fill-stone-600 text-[10px]"
          >
            {formatLength(board.stockLen, unit)} total
          </text>
        </g>
      </svg>

      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-stone-700">
        {board.cuts.map((c, i) => (
          <li key={i}>
            <span className="font-mono font-semibold">{c.partCode}</span>{" "}
            — {formatLength(c.len, unit)} — {c.purpose}
          </li>
        ))}
      </ul>
    </div>
  );
}
