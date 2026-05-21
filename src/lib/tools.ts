import type { BenchConfig, ToolItem } from "./types";

export function computeTools(config: BenchConfig): ToolItem[] {
  const tools: ToolItem[] = [
    { name: "Tape measure", required: true },
    { name: "Carpenter's square", required: true },
    { name: "Pencil + marking knife", required: true },
    { name: "Safety glasses + hearing protection", required: true },
    { name: "Circular saw or miter saw", required: true, note: "Crosscut lumber and trim sheet" },
    { name: "Drill / driver", required: true },
    { name: "Drill bit set", required: true, note: "Include countersink bits" },
    { name: "Clamps (at least 4)", required: true, note: "Bar or pipe clamps; 24+ inch span" },
    { name: "Sander (random orbit)", required: true },
    { name: "Bar level or torpedo level", required: true },
  ];

  if (config.joinery === "pocket") {
    tools.push({
      name: "Kreg pocket-hole jig (or equivalent)",
      required: true,
      note: "Set for 1-1/2 stock; comes with step bit",
    });
  }
  if (config.joinery === "lag") {
    tools.push({
      name: "Ratchet + 9/16 socket",
      required: true,
      note: "Drive lag bolts",
    });
    tools.push({
      name: "Forstner bit 1\"",
      required: false,
      note: "For counter-boring lag heads",
    });
  }
  if (config.joinery === "mortise") {
    tools.push({
      name: "Mortising chisel or plunge router",
      required: true,
    });
    tools.push({
      name: "Tenon saw or table saw with tenon jig",
      required: true,
    });
    tools.push({
      name: "Sharp 1/4 and 1/2 chisels",
      required: true,
    });
  }
  if (config.toolWell) {
    tools.push({ name: "Jigsaw or router (for tool well)", required: true });
  }
  if (config.pegboard) {
    tools.push({ name: "Jigsaw or hole saw (optional for cable pass-through)", required: false });
  }
  if (config.casters) {
    tools.push({ name: "Helper to flip the bench during caster mount", required: false });
  }
  if (config.edgeBand) {
    tools.push({ name: "Household iron + utility knife", required: true, note: "Apply iron-on banding" });
  }

  tools.push({ name: "Paint brush or foam applicator", required: true, note: "Apply finish" });
  tools.push({ name: "Tack cloth or microfiber", required: true, note: "Dust between sanding/finishing" });

  return tools;
}
