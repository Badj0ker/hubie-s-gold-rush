export const COLS = 7;
export const ROWS = 7;
export const CELLS = COLS * ROWS;

export type SymbolId =
  | "chest" | "coin" | "key" | "mango" | "coconut"
  | "red" | "blue" | "green" | "purple" | "wild";

/** Board is column-major-free flat array: index = row * COLS + col (row 0 = top). */
export type Board = SymbolId[];
/** 0 = unmarked, 1 = marked (no value yet), >=2 active multiplier. */
export type MultiplierGrid = number[];

export interface ClusterWin {
  symbol: SymbolId;
  positions: number[];
  size: number;
  multiplier: number;
  win: number;
}

export interface Cascade {
  board: Board;
  wins: ClusterWin[];
  removed: number[];
  multipliersBefore: MultiplierGrid;
  multipliersAfter: MultiplierGrid;
  cascadeWin: number;
  nextBoard: Board;
}

export interface SpinResult {
  id: string;
  bet: number;
  initialBoard: Board;
  initialMultipliers: MultiplierGrid;
  cascades: Cascade[];
  finalBoard: Board;
  finalMultipliers: MultiplierGrid;
  totalWin: number;
  bigWin: boolean;
  complete: true;
}

export type ScenarioId = "random" | "A" | "B" | "C" | "D" | "E";

export interface GameProvider {
  getInitialBoard(): Board;
  spin(bet: number): SpinResult;
  getNextCascade(): Cascade | null;
  getFinalResult(): SpinResult | null;
  getBonusPrice(bet: number): number;
  buyBonus(bet: number): SpinResult[];
}
