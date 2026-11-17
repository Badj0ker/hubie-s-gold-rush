import { COLS, ROWS, CELLS, type Board, type Cascade, type ClusterWin, type MultiplierGrid, type SymbolId } from "./types";

export const PAY_SYMBOLS: SymbolId[] = ["chest", "coin", "key", "mango", "coconut", "red", "blue", "green", "purple"];
export const BASE_PAY: Record<SymbolId, number> = {
  chest: 1, coin: 0.8, key: 0.6, mango: 0.4, coconut: 0.35, red: 0.3, blue: 0.25, green: 0.2, purple: 0.15, wild: 0,
};
export const MIN_CLUSTER = 5;
export const MAX_MULT = 128;

export function sizeFactor(size: number): number {
  if (size >= 15) return 20;
  if (size >= 13) return 10;
  if (size >= 11) return 7;
  return ({ 5: 1, 6: 1.5, 7: 2, 8: 3, 9: 4, 10: 5 } as Record<number, number>)[size] ?? 0;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function neighbours(i: number): number[] {
  const r = Math.floor(i / COLS), c = i % COLS, out: number[] = [];
  if (r > 0) out.push(i - COLS);
  if (r < ROWS - 1) out.push(i + COLS);
  if (c > 0) out.push(i - 1);
  if (c < COLS - 1) out.push(i + 1);
  return out;
}

/** Orthogonally connected clusters of >= 5; wild substitutes for any pay symbol. */
export function findClusters(board: Board): { symbol: SymbolId; positions: number[] }[] {
  const result: { symbol: SymbolId; positions: number[] }[] = [];
  for (const sym of PAY_SYMBOLS) {
    const seen = new Set<number>();
    for (let i = 0; i < CELLS; i++) {
      if (board[i] !== sym || seen.has(i)) continue;
      const stack = [i], group: number[] = [], local = new Set([i]);
      while (stack.length) {
        const p = stack.pop()!;
        group.push(p);
        if (board[p] === sym) seen.add(p);
        for (const n of neighbours(p)) {
          if (!local.has(n) && (board[n] === sym || board[n] === "wild")) { local.add(n); stack.push(n); }
        }
      }
      if (group.length >= MIN_CLUSTER) result.push({ symbol: sym, positions: group.sort((a, b) => a - b) });
    }
  }
  return result;
}

/** Sugar Rush style: first explosion marks a spot, second makes it x2, then doubles to x128. */
export function bumpMultiplier(v: number): number {
  if (v === 0) return 1;
  if (v === 1) return 2;
  return Math.min(v * 2, MAX_MULT);
}

export function evaluate(board: Board, mults: MultiplierGrid, bet: number) {
  const clusters = findClusters(board);
  const wins: ClusterWin[] = clusters.map(({ symbol, positions }) => {
    const sum = positions.reduce((s, p) => s + (mults[p]! >= 2 ? mults[p]! : 0), 0);
    const multiplier = Math.max(1, sum);
    return { symbol, positions, size: positions.length, multiplier, win: round2(bet * BASE_PAY[symbol] * sizeFactor(positions.length) * multiplier) };
  });
  const removed = [...new Set(wins.flatMap((w) => w.positions))].sort((a, b) => a - b);
  const after = mults.slice();
  for (const p of removed) after[p] = bumpMultiplier(after[p]!);
  return { wins, removed, multipliersAfter: after, cascadeWin: round2(wins.reduce((s, w) => s + w.win, 0)) };
}

/** Gravity: survivors drop, empties at top of each column returned (row-major indices). */
export function applyGravity(board: Board, removed: number[]): { board: (SymbolId | null)[]; empties: number[] } {
  const rm = new Set(removed), out: (SymbolId | null)[] = new Array(CELLS).fill(null), empties: number[] = [];
  for (let c = 0; c < COLS; c++) {
    const keep: SymbolId[] = [];
    for (let r = 0; r < ROWS; r++) { const i = r * COLS + c; if (!rm.has(i)) keep.push(board[i]!); }
    const missing = ROWS - keep.length;
    for (let r = 0; r < ROWS; r++) {
      const i = r * COLS + c;
      if (r < missing) empties.push(i); else out[i] = keep[r - missing]!;
    }
  }
  return { board: out, empties };
}

export type Refill = (partial: (SymbolId | null)[], empties: number[], cascadeIndex: number) => Board;

export function resolveCascades(initial: Board, mults: MultiplierGrid, bet: number, refill: Refill, maxCascades = 30) {
  const cascades: Cascade[] = [];
  let board = initial.slice(), m = mults.slice();
  for (let k = 0; k < maxCascades; k++) {
    const ev = evaluate(board, m, bet);
    if (!ev.wins.length) break;
    const g = applyGravity(board, ev.removed);
    const next = refill(g.board, g.empties, k);
    cascades.push({ board, wins: ev.wins, removed: ev.removed, multipliersBefore: m, multipliersAfter: ev.multipliersAfter, cascadeWin: ev.cascadeWin, nextBoard: next });
    board = next; m = ev.multipliersAfter;
  }
  return { cascades, finalBoard: board, finalMultipliers: m, totalWin: round2(cascades.reduce((s, c) => s + c.cascadeWin, 0)) };
}
