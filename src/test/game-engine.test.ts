import { describe, it, expect } from "vitest";
import { findClusters, bumpMultiplier, evaluate } from "@/game/engine";
import { MockGameProvider } from "@/game/mockProvider";
import { CELLS, type Board } from "@/game/types";

const p = new MockGameProvider(1);
describe("cluster rules", () => {
  it("needs 5 orthogonally connected symbols", () => {
    const b = Array.from({ length: CELLS }, (_, i) => (["red", "blue", "green", "purple"] as const)[((i % 7) + 2 * Math.floor(i / 7)) % 4]) as Board;
    expect(findClusters(b)).toHaveLength(0);
    const four = b.slice(); [0, 1, 2, 3].forEach((i) => (four[i] = "chest"));
    expect(findClusters(four)).toHaveLength(0);
    const five = four.slice(); five[4] = "chest";
    expect(findClusters(five)[0].size ?? findClusters(five)[0].positions.length).toBe(5);
    const diag = b.slice(); [0, 8, 16, 24, 32].forEach((i) => (diag[i] = "chest"));
    expect(findClusters(diag)).toHaveLength(0);
  });
  it("multiplier spots go mark → x2 → doubling up to x128", () => {
    expect([0, 1, 2, 64, 128].map(bumpMultiplier)).toEqual([1, 2, 4, 128, 128]);
  });
  it("cluster win multiplies by sum of active spots", () => {
    const b = Array.from({ length: CELLS }, (_, i) => (["red", "blue", "green", "purple"] as const)[((i % 7) + 2 * Math.floor(i / 7)) % 4]) as Board;
    [0, 1, 2, 3, 4].forEach((i) => (b[i] = "chest"));
    const m = new Array(CELLS).fill(0); m[0] = 2; m[1] = 4;
    expect(evaluate(b, m, 1).wins[0].win).toBe(6); // 1 * 1 * (2+4)
  });
});
describe("demo scenarios", () => {
  it("A: no win", () => { const r = p.scenarioSpin("A", 1); expect(r.cascades).toHaveLength(0); expect(r.totalWin).toBe(0); });
  it("B: one cluster, one cascade", () => { const r = p.scenarioSpin("B", 1); expect(r.cascades).toHaveLength(1); expect(r.cascades[0].wins).toHaveLength(1); });
  it("C: multiple cascades", () => { expect(p.scenarioSpin("C", 1).cascades.length).toBeGreaterThanOrEqual(3); });
  it("D: several multipliers and big win", () => {
    const r = p.scenarioSpin("D", 1);
    expect(r.finalMultipliers.filter((v) => v >= 2).length).toBeGreaterThanOrEqual(3);
    expect(r.totalWin).toBeGreaterThanOrEqual(50);
  });
  it("E: large cluster with celebration", () => {
    const r = p.scenarioSpin("E", 1);
    expect(r.cascades[0].wins[0].size).toBeGreaterThanOrEqual(15); expect(r.bigWin).toBe(true);
  });
});
