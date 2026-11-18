/** Layered Hubie rig contract (PixiJS + GSAP). Art comes from hubie_rig.zip; the slot engine is untouched. */
export type HubieState = "idle" | "spin" | "win" | "bigwin" | "lose";
export type HubieLayerName =
  | "head" | "hat" | "glasses" | "torso" | "jacket_front"
  | "arm_left_upper" | "arm_left_lower" | "hand_left"
  | "arm_right_upper" | "arm_right_lower" | "hand_right" | "legs" | "feet";
export interface HubieLayerConfig {
  file: string; width: number; height: number;
  pivot: { x: number; y: number }; x: number; y: number; parent: HubieLayerName | null;
}
export interface HubiePivots {
  canvas: { width: number; height: number };
  drawOrder: HubieLayerName[];
  layers: Record<HubieLayerName, HubieLayerConfig>;
}
export interface HubieRig { play(state: HubieState): void; destroy(): void }
