/** Win celebration tiers (presentation only — game math stays in engine/provider). */
export type WinTierId = "win" | "big_win" | "superb_win" | "max_win";
export interface WinTier { id: WinTierId; label: string; minX: number; /** number box inside the 1024x768 panel */ box: { x: number; y: number; w: number; h: number } }
export const PANEL_SIZE = { w: 1024, h: 768 };
export const WIN_TIERS: WinTier[] = [
  { id: "win", label: "WIN", minX: 10, box: { x: 100, y: 375, w: 680, h: 200 } },
  { id: "big_win", label: "BIG WIN", minX: 20, box: { x: 70, y: 365, w: 665, h: 210 } },
  { id: "superb_win", label: "SUPERB WIN", minX: 50, box: { x: 180, y: 380, w: 660, h: 245 } },
  { id: "max_win", label: "MAX WIN", minX: 200, box: { x: 190, y: 425, w: 665, h: 200 } },
];
/** Highest tier reached for a win of `amount` at `bet`, or null below the first tier. */
export function tierFor(amount: number, bet: number): WinTier | null {
  let t: WinTier | null = null;
  for (const x of WIN_TIERS) if (amount >= x.minX * bet) t = x;
  return t;
}
export const GLYPHS: Record<string, { x: number; y: number; w: number; h: number }> = {"0": {"x": 56, "y": 83, "w": 208, "h": 243}, "1": {"x": 316, "y": 85, "w": 158, "h": 239}, "2": {"x": 523, "y": 82, "w": 194, "h": 242}, "3": {"x": 769, "y": 83, "w": 199, "h": 242}, "4": {"x": 49, "y": 392, "w": 207, "h": 238}, "5": {"x": 293, "y": 394, "w": 195, "h": 236}, "6": {"x": 526, "y": 391, "w": 206, "h": 243}, "7": {"x": 777, "y": 394, "w": 197, "h": 236}, "8": {"x": 51, "y": 693, "w": 204, "h": 239}, "9": {"x": 297, "y": 693, "w": 200, "h": 239}, ".": {"x": 574, "y": 809, "w": 115, "h": 116}, "x": {"x": 758, "y": 730, "w": 212, "h": 197}};
export const FONT_SHEET_SIZE = 1024;
