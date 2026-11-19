import { useEffect, useRef, useState } from "react";
import winP from "@/assets/win/hubie_panel_win.png.asset.json";
import bigP from "@/assets/win/hubie_panel_big_win.png.asset.json";
import superbP from "@/assets/win/hubie_panel_superb_win.png.asset.json";
import maxP from "@/assets/win/hubie_panel_max_win.png.asset.json";
import fontSheet from "@/assets/win/hubie_gold_bitmap_font_sheet.png.asset.json";
import { FONT_SHEET_SIZE, GLYPHS, PANEL_SIZE, WIN_TIERS, tierFor, type WinTierId } from "./winTiers";

const PANELS: Record<WinTierId, string> = { win: winP.url, big_win: bigP.url, superb_win: superbP.url, max_win: maxP.url };

function tone(freq: number, dur = 0.18, vol = 0.07) {
  try {
    const ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; o.type = "triangle"; g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  } catch { /* no audio */ }
}

/** Renders text with the Chunky 3D Gold bitmap font (0-9 . x). */
export function GoldNumber({ text, height }: { text: string; height: number }) {
  const s = height / 243;
  return (
    <div className="flex items-end justify-center" style={{ height }} aria-label={text}>
      {[...text].map((ch, i) => {
        const g = GLYPHS[ch]; if (!g) return null;
        return <span key={i} style={{ width: g.w * s, height: g.h * s, marginLeft: -8 * s, marginRight: -8 * s,
          backgroundImage: `url(${fontSheet.url})`, backgroundSize: `${FONT_SHEET_SIZE * s}px`,
          backgroundPosition: `${-g.x * s}px ${-g.y * s}px`, display: "inline-block", flexShrink: 0 }} />;
      })}
    </div>
  );
}

const IMPACT: Record<WinTierId, number> = { win: 0, big_win: 1, superb_win: 2, max_win: 3 };

export interface WinCelebrationProps {
  amount: number; bet: number; sound?: boolean;
  /** Show only this panel (preview). Otherwise panels escalate as the counter rolls up. */
  fixedTier?: WinTierId;
  onDone: () => void;
}

export function WinCelebration({ amount, bet, sound = true, fixedTier, onDone }: WinCelebrationProps) {
  const finalTier = fixedTier ?? tierFor(amount, bet)?.id ?? "win";
  const duration = 1800 + IMPACT[finalTier] * 1500;
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);
  const skipRef = useRef(false);
  const tier = fixedTier ?? tierFor(value, bet)?.id ?? "win";

  useEffect(() => {
    let raf = 0; const t0 = performance.now(); let lastTick = 0;
    const step = (now: number) => {
      const p = skipRef.current ? 1 : Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(amount * eased);
      if (sound && now - lastTick > 90 && p < 1) { lastTick = now; tone(600 + eased * 600, 0.05, 0.03); }
      if (p < 1) raf = requestAnimationFrame(step); else setDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [amount, duration, sound]);

  useEffect(() => { if (sound) [523, 659, 784, 1047].slice(0, 2 + IMPACT[tier]).forEach((f, i) => setTimeout(() => tone(f), i * 120)); }, [tier, sound]);
  useEffect(() => { if (!done) return undefined; const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [done, onDone]);

  const click = () => { if (!done) skipRef.current = true; else onDone(); };
  const box = WIN_TIERS.find((t) => t.id === tier)!.box;
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const coins = 16 + IMPACT[tier] * 12;

  return (
    <div role="dialog" aria-label="Win celebration" onClick={click}
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden bg-background/70 backdrop-blur-[2px]">
      {Array.from({ length: coins }).map((_, i) => <span key={i} className="coin-rain" style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.11}s` }} />)}
      {IMPACT[tier] >= 1 && Array.from({ length: 20 + IMPACT[tier] * 15 }).map((_, i) => (
        <span key={`c${i}`} className="confetti" style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i % 12) * 0.09}s`, background: ["var(--gold)", "var(--foreground)", "var(--primary)"][i % 3] }} />
      ))}
      <div key={tier} className="win-panel-in relative w-[min(96vw,860px,calc(110dvh))]" style={{ aspectRatio: `${PANEL_SIZE.w}/${PANEL_SIZE.h}` }}>
        <div className="absolute rounded-[3rem] bg-board" style={{ left: pct(box.x, PANEL_SIZE.w), top: pct(box.y, PANEL_SIZE.h), width: pct(box.w, PANEL_SIZE.w), height: pct(box.h, PANEL_SIZE.h) }} />
        <img src={PANELS[tier]} alt={WIN_TIERS.find((t) => t.id === tier)!.label} className="win-panel-pulse absolute inset-0 h-full w-full" />
        <div className="absolute grid place-items-center" style={{ left: pct(box.x, PANEL_SIZE.w), top: pct(box.y, PANEL_SIZE.h), width: pct(box.w, PANEL_SIZE.w), height: pct(box.h, PANEL_SIZE.h) }}>
          <div className={done ? "win-number-bounce" : ""} style={{ width: "100%", containerType: "size", height: "100%", display: "grid", placeItems: "center" }}>
            <FitNumber text={value.toFixed(2)} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-6 font-display text-sm text-foreground/80">{done ? "Tap to continue" : "Tap to skip"}</div>
    </div>
  );
}

function FitNumber({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 600, h: 180 });
  useEffect(() => {
    const el = ref.current?.parentElement; if (!el) return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const widthAt1 = [...text].reduce((a, c) => a + (GLYPHS[c]?.w ?? 0) - 16, 0) / 243;
  const h = Math.min(size.h * 0.72, (size.w * 0.9) / Math.max(widthAt1, 0.1));
  return <div ref={ref}><GoldNumber text={text} height={h} /></div>;
}
