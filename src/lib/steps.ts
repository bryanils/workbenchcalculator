import type { AssemblyStep, BenchConfig } from "./types";
import type { DerivedGeometry } from "./derive";
import { formatInches } from "./units";

type StepInputs = {
  config: BenchConfig;
  geometry: DerivedGeometry;
};

export function computeSteps(inp: StepInputs): AssemblyStep[] {
  const { config, geometry } = inp;
  const steps: AssemblyStep[] = [];
  let n = 1;

  steps.push({
    n: n++,
    title: "Verify cut list and label every part",
    body:
      `Cross-check every cut against the cut list before any wood meets a blade. ` +
      `Label each piece with its part code (P1, P2, …) on masking tape — it saves ` +
      `you 20 minutes of confusion during glue-up. ` +
      (config.knockdown
        ? "Knockdown benches especially: mark which end of each apron mates with which leg before you cut joinery."
        : ""),
    tools: ["Tape measure", "Pencil"],
  });

  // ----- Top construction first or last? -----
  // For laminated / slab tops, lam first so it can cure while you build the base.
  if (
    config.topConstruction === "laminated-2x" ||
    config.topConstruction === "slab"
  ) {
    steps.push({
      n: n++,
      title:
        config.topConstruction === "slab"
          ? `Glue up the slab top (~${formatInches(geometry.topThickness)} thick)`
          : `Laminate the top (${config.topLamCount} × ${getLamLabel(config)})`,
      body:
        config.topConstruction === "slab"
          ? `Joint one edge of every board straight and square. Apply glue to mating faces, ` +
            `stack on edge, and clamp every 8" along the length. Work in pairs (glue two, then glue ` +
            `pairs to pairs) so you only fight one glue line at a time. Let cure 24 hours. ` +
            `Flatten with a hand-plane or wide jointer to a final thickness of ~${formatInches(geometry.topThickness)}.`
          : `Joint mating edges/faces. Apply glue to every glue surface, clamp tight, and check ` +
            `the assembly stays flat (no twist) while curing. Once cured, plane or sand the top + bottom flat.`,
      tools: ["Clamps (lots)", "Hand plane or jointer", "Glue"],
    });
  }

  steps.push({
    n: n++,
    title: "Cut legs to length and mark joinery positions",
    body:
      `Cross-cut all four legs to exactly ${formatInches(geometry.legCutLength)}. Stack them and ` +
      `verify they are equal within 1/64" — if they aren't, the bench will rock. ` +
      (config.legSplayDeg > 0
        ? `Then mark a ${config.legSplayDeg}° splay angle on the TOP of each leg (cut on the bandsaw ` +
          `or by hand with a backsaw — these angles must match exactly).`
        : ""),
    tools: ["Miter saw or circular saw", "Square", "Bevel gauge"],
  });

  steps.push({
    n: n++,
    title: "Cut aprons and stretchers to length",
    body:
      `Aprons: 2 long @ ${formatInches(geometry.insideLongTop)}, 2 short @ ${formatInches(geometry.insideShortTop)}. ` +
      (config.stretchers.floorStretchers
        ? `Floor stretchers: 2 long @ ${formatInches(geometry.insideLongFloor)}, 2 short @ ${formatInches(geometry.insideShortFloor)}. `
        : "") +
      (config.stretchers.centerStretcher
        ? `Center stretcher: 1 @ ${formatInches(geometry.insideShortTop)}. `
        : "") +
      "Cut every piece in matched pairs so any length error is mirrored, not cumulative.",
    tools: ["Miter saw", "Stop block"],
  });

  // ----- Joinery step varies by joinery type -----
  if (config.joinery === "pocket") {
    steps.push({
      n: n++,
      title: "Drill pocket holes — aprons + stretchers",
      body:
        `Set the jig for 1-1/2 stock. Drill 2 pockets at each end of every apron and stretcher. ` +
        `Pockets always face the INSIDE of the bench so they're hidden once assembled. ` +
        `Mark each pair with its part code so they don't get mixed up.`,
      fasteners: '2-1/2" pocket screws',
      tools: ["Pocket-hole jig", "Drill"],
    });
  } else if (config.joinery === "lag") {
    steps.push({
      n: n++,
      title: "Drill lag-bolt joinery",
      body:
        `Each apron joint gets 2 lags driven from outside the leg into the apron end. ` +
        `Drill 7/16" clearance hole through the leg, counter-bore 1" deep with a 1" Forstner so ` +
        `the lag head sits flush, then pre-drill the apron end (5/16" pilot) to 3" depth.` +
        (config.knockdown
          ? " Knockdown variant: use threaded inserts in the apron ends and 3/8\" cap screws so the joint can be repeatedly disassembled without stripping."
          : ""),
      fasteners: config.knockdown
        ? '3/8" x 16 cap screws + threaded inserts'
        : '3/8" x 4" lag bolts + washers',
      tools: ["Drill", '1" Forstner', "5/16 + 7/16 bits"],
    });
  } else {
    // mortise
    steps.push({
      n: n++,
      title: "Cut mortises in legs",
      body:
        `Mark mortise positions on each leg: 2 mortises per leg face (long apron + short apron). ` +
        `Mortises are 1/2" wide × 3" deep × ${formatInches(2.5)} tall, centered on the leg face. ` +
        `Drill out waste with a 1/2" Forstner, then chop sides square with a sharp chisel. ` +
        (config.legSplayDeg > 0
          ? `For the splayed Moravian-style joint, mark the mortise angle off the top of the leg using a ${config.legSplayDeg}° gauge — the mortise goes IN at the splay angle, not perpendicular.`
          : ""),
      tools: ["1/2 Forstner", "Mortising chisel", "Sharp chisel"],
    });
    steps.push({
      n: n++,
      title: "Cut tenons on apron + stretcher ends",
      body:
        `On each end of every apron and stretcher cut a 1/2 × ${formatInches(2.5)} × 2-3/4" tenon. ` +
        `Test-fit each joint dry — tenon should slide in with hand pressure, no hammer. ` +
        (config.knockdown
          ? `Cut a 3/8" wedge-key mortise THROUGH each long-stretcher tenon, ` +
            `3/16" closer to the shoulder than the leg face — that's what pulls the joint tight.`
          : ""),
      tools: ["Tenon saw or table saw"],
    });
    if (config.knockdown) {
      steps.push({
        n: n++,
        title: "Cut wedge keys (knockdown joinery)",
        body:
          `Make tapered keys from a hardwood scrap: 3/8" thick × 8-1/2" long, tapering from ` +
          `2-1/8" wide down to 1-1/2". You'll have one per long-stretcher tenon (4 total). ` +
          `Tap them in with a mallet — they're what holds the bench together; no glue.`,
        tools: ["Bandsaw", "Block plane"],
      });
    }
  }

  // ----- Dry-fit -----
  steps.push({
    n: n++,
    title: "Dry-assemble the end pairs",
    body:
      `Without glue, join a long leg pair with its short apron + floor stretcher to form a "ladder" ` +
      `(an end frame). Verify the legs are parallel and the frame is square (diagonals equal within 1/16"). ` +
      `Repeat for the other end. Fix any joint that requires force here — you don't want to find ` +
      `out during glue-up.`,
    tools: ["Clamps", "Tape measure", "Framing square"],
  });

  // ----- Glue up end frames -----
  steps.push({
    n: n++,
    title:
      config.knockdown
        ? "Bolt up end frames + paint reference marks"
        : "Glue and fasten the end frames",
    body: config.knockdown
      ? `Bolt each end-frame together with the knockdown hardware. Snug, don't crank — you'll ` +
        `back these off again later. Mark a reference line across each joint so you know orientation ` +
        `when you knock it apart for transport.`
      : `Apply glue to every joint surface. Clamp the end frame, drive fasteners, and check ` +
        `the frame is square AGAIN before glue sets. Wipe squeeze-out with a damp rag. ` +
        `Repeat for the second end frame.`,
    tools: config.knockdown ? ["Ratchet 9/16"] : ["Clamps", "Drill or ratchet", "Damp rag"],
  });

  // ----- Connect ends with long stretchers + aprons -----
  steps.push({
    n: n++,
    title: "Connect end frames with long aprons + stretchers",
    body:
      (config.knockdown
        ? `Stand both end frames upright in their final positions. Slip the long aprons into place and ` +
          `bolt them home. `
        : `Lay one end frame on the floor. Glue and clamp the long aprons + long floor stretchers in place, ` +
          `then drop the second end frame onto the protruding tenons / apron ends. Clamp the whole assembly square. `) +
      (config.stretchers.centerStretcher
        ? `Install the center stretcher under the top now, centered between the long aprons. `
        : "") +
      `Re-check the base is square in every direction before glue cures.`,
    tools: ["Clamps", "Dead-blow mallet", "Square"],
  });

  if (
    config.stretchers.lowerShelf &&
    !config.stretchers.floorStretchers
  ) {
    steps.push({
      n: n++,
      title: "Install shelf rails",
      body:
        `Mark shelf height (${formatInches(config.stretchers.shelfHeight)} off the floor) on each leg. ` +
        `Attach the 4 shelf rails using the same joinery method as the aprons.`,
      tools: ["Square", "Drill"],
    });
  }

  if (config.stretchers.diagonalBraces && !config.stretchers.floorStretchers) {
    steps.push({
      n: n++,
      title: "Add diagonal corner braces",
      body:
        `On each end, cut a brace at 45° spanning from inside-top of one leg down to inside-bottom of the ` +
        `other. Pocket-screw or glue-and-screw in place. These resist racking when you can't put in floor stretchers.`,
    });
  }

  // ----- Top assembly -----
  steps.push({
    n: n++,
    title: "Sand or plane the top flat",
    body:
      config.topConstruction === "single-sheet"
        ? `Ease the top edges with a 1/8" roundover (or hand plane). 80 → 120 → 220 grit on faces.`
        : config.topConstruction === "doubled-sheet"
          ? `Stack the two top sheets, glue the mating faces, clamp every 8", then screw from below ` +
            `into the upper sheet — DO NOT poke through the top face. Let cure, then sand 80 → 120 → 220.`
          : `Hand-plane or belt-sand the top flat. Check flatness with a long straight-edge in 6 directions. ` +
            `Final sand 80 → 120 → 220.`,
    tools: ["Random-orbit sander", "Hand plane", "Straight-edge"],
  });

  if (config.dogHoles) {
    const count = Math.max(
      4,
      Math.floor((config.topLength - 8) / config.dogHoleSpacing) + 1,
    );
    steps.push({
      n: n++,
      title: `Bore ${count} dog holes`,
      body:
        `Mark a line ${formatInches(2)} back from the front edge of the top. Mark dog-hole centers ` +
        `every ${formatInches(config.dogHoleSpacing)} along that line. Bore 3/4" Ø straight through with a ` +
        `Forstner bit, drilling from the top face into a sacrificial backer to avoid blowout.`,
      tools: ['3/4" Forstner', "Backer board", "Drill press (preferred)"],
    });
  }

  steps.push({
    n: n++,
    title: "Mount the top to the base",
    body:
      (config.knockdown
        ? `Drop the top onto the base. Bolt down through the top into the upper aprons (or use ` +
          `figure-8 fasteners if you want the top to float for wood movement). `
        : `Flip the base upside down on a moving blanket. Center the top (face down) on the base — ` +
          `overhang ${formatInches(config.overhangSide)} on each end and ${formatInches(config.overhangFront)} on the front. ` +
          `Drill pilot holes through the aprons up into the top, then drive 1-1/4" screws (don't poke through the top face!). `) +
      `For laminated / slab tops, use elongated screw holes or table-top fasteners to allow wood movement.`,
    fasteners: '1-1/4" wood screws or figure-8 table fasteners',
    tools: ["Drill", "Tape measure"],
  });

  if (config.stretchers.lowerShelf) {
    steps.push({
      n: n++,
      title: "Drop in the lower shelf",
      body:
        `Set the shelf sheet onto the shelf rails (or floor stretchers). Pre-drill and ` +
        `secure with 1-1/4" screws at each corner and mid-span.`,
    });
  }

  if (config.vise !== "none") {
    steps.push({
      n: n++,
      title: `Mount the ${viseName(config.vise)}`,
      body:
        viseInstructions(config.vise) +
        " Test the vise opens and closes smoothly before you finish the bench — fixing it after finish is on is much worse.",
      tools: ["Drill", "Spade or Forstner bits", "Wrench"],
    });
  }

  if (config.pegboard) {
    steps.push({
      n: n++,
      title: "Mount pegboard back",
      body:
        `Rip a frame of 2x2 from 2x4 stock. Bolt it to the back legs above the top. ` +
        `Attach the pegboard to the frame using 1-1/4" screws with 1/2" nylon spacers so hooks ` +
        `can be inserted from behind.`,
      fasteners: "1-1/4 screws + 1/2 nylon spacers",
    });
  }

  if (config.casters) {
    steps.push({
      n: n++,
      title: "Mount locking casters",
      body:
        `Flip the bench upside down. Position each caster plate flush to the leg bottom. ` +
        `Mark and pre-drill 4 holes per caster, drive caster screws home. Verify all four ` +
        `locks engage before standing the bench up — a bench that rolls when you don't want it to ` +
        `is dangerous.`,
      fasteners: '#12 x 1-1/2" caster screws',
    });
  }

  steps.push({
    n: n++,
    title: "Final sanding + dust removal",
    body:
      `Knock down high spots with 220 grit, ease all sharp edges with a sanding block, ` +
      `vacuum and wipe everything with a tack cloth. Finish telegraphs every speck of dust.`,
    tools: ["Sander", "Vacuum", "Tack cloth"],
  });

  if (config.edgeBand && config.topConstruction !== "slab" && config.topConstruction !== "laminated-2x") {
    steps.push({
      n: n++,
      title: "Apply iron-on edge banding to top",
      body:
        `Heat a household iron to "cotton". Press banding onto each exposed plywood edge of the top. ` +
        `Trim flush with a sharp utility knife (or a flush-trim bit). Sand the seam smooth.`,
    });
  }

  steps.push({
    n: n++,
    title: `Apply ${config.finishCoats} coat${config.finishCoats === 1 ? "" : "s"} of finish`,
    body:
      `Brush or wipe on poly (or BLO+wax for a hand-tool bench — many hand-tool woodworkers prefer ` +
      `a thin, frictiony finish that doesn't let work slip). Let cure per the can. Lightly sand with ` +
      `320 between coats. The final coat goes on the TOP only — that's the surface that takes punishment.`,
    tools: ["Brush", "320 sandpaper", "Tack cloth"],
  });

  steps.push({
    n: n++,
    title: "Stand it up, level it, load it",
    body:
      `Stand the bench in its final spot. Check level — if rocking, identify the high leg and ` +
      `shim with a thin disc of UHMW or trim 1/32 off the long leg. ` +
      (config.casters ? "Engage all four caster locks. " : "") +
      "Put tools on it. Build something good.",
  });

  return steps;
}

