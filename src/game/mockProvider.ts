import { applyGravity, findClusters, PAY_SYMBOLS, resolveCascades, type Refill } from "./engine";
import { CELLS, COLS, type Board, type Cascade, type GameProvider, type MultiplierGrid, type ScenarioId, type SpinResult, type SymbolId } from "./types";

/** Deterministic RNG (mulberry32) so scenarios are reproducible. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
type R = () => number;
const pick = (r: R): SymbolId => (r() < 0.015 ? "wild" : PAY_SYMBOLS[Math.floor(r() * PAY_SYMBOLS.length)]);
const pickPay = (r: R): SymbolId => PAY_SYMBOLS[Math.floor(r() * PAY_SYMBOLS.length)];
const emptyMults = (): MultiplierGrid => new Array(CELLS).fill(0);

/** Fill given cells so the board contains no winning cluster. */
function fillNoWin(partial: (SymbolId | null)[], cells: number[], r: R): Board {
  const b = partial.slice() as (SymbolId | null)[];
  for (const i of cells) {
    for (let t = 0; t < 40; t++) { b[i] = pickPay(r); if (!findClusters(b.map((s) => s ?? ("x" as SymbolId)) as Board).some((c) => c.positions.includes(i))) break; }
  }
  return b as Board;
}
export function noWinBoard(r: R): Board { return fillNoWin(new Array(CELLS).fill(null), [...Array(CELLS).keys()], r); }

const randomRefill = (r: R): Refill => (p, e) => { const b = p.slice(); for (const i of e) b[i] = pick(r); return b as Board; };
const noWinRefill = (r: R): Refill => (p, e) => fillNoWin(p, e, r);
/** Fill every empty cell with one symbol → guaranteed connected win for `chains` cascades. */
const chainRefill = (r: R, chains: number, order: SymbolId[]): Refill => (p, e, k) => {
  if (k >= chains || e.length < 5) return fillNoWin(p, e, r);
  const b = p.slice(); for (const i of e) b[i] = order[k % order.length]; return b as Board;
};
function plant(board: Board, cells: number[], sym: SymbolId): Board { const b = board.slice(); for (const i of cells) b[i] = sym; return b; }
const rc = (r: number, c: number) => r * COLS + c;

export class MockGameProvider implements GameProvider {
  scenario: ScenarioId = "random";
  private r: R;
  private current: SpinResult | null = null;
  private cursor = 0;
  private counter = 0;
  constructor(seed = Date.now()) { this.r = rng(seed); }
  setScenario(s: ScenarioId) { this.scenario = s; }

  getInitialBoard(): Board { return noWinBoard(rng(7)); }
  getBonusPrice(bet: number) { return Math.round(bet * 100 * 100) / 100; }

  private build(bet: number, initial: Board, refill: Refill, mults = emptyMults()): SpinResult {
    const res = resolveCascades(initial, mults, bet, refill);
    this.counter++;
    return { id: `spin-${this.counter}`, bet, initialBoard: initial, initialMultipliers: mults, ...res, bigWin: res.totalWin >= bet * 20, complete: true };
  }

  scenarioSpin(id: ScenarioId, bet: number, seed = 1000 + this.counter): SpinResult {
    const r = rng(seed);
    switch (id) {
      case "A": return this.build(bet, noWinBoard(r), noWinRefill(r));
      case "B": return this.build(bet, plant(noWinBoard(r), [rc(6, 0), rc(6, 1), rc(6, 2), rc(5, 1), rc(6, 3)], "coin"), noWinRefill(r));
      case "C": return this.build(bet, plant(noWinBoard(r), [rc(6, 2), rc(6, 3), rc(6, 4), rc(5, 3), rc(5, 4), rc(4, 3)], "key"), chainRefill(r, 3, ["mango", "red", "chest"]));
      case "D": {
        const start = plant(noWinBoard(r), [rc(5, 1), rc(5, 2), rc(5, 3), rc(5, 4), rc(5, 5), rc(6, 1), rc(6, 3), rc(6, 5)], "blue");
        return this.build(bet, start, chainRefill(r, 7, ["coin", "chest", "key", "mango", "red", "green", "coconut"]));
      }
      case "E": {
        const big = [] as number[];
        for (let row = 2; row < 7; row++) for (let c = 1; c < 6; c++) big.push(rc(row, c));
        return this.build(bet, plant(noWinBoard(r), big, "chest"), noWinRefill(r));
      }
      default: {
        const b: Board = Array.from({ length: CELLS }, () => pick(this.r));
        return this.build(bet, b, randomRefill(this.r));
      }
    }
  }

  spin(bet: number): SpinResult {
    this.current = this.scenarioSpin(this.scenario, bet);
    this.cursor = 0;
    return this.current;
  }
  getNextCascade(): Cascade | null { return this.current?.cascades[this.cursor++] ?? null; }
  getFinalResult(): SpinResult | null { return this.current; }

  /** Gold Rush Spins: 10 free spins, multiplier spots persist across all spins. */
  buyBonus(bet: number): SpinResult[] {
    const out: SpinResult[] = []; let mults = emptyMults();
    for (let s = 0; s < 10; s++) {
      const b: Board = Array.from({ length: CELLS }, () => pick(this.r));
      const res = this.build(bet, b, randomRefill(this.r), mults);
      mults = res.finalMultipliers; out.push(res);
    }
    return out;
  }
}
export { applyGravity };
