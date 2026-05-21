// First-Fit Decreasing bin-pack for linear lumber.
// Returns each stock board with the cuts placed on it so we can draw it.

export type LumberCutInput = {
  len: number;
  partCode: string;
  purpose: string;
};

export type LumberBoard = {
  stockLen: number;
  cuts: LumberCutInput[];
  kerfTotal: number;
  wasteLen: number;
};

export function packLumberBoards(
  cutsRaw: LumberCutInput[],
  stockLengths: number[],
  kerf: number,
  preference: number | "any",
): { boards: LumberBoard[]; oversize: LumberCutInput[] } {
  const cuts = [...cutsRaw].sort((a, b) => b.len - a.len);
  const longest = Math.max(...stockLengths);
  const sortedShortFirst = [...stockLengths].sort((a, b) => a - b);
  const candidateLengths: number[] =
    preference === "any"
      ? sortedShortFirst
      : [preference, ...sortedShortFirst.filter((l) => l !== preference)];

  const boards: LumberBoard[] = [];
  const oversize: LumberCutInput[] = [];

  for (const cut of cuts) {
    if (cut.len > longest) {
      oversize.push(cut);
      continue;
    }

    let placed = false;
    for (const board of boards) {
      const needKerf = board.cuts.length > 0 ? kerf : 0;
      const used =
        board.cuts.reduce((s, c) => s + c.len, 0) +
        Math.max(0, board.cuts.length - 1) * kerf;
      if (board.stockLen - used >= cut.len + needKerf) {
        board.cuts.push(cut);
        board.kerfTotal = Math.max(0, board.cuts.length - 1) * kerf;
        board.wasteLen =
          board.stockLen -
          board.cuts.reduce((s, c) => s + c.len, 0) -
          board.kerfTotal;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const stockLen = candidateLengths.find((l) => l >= cut.len) ?? longest;
      boards.push({
        stockLen,
        cuts: [cut],
        kerfTotal: 0,
        wasteLen: stockLen - cut.len,
      });
    }
  }

  return { boards, oversize };
}