function getLamLabel(c: BenchConfig): string {
  // helper for the lamination step title
  if (c.topConstruction === "laminated-2x") {
    return c.topMaterialId;
  }
  return "boards";
}

function viseName(v: BenchConfig["vise"]) {
  switch (v) {
    case "front-face-vise":
      return "front face vise";
    case "leg-vise":
      return "leg vise";
    case "tail-vise":
      return "tail vise";
    case "quick-release-9in":
      return 'quick-release 9" vise';
    case "pipe-clamp-vise":
      return "pipe-clamp vise";
    default:
      return "vise";
  }
}

function viseInstructions(v: BenchConfig["vise"]) {
  switch (v) {
    case "front-face-vise":
      return `Mount the vise body to the front face of the bench, flush with the top edge. The fixed jaw is the front apron itself — line up the screw center so the jaws close flush.`;
    case "leg-vise":
      return `Bore a 2-5/8" hole through the front-left leg for the screw. Mortise the parallel guide slot through the leg about 18" below the top. Attach the screw nut to the back of the leg, glue the chop to the screw garter.`;
    case "tail-vise":
      return `Cut the slot for the wagon-vise dog through the right end of the top. Mount the screw + bearing block to the underside of the top. Verify the dog moves smoothly through its full travel.`;
    case "quick-release-9in":
      return `Bolt the vise body to the underside of the top so the front jaw sits flush with the front edge.`;
    case "pipe-clamp-vise":
      return `Run 3/4" black pipe through the front apron. Mount the fixed end (head) to one apron, the clamp end through a sliding jaw.`;
    default:
      return "";
  }
}
