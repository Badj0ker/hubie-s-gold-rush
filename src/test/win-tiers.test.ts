import { describe, it, expect } from "vitest";
import { tierFor } from "@/game/win/winTiers";
describe("win celebration tiers", () => {
  it("picks tier by win/bet", () => {
    expect(tierFor(9, 1)).toBeNull();
    expect(tierFor(10, 1)?.id).toBe("win");
    expect(tierFor(20, 1)?.id).toBe("big_win");
    expect(tierFor(50, 1)?.id).toBe("superb_win");
    expect(tierFor(200, 1)?.id).toBe("max_win");
  });
});
