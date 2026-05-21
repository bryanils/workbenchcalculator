import type { BenchConfig } from "~/lib/types";
import { formatLength, type Unit } from "~/lib/units";

type Props = {
  config: BenchConfig;
  legHeight: number;
  unit: Unit;
};

type Pt = { x: number; y: number };

export function BenchIsoDiagram({ config, legHeight, unit }: Props) {
  const L = config.topLength;
  const W = config.topWidth;
  const H = config.totalHeight;
  const t = 0.75;

  const oblique = 0.45;
  const projWidth = L + W * oblique;
  const projHeight = H + W * oblique;
  const target = 320;
  const scale = (target * 0.85) / Math.max(projWidth, projHeight);

  const project = (x: number, y: number, z: number): Pt => ({
    x: x * scale + y * oblique * scale + 30,
    y: target - (z * scale + y * oblique * scale) - 20,
  });

  const topFL = project(0, 0, H);
  const topFR = project(L, 0, H);
  const topBR = project(L, W, H);
  const topBL = project(0, W, H);
  const tuFL = project(0, 0, H - t);
  const tuFR = project(L, 0, H - t);
  const tuBR = project(L, W, H - t);

  // Legs — overhang inset
  const ov = config.overhang;
  const lx0 = ov;
  const lx1 = L - ov;
  const ly0 = ov;
  const ly1 = W - ov;
  const legZTop = legHeight + (config.casters ? 3 : 0);

  const legs: { top: Pt; bottom: Pt }[] = [
    { top: project(lx0, ly0, legZTop), bottom: project(lx0, ly0, 0) },
    { top: project(lx1, ly0, legZTop), bottom: project(lx1, ly0, 0) },
    { top: project(lx0, ly1, legZTop), bottom: project(lx0, ly1, 0) },
    { top: project(lx1, ly1, legZTop), bottom: project(lx1, ly1, 0) },
  ];

  const apronFrontA = project(lx0, ly0, legZTop);
  const apronFrontB = project(lx1, ly0, legZTop);
  const apronSideA = project(lx1, ly0, legZTop);
  const apronSideB = project(lx1, ly1, legZTop);

  const shelfZ = config.includeShelf ? config.shelfHeight : null;
  const shelfA = shelfZ !== null ? project(lx0, ly0, shelfZ) : null;
  const shelfB = shelfZ !== null ? project(lx1, ly0, shelfZ) : null;
  const shelfC = shelfZ !== null ? project(lx1, ly1, shelfZ) : null;
  const shelfD = shelfZ !== null ? project(lx0, ly1, shelfZ) : null;

  const pegboardTopZ = config.pegboard ? H + config.pegboardHeight : null;
  const peg1 = pegboardTopZ !== null ? project(0, W, H) : null;
  const peg2 = pegboardTopZ !== null ? project(L, W, H) : null;
  const peg3 = pegboardTopZ !== null ? project(L, W, pegboardTopZ) : null;
  const peg4 = pegboardTopZ !== null ? project(0, W, pegboardTopZ) : null;

  const casterPts = config.casters
    ? [
        project(lx0, ly0, 0),
        project(lx1, ly0, 0),
        project(lx0, ly1, 0),
        project(lx1, ly1, 0),
      ]
    : [];

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-1 text-sm font-semibold">Bench overview</div>
      <svg
        viewBox={`0 0 ${L * scale + W * oblique * scale + 80} ${target}`}
        className="w-full"
        role="img"
        aria-label="Isometric bench drawing"
      >
        {peg1 && peg2 && peg3 && peg4 && (
          <polygon
            points={`${peg1.x},${peg1.y} ${peg2.x},${peg2.y} ${peg3.x},${peg3.y} ${peg4.x},${peg4.y}`}
            fill="#e7e5e4"
            stroke="#57534e"
            strokeWidth={1}
          />
        )}

        {/* Top — top face */}
        <polygon
          points={`${topFL.x},${topFL.y} ${topFR.x},${topFR.y} ${topBR.x},${topBR.y} ${topBL.x},${topBL.y}`}
          fill="#fde68a"
          stroke="#a16207"
          strokeWidth={1.2}
        />
        {/* front edge */}
        <polygon
          points={`${topFL.x},${topFL.y} ${topFR.x},${topFR.y} ${tuFR.x},${tuFR.y} ${tuFL.x},${tuFL.y}`}
          fill="#fbbf24"
          stroke="#a16207"
          strokeWidth={1.2}
        />
        {/* right side edge */}
        <polygon
          points={`${topFR.x},${topFR.y} ${topBR.x},${topBR.y} ${tuBR.x},${tuBR.y} ${tuFR.x},${tuFR.y}`}
          fill="#f59e0b"
          stroke="#a16207"
          strokeWidth={1.2}
        />

        {/* Legs */}
        {legs.map((l, i) => (
          <line
            key={`leg-${i}`}
            x1={l.top.x}
            y1={l.top.y}
            x2={l.bottom.x}
            y2={l.bottom.y}
            stroke="#78350f"
            strokeWidth={Math.max(3, scale * 1.8)}
            strokeLinecap="round"
          />
        ))}

        {/* Front apron */}
        <line
          x1={apronFrontA.x}
          y1={apronFrontA.y}
          x2={apronFrontB.x}
          y2={apronFrontB.y}
          stroke="#92400e"
          strokeWidth={Math.max(4, scale * 3.5)}
        />
        {/* Side apron (right) */}
        <line
          x1={apronSideA.x}
          y1={apronSideA.y}
          x2={apronSideB.x}
          y2={apronSideB.y}
          stroke="#92400e"
          strokeWidth={Math.max(4, scale * 3.5)}
        />

        {shelfA && shelfB && shelfC && shelfD && (
          <polygon
            points={`${shelfA.x},${shelfA.y} ${shelfB.x},${shelfB.y} ${shelfC.x},${shelfC.y} ${shelfD.x},${shelfD.y}`}
            fill="#d6d3d1"
            stroke="#57534e"
            strokeWidth={1}
            opacity={0.85}
          />
        )}

        {casterPts.map((c, i) => (
          <circle
            key={`caster-${i}`}
            cx={c.x}
            cy={c.y}
            r={Math.max(3, scale * 1.5)}
            fill="#1c1917"
          />
        ))}

        <text
          x={(topFL.x + topFR.x) / 2}
          y={topFL.y - 6}
          textAnchor="middle"
          className="fill-stone-600 text-[11px]"
        >
          {formatLength(L, unit)}
        </text>
        <text
          x={topBR.x + 6}
          y={(topBR.y + project(L, W, 0).y) / 2}
          className="fill-stone-600 text-[11px]"
        >
          {formatLength(H, unit)}
        </text>
        <text
          x={(topFR.x + topBR.x) / 2 + 6}
          y={(topFR.y + topBR.y) / 2 - 4}
          className="fill-stone-600 text-[11px]"
        >
          {formatLength(W, unit)}
        </text>
      </svg>
    </div>
  );
}
