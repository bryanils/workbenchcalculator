// Built-in design presets. Each preset is just a SimpleInputs — a style
// selection plus the three primary dimensions. The style profile fills in
// every other structural choice. This is intentionally tiny: the realism
// lives in styles.ts.

import type { SimpleInputs } from "./types";
import type { BenchStyleId } from "./styles";
import { STYLE_PROFILES } from "./styles";

export type Preset = {
  id: BenchStyleId;
  name: string;
  description: string;
  input: SimpleInputs;
};

// Build one Preset per real-world style, using each style's defaults.
export const PRESETS: Preset[] = STYLE_PROFILES.map((s) => ({
  id: s.id,
  name: s.name,
  description: s.blurb,
  input: {
    styleId: s.id,
    topLength: s.defaultLength,
    topDepth: s.defaultDepth,
    totalHeight: s.defaultHeight,
  },
}));
