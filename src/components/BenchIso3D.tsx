// Real 3D bench rendering using three.js via react-three-fiber. Each
// structural member is a parametric box positioned in inch-space; lighting
// + standard materials handle face shading and depth automatically (no more
// hand-rolled painter's algorithm).
//
// Bench coordinate system (matches the rest of the app):
//   x = length    (0 .. topLength, runs left→right along the front)
//   y = depth     (0 .. topDepth,  runs front→back)
//   z = height    (0 .. totalHeight, runs floor→ceiling)
//
// three.js uses Y-up. We map (x, y, z) → (x, z, y) and recenter the bench
// on the world origin so OrbitControls revolves around the bench middle.

import { useEffect, useRef, type ElementRef, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";

import type { BenchConfig } from "~/lib/types";
import { formatLength, type Unit } from "~/lib/units";
import { getLumber } from "~/lib/materials";
import { deriveGeometry } from "~/lib/derive";
import { Card } from "~/components/ui/card";

// Wood / accessory palette — base colors; the directional light produces the
// top-bright / side-darker shading automatically.
const C_TOP = "#d9b878";
const C_LEG = "#8a5a3a";
const C_APRON = "#9c6b48";
const C_STRETCHER = "#7a5a3c";
const C_SHELF = "#c2a373";
const C_VISE = "#1c1917";
const C_PEGBOARD = "#d6cfc4";
const C_CASTER = "#1c1917";
const C_DOG = "#2c1d10";

type Props = {
  config: BenchConfig;
  unit: Unit;
};

// ----- Primitives -----

function Box({
  x, y, z, l, d, h, color, roughness = 0.72,
}: {
  x: number; y: number; z: number;
  l: number; d: number; h: number;
  color: string;
  roughness?: number;
}) {
  return (
    <mesh
      position={[x + l / 2, z + h / 2, y + d / 2]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[l, h, d]} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

// A leg that pivots from the top of the leg, so positive splay tilts the
// bottom outward without moving the joint at the apron.
function Leg({
  xTopLeft, yTopFront, zBottom, w, d, h, splayRad, tiltSign,
}: {
  xTopLeft: number;
  yTopFront: number;
  zBottom: number;
  w: number;
  d: number;
  h: number;
  splayRad: number;
  tiltSign: -1 | 1; // -1 = back leg, +1 = front leg (relative to the X-axis rotation)
}) {
  const pivotX = xTopLeft + w / 2;
  const pivotZ = yTopFront + d / 2;
  const pivotY = zBottom + h;
  return (
    <group position={[pivotX, pivotY, pivotZ]} rotation={[tiltSign * splayRad, 0, 0]}>
      <mesh position={[0, -h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={C_LEG} roughness={0.75} />
      </mesh>
    </group>
  );
}

// ----- Scene root -----

export function BenchIso3D({ config, unit }: Props) {
  const L = config.topLength;
  const W = config.topDepth;
  const H = config.totalHeight;
  const g = deriveGeometry(config);

  const leg = getLumber(config.legMaterialId);
  const apron = getLumber(config.apronMaterialId);
  const stretcher = getLumber(config.stretcherMaterialId);

  const legW = leg?.actualWidth ?? 3.5;
  const legD = leg?.actualDepth ?? 3.5;
  const apronH = apron?.actualDepth ?? 3.5;
  const apronT = apron?.actualWidth ?? 1.5;
  const stretcherH = stretcher?.actualDepth ?? 3.5;
  const stretcherT = stretcher?.actualWidth ?? 1.5;
  const topT = g.topThickness;
  const casterH = g.casterHeight;
  const baseZ = casterH;
  const legCutLen = g.legCutLength;
  const legZTop = baseZ + legCutLen;
  const topZ = legZTop;

  const xLegL = config.overhangSide;
  const xLegR = L - config.overhangSide - legW;
  const yLegFront = config.overhangFront;
  const yLegBack = W - config.overhangFront - legD;

  const splayRad = (config.legSplayDeg * Math.PI) / 180;

  // Bench is built with corner at world (0,0,0); we recenter by translating
  // the whole group so the camera revolves around the bench middle.
  const cx = L / 2;
  const cy = W / 2;
  const totalH = H + (config.pegboard ? config.pegboardHeight : 0);

  const camRadius = Math.max(L, W, totalH) * 1.4;

  // Snap the orbit camera back to the canonical 3/4 vantage during print, so
  // a printed build sheet always shows the same readable angle no matter
  // where the user has rotated to. preserveDrawingBuffer below lets the
  // browser actually capture WebGL pixels in the print snapshot.
  const controlsRef = useRef<ElementRef<typeof OrbitControls>>(null);
  useEffect(() => {
    type Snapshot = {
      tx: number; ty: number; tz: number;
      px: number; py: number; pz: number;
    };
    const memo: { value: Snapshot | null } = { value: null };
    const beforePrint = () => {
      const c = controlsRef.current;
      if (!c) return;
      memo.value = {
        tx: c.target.x, ty: c.target.y, tz: c.target.z,
        px: c.object.position.x, py: c.object.position.y, pz: c.object.position.z,
      };
      c.reset();
    };
    const afterPrint = () => {
      const c = controlsRef.current;
      const v = memo.value;
      if (!c || !v) return;
      c.target.set(v.tx, v.ty, v.tz);
      c.object.position.set(v.px, v.py, v.pz);
      c.update();
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
    };
  }, []);

  // ---- Members ----
  const members: ReactNode[] = [];

  // Top slab
  members.push(
    <Box
      key="top"
      x={0} y={0} z={topZ}
      l={L} d={W} h={topT}
      color={C_TOP} roughness={0.55}
    />,
  );

  // Front + back top aprons (between front-pair / back-pair legs)
  members.push(
    <Box
      key="apron-front"
      x={xLegL + legW}
      y={yLegFront + legD - apronT}
      z={legZTop - apronH}
      l={g.insideLongTop}
      d={apronT}
      h={apronH}
      color={C_APRON}
    />,
    <Box
      key="apron-back"
      x={xLegL + legW}
      y={yLegBack}
      z={legZTop - apronH}
      l={g.insideLongTop}
      d={apronT}
      h={apronH}
      color={C_APRON}
    />,
    <Box
      key="apron-side-left"
      x={xLegL}
      y={yLegFront + legD}
      z={legZTop - apronH}
      l={apronT}
      d={g.insideShortTop}
      h={apronH}
      color={C_APRON}
    />,
    <Box
      key="apron-side-right"
      x={xLegR + legW - apronT}
      y={yLegFront + legD}
      z={legZTop - apronH}
      l={apronT}
      d={g.insideShortTop}
      h={apronH}
      color={C_APRON}
    />,
  );

  // Legs
  const legPositions: Array<{ x: number; y: number; tilt: -1 | 1; key: string }> = [
    { x: xLegL, y: yLegFront, tilt: 1, key: "leg-fl" },
    { x: xLegR, y: yLegFront, tilt: 1, key: "leg-fr" },
    { x: xLegL, y: yLegBack, tilt: -1, key: "leg-bl" },
    { x: xLegR, y: yLegBack, tilt: -1, key: "leg-br" },
  ];
  for (const lp of legPositions) {
    members.push(
      <Leg
        key={lp.key}
        xTopLeft={lp.x}
        yTopFront={lp.y}
        zBottom={baseZ}
        w={legW}
        d={legD}
        h={legCutLen}
        splayRad={splayRad}
        tiltSign={lp.tilt}
      />,
    );
  }

  // Floor stretchers
  if (config.stretchers.floorStretchers) {
    const zStretcher = baseZ + config.stretchers.floorStretcherHeight - stretcherH / 2;
    members.push(
      <Box
        key="fstr-front"
        x={xLegL + legW}
        y={yLegFront + legD - stretcherT}
        z={zStretcher}
        l={g.insideLongTop}
        d={stretcherT}
        h={stretcherH}
        color={C_STRETCHER}
      />,
      <Box
        key="fstr-back"
        x={xLegL + legW}
        y={yLegBack}
        z={zStretcher}
        l={g.insideLongTop}
        d={stretcherT}
        h={stretcherH}
        color={C_STRETCHER}
      />,
      <Box
        key="fstr-left"
        x={xLegL + (legW - stretcherT) / 2}
        y={yLegFront + legD}
        z={zStretcher}
        l={stretcherT}
        d={g.insideShortTop}
        h={stretcherH}
        color={C_STRETCHER}
      />,
      <Box
        key="fstr-right"
        x={xLegR + (legW - stretcherT) / 2}
        y={yLegFront + legD}
        z={zStretcher}
        l={stretcherT}
        d={g.insideShortTop}
        h={stretcherH}
        color={C_STRETCHER}
      />,
    );
  }

  // Lower shelf
  if (config.stretchers.lowerShelf) {
    members.push(
      <Box
        key="shelf"
        x={xLegL + legW}
        y={yLegFront + legD}
        z={baseZ + config.stretchers.shelfHeight}
        l={g.insideLongTop}
        d={g.insideShortTop}
        h={0.5}
        color={C_SHELF}
      />,
    );
  }

  // Center stretcher under top
  if (config.stretchers.centerStretcher) {
    members.push(
      <Box
        key="center-stretcher"
        x={L / 2 - stretcherT / 2}
        y={yLegFront + legD}
        z={legZTop - apronH}
        l={stretcherT}
        d={g.insideShortTop}
        h={stretcherH}
        color={C_STRETCHER}
      />,
    );
  }

  // Pegboard back panel
  if (config.pegboard) {
    members.push(
      <Box
        key="pegboard"
        x={0}
        y={W - 0.25}
        z={H}
        l={L}
        d={0.25}
        h={config.pegboardHeight}
        color={C_PEGBOARD}
        roughness={0.85}
      />,
    );
  }

  // Vise (front-left)
  if (config.vise !== "none") {
    const viseW = 6;
    const baseViseH = 5;
    const dropExtra = config.vise === "leg-vise" ? legCutLen * 0.5 : 0;
    members.push(
      <Box
        key="vise"
        x={xLegL + legW}
        y={yLegFront + legD - apronT - 1.5}
        z={legZTop - baseViseH - dropExtra}
        l={viseW}
        d={1.5}
        h={baseViseH + dropExtra}
        color={C_VISE}
        roughness={0.4}
      />,
    );
  }

  // Dog holes — small dark cylinders inset into the top
  const dogHoles: ReactNode[] = [];
  if (config.dogHoles) {
    const yPos = config.overhangFront + 2;
    const startX = 4;
    const endX = L - 4;
    for (let x = startX; x <= endX; x += config.dogHoleSpacing) {
      dogHoles.push(
        <mesh
          key={`dh-${x}`}
          position={[x, topZ + topT + 0.015, yPos]}
        >
          <cylinderGeometry args={[0.42, 0.42, 0.04, 18]} />
          <meshStandardMaterial color={C_DOG} roughness={0.95} />
        </mesh>,
      );
    }
  }

  // Casters
  const casters: ReactNode[] = [];
  if (config.casters) {
    const casterPositions: Array<[number, number]> = [
      [xLegL + legW / 2, yLegFront + legD / 2],
      [xLegR + legW / 2, yLegFront + legD / 2],
      [xLegL + legW / 2, yLegBack + legD / 2],
      [xLegR + legW / 2, yLegBack + legD / 2],
    ];
    casterPositions.forEach(([cxx, cyy], i) => {
      casters.push(
        <group key={`caster-${i}`} position={[cxx, casterH / 2, cyy]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.6, 1.6, casterH * 0.85, 18]} />
            <meshStandardMaterial color={C_CASTER} roughness={0.55} />
          </mesh>
          <mesh position={[0, casterH * 0.45, 0]}>
            <boxGeometry args={[legW * 0.9, casterH * 0.15, legD * 0.9]} />
            <meshStandardMaterial color="#3f3937" roughness={0.55} />
          </mesh>
        </group>,
      );
    });
  }

  return (
    <Card className="p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold text-card-foreground">
          Bench overview (3D)
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {formatLength(L, unit)} × {formatLength(W, unit)} × {formatLength(H, unit)}
        </div>
      </div>
      <div className="aspect-[16/10] w-full overflow-hidden rounded-md bg-gradient-to-b from-stone-100 to-stone-300 dark:from-stone-900 dark:to-stone-950">
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true }}
          camera={{
            position: [camRadius * 0.85, camRadius * 0.55, camRadius * 0.95],
            fov: 32,
            near: 1,
            far: camRadius * 6,
          }}
        >
          <color attach="background" args={["#f4efe7"]} />

          <ambientLight intensity={0.55} />
          <hemisphereLight args={["#fff5e1", "#3a2f24", 0.35]} />
          <directionalLight
            position={[L * 1.3, totalH * 2.2, W * 1.8]}
            intensity={1.15}
            castShadow
            shadow-mapSize-width={1536}
            shadow-mapSize-height={1536}
            shadow-camera-left={-L * 0.9}
            shadow-camera-right={L * 0.9}
            shadow-camera-top={totalH * 1.6}
            shadow-camera-bottom={-totalH * 0.4}
            shadow-camera-near={0.5}
            shadow-camera-far={camRadius * 4}
            shadow-bias={-0.0005}
          />
          <directionalLight
            position={[-L, totalH * 0.8, -W * 1.5]}
            intensity={0.25}
          />

          <group position={[-cx, 0, -cy]}>
            {members}
            {dogHoles}
            {casters}
          </group>

          <ContactShadows
            position={[0, 0.005, 0]}
            opacity={0.4}
            scale={Math.max(L, W) * 2}
            blur={2.4}
            far={H * 0.6}
            resolution={1024}
          />

          <OrbitControls
            ref={controlsRef}
            target={[0, totalH * 0.4, 0]}
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={Math.max(L, W) * 0.45}
            maxDistance={camRadius * 2.5}
            maxPolarAngle={Math.PI / 2.05}
          />
        </Canvas>
      </div>
      <div className="mt-1 text-center text-[10px] italic text-muted-foreground">
        drag to rotate · scroll to zoom · shift-drag to pan
      </div>
    </Card>
  );
}
