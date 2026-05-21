import type { AssemblyStep, BenchConfig } from "./types";
import { formatInches } from "./units";

type StepInputs = {
  config: BenchConfig;
  longApron: number;
  shortApron: number;
  legHeight: number;
};

export function computeSteps(inp: StepInputs): AssemblyStep[] {
  const { config, longApron, shortApron, legHeight } = inp;
  const steps: AssemblyStep[] = [];
  let n = 1;

  steps.push({
    n: n++,
    title: "Verify cut list and lay out parts",
    body:
      `Cross-check every cut against the cut list before any wood meets a blade. ` +
      `Label each piece with its part code (P1, P2, …) on masking tape — it will save ` +
      `you 20 minutes of confusion during glue-up.`,
    tools: ["Tape measure", "Pencil"],
  });

  steps.push({
    n: n++,
    title: "Cut lumber to length",
    body:
      `Crosscut all leg, apron, and stretcher pieces per the cut list. Cut legs first ` +
      `and stack them — they must be exactly equal length (${formatInches(legHeight)}) or the bench will rock. ` +
      `Aprons: 2 long @ ${formatInches(longApron)}, 2 short @ ${formatInches(shortApron)}.`,
    tools: ["Miter saw or circular saw", "Square"],
  });

  steps.push({
    n: n++,
    title: "Break down sheet goods",
    body:
      `Use a straight-edge guide and circular saw (or a track saw) to break the top and ` +
      `shelf sheets to rough size, then trim to final dimension. Cut with the good face down ` +
      `to minimize tear-out. Always cut on a sacrificial sheet of foam or 2x4s laid on the floor.`,
    tools: ["Circular saw", "Straight-edge guide"],
  });

  if (config.joinery === "pocket") {
    steps.push({
      n: n++,
      title: "Drill pocket holes in aprons + stretchers",
      body:
        `Set the jig for 1-1/2 stock. Drill 2 pockets on each end of every long apron, ` +
        `short apron, shelf rail, and stretcher — pockets face inward (hidden side). ` +
        `Mark each pair with the part code so you don't lose track.`,
      fasteners: 'Will use 2-1/2" pocket screws',
      tools: ["Pocket-hole jig", "Drill"],
    });
  } else if (config.joinery === "lag") {
    steps.push({
      n: n++,
      title: "Drill lag-bolt holes",
      body:
        `Through each leg, drill 2 clearance holes (7/16") per apron, ${formatInches(legHeight * 0.25)} and ` +
        `${formatInches(legHeight * 0.75)} from the top of the apron. Counter-bore 1" deep ` +
        `with a 1" Forstner so the lag head sits flush. Pre-drill the apron end (5/16") to depth.`,
      fasteners: 'Will use 3/8" x 4" lags with washers',
      tools: ["Drill", "Forstner 1\"", "5/16 and 7/16 bits"],
    });
  } else {
    steps.push({
      n: n++,
      title: "Cut mortises in legs",
      body:
        `Mark mortise positions on each leg: 4 mortises per leg (2 faces × 2 aprons). ` +
        `Mortises are 1/2 wide × 3 deep × ${formatInches(2.5)} tall, centered on the leg face. ` +
        `Plunge-rout or chop with chisel, then square the corners.`,
      tools: ["Mortising chisel or plunge router", "Sharp chisel"],
    });
    steps.push({
      n: n++,
      title: "Cut tenons on apron ends",
      body:
        `On each end of every apron, cut a 1/2 × ${formatInches(2.5)} × 2-3/4 tenon. ` +
        `Test-fit each joint dry — tenon should slide in with hand pressure, no hammer.`,
      tools: ["Tenon saw or table saw"],
    });
  }

  steps.push({
    n: n++,
    title: "Dry-assemble the base",
    body:
      `Without glue or fasteners, stand the four legs up and join two long aprons + two ` +
      `short aprons to form the rectangle. Check diagonals — they must be equal within ` +
      `1/16. If not, the cuts are not square; investigate before glue.`,
    tools: ["Clamps", "Tape measure"],
  });

  steps.push({
    n: n++,
    title: "Glue + fasten the base frame",
    body:
      `Apply wood glue to every joint surface. ${
        config.joinery === "pocket"
          ? "Clamp each joint and drive pocket screws — work one corner at a time."
          : config.joinery === "lag"
          ? "Clamp the joint, then drive lags fully home with a ratchet."
          : "Tap tenons home with a dead-blow mallet, then optionally draw-bore each joint with a 3/8 peg."
      } Re-check diagonals before the glue sets. Wipe squeeze-out with a damp rag.`,
    tools: ["Clamps", "Drill or ratchet", "Damp rag"],
  });

  if (config.includeShelf) {
    steps.push({
      n: n++,
      title: "Attach lower shelf stretchers",
      body:
        `Mark the shelf height (${formatInches(config.shelfHeight)} from the floor) on each leg. ` +
        `Attach the 4 shelf rails using the same joinery method. Verify the rectangle is square.`,
      tools: ["Square", "Drill"],
    });
  }

  if (config.middleStretcher) {
    steps.push({
      n: n++,
      title: "Install center stretcher",
      body:
        `Measure the midpoint of the long aprons and attach the center stretcher front-to-back ` +
        `under the top. This prevents the top from sagging on long spans.`,
    });
  }

  if (config.diagonalBraces) {
    steps.push({
      n: n++,
      title: "Add diagonal braces",
      body:
        `On each short side, cut a brace at 45° spanning from the upper apron near one leg ` +
        `down to the opposite leg. Pocket-screw or glue-and-screw in place. Resist tipping.`,
    });
  }

  steps.push({
    n: n++,
    title: "Sand all components before top install",
    body:
      `Start with 80 grit and work up to 220. Pay special attention to the edges of the top ` +
      `and any visible faces. It is much easier to sand pieces before they are fully assembled.`,
    tools: ["Random-orbit sander"],
  });

  if (config.doubledTop) {
    steps.push({
      n: n++,
      title: "Laminate the doubled top",
      body:
        `Spread an even film of glue on the top face of the bottom sheet. Stack the second sheet ` +
        `on top, align edges, and clamp every 6-8 inches around the perimeter. Drive screws from ` +
        `the bottom face up into the second sheet (do NOT poke through the top!) every 12 in the field.`,
      fasteners: '1-1/4" wood screws from below',
      tools: ["Roller", "Clamps"],
    });
  }

  if (config.toolWell) {
    steps.push({
      n: n++,
      title: "Cut + frame the tool well",
      body:
        `Mark a strip ${formatInches(config.toolWellWidth)} wide running the full length of the top, ` +
        `set back ${formatInches(1)} from the back edge. Cut out with a jigsaw or router. ` +
        `Frame the underside with strips of leftover apron stock so tools cannot fall through.`,
    });
  }

  steps.push({
    n: n++,
    title: "Mount the top to the base",
    body:
      `Flip the base upside down on a moving blanket. Center the top (face down) on the base — ` +
      `overhang ${formatInches(config.overhang)} on every side. Drill pilot holes through the ` +
      `aprons up into the top, then drive 1-1/4 screws (do not penetrate the top face!).`,
    fasteners: '1-1/4" wood screws through aprons',
    tools: ["Drill", "Tape measure"],
  });

  if (config.includeShelf) {
    steps.push({
      n: n++,
      title: "Install the lower shelf",
      body:
        `Drop the shelf sheet onto the four shelf rails. Pre-drill clearance holes and ` +
        `secure with 1-1/4 screws at each corner and mid-span.`,
    });
  }

  if (config.pegboard) {
    steps.push({
      n: n++,
      title: "Mount pegboard back",
      body:
        `Cut a frame of 2x2 (or rip from 2x4) to act as a back-frame above the bench. ` +
        `Bolt it to the back legs. Attach the pegboard to the frame using 1-1/4 screws + 1/2 ` +
        `nylon spacers so hooks can be inserted from behind.`,
      fasteners: "1-1/4 screws + 1/2 spacers",
    });
  }

  if (config.casters) {
    steps.push({
      n: n++,
      title: "Mount casters",
      body:
        `Flip the bench upside down. Position each caster plate flush to the leg bottom. ` +
        `Mark and pre-drill 4 holes per caster, then drive caster screws home. Verify all four ` +
        `locks engage before standing the bench up.`,
      fasteners: '#12 x 1-1/2" caster screws',
    });
  }

  steps.push({
    n: n++,
    title: "Final sanding + dust removal",
    body:
      `Knock down any high spots with 220 grit, ease all sharp edges with a sanding block, ` +
      `then vacuum and wipe everything with a tack cloth. Finish will telegraph every speck of dust.`,
    tools: ["Sander", "Vacuum", "Tack cloth"],
  });

  if (config.edgeBand) {
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
      `Brush or wipe on poly. Let cure per the can (usually 4-6h between coats). ` +
      `Lightly sand with 320 between coats. The final coat goes on the TOP only — that's the ` +
      `surface that takes punishment. Inspect under raking light for missed spots.`,
    tools: ["Brush", "320 sandpaper", "Tack cloth"],
  });

  steps.push({
    n: n++,
    title: "Stand it up, level it, load it",
    body:
      `Stand the bench in its final spot. Check level — if rocking, identify the high leg and ` +
      `shim with a thin disc of UHMW or trim 1/32 off the long leg. ${
        config.casters ? "Engage all four caster locks." : ""
      } Put tools on it. Build something good.`,
  });

  return steps;
}
