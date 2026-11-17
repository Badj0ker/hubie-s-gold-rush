import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { COLS, ROWS, CELLS, type Board, type MultiplierGrid, type SpinResult, type SymbolId } from "./types";
import chest from "@/assets/sym/chest.png";
import coin from "@/assets/sym/coin.png";
import key from "@/assets/sym/key.png";
import mango from "@/assets/sym/mango.png";
import coconut from "@/assets/sym/coconut.png";
import red from "@/assets/sym/red.png";
import blue from "@/assets/sym/blue.png";
import green from "@/assets/sym/green.png";
import purple from "@/assets/sym/purple.png";
import wild from "@/assets/sym/wild.png";

const SRC: Record<SymbolId, string> = { chest, coin, key, mango, coconut, red, blue, green, purple, wild };

interface Cell { sym: SymbolId; y: number; scale: number; alpha: number; win: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; hue: number }
interface Floater { text: string; x: number; y: number; t: number }

export interface BoardHandle {
  setBoard(b: Board, m?: MultiplierGrid): void;
  playSpin(r: SpinResult, opts: { turbo?: boolean; onCascade?: (win: number, index: number) => void }): Promise<void>;
}

const easeOutBack = (t: number) => { const c = 1.4; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeIn = (t: number) => t * t;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export const BoardCanvas = forwardRef<BoardHandle, { className?: string }>(function BoardCanvas({ className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const st = useRef({
    cells: [] as Cell[], mults: new Array(CELLS).fill(0) as number[], pop: new Array(CELLS).fill(0) as number[],
    dim: 0, pulse: 0, particles: [] as Particle[], floaters: [] as Floater[], imgs: {} as Record<string, HTMLImageElement>, size: 0, speed: 1,
  });

  const tween = (ms: number, fn: (t: number) => void) => new Promise<void>((res) => {
    const d = ms / st.current.speed, s = performance.now();
    const step = (now: number) => { const t = Math.min(1, (now - s) / d); fn(t); if (t < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });

  useEffect(() => {
    for (const [k, v] of Object.entries(SRC)) { const i = new Image(); i.src = v; st.current.imgs[k] = i; }
    const canvas = canvasRef.current!, ctx = canvas.getContext("2d")!;
    const ro = new ResizeObserver(() => {
      const w = wrapRef.current!.clientWidth, dpr = window.devicePixelRatio || 1;
      st.current.size = w; canvas.width = w * dpr; canvas.height = w * dpr; canvas.style.height = `${w}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(wrapRef.current!);
    let raf = 0;
    const draw = (now: number) => {
      const s = st.current, W = s.size, cs = W / COLS, pad = cs * 0.06;
      ctx.clearRect(0, 0, W, W);
      s.pulse = now / 1000;
      for (let i = 0; i < CELLS; i++) {
        const r = Math.floor(i / COLS), c = i % COLS, x = c * cs, y = r * cs, m = s.mults[i];
        ctx.fillStyle = m >= 1 ? "rgba(255,190,60,0.28)" : "rgba(10,30,70,0.75)";
        ctx.strokeStyle = m >= 1 ? "rgba(255,210,90,0.9)" : "rgba(80,140,220,0.35)";
        ctx.lineWidth = m >= 1 ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cs - 4, cs - 4, cs * 0.12); ctx.fill(); ctx.stroke();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, W); ctx.clip();
      for (let i = 0; i < s.cells.length; i++) {
        const cell = s.cells[i]; if (!cell || cell.alpha <= 0) continue;
        const c = i % COLS, img = s.imgs[cell.sym];
        const sc = cell.scale * (cell.win ? 1 + Math.sin(s.pulse * 12) * 0.06 : 1);
        const size = (cs - pad * 2) * sc, cx = c * cs + cs / 2, cy = cell.y * cs + cs / 2;
        ctx.globalAlpha = cell.alpha * (cell.win ? 1 : 1 - s.dim * 0.6);
        if (cell.win) { ctx.shadowColor = "rgba(255,220,100,1)"; ctx.shadowBlur = 22; }
        if (img?.complete) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      ctx.restore();
      // multiplier badges
      for (let i = 0; i < CELLS; i++) {
        const m = s.mults[i]; if (m < 2) continue;
        const r = Math.floor(i / COLS), c = i % COLS, p = s.pop[i];
        const bx = c * cs + cs * 0.72, by = r * cs + cs * 0.74, rad = cs * 0.22 * (1 + p * 0.8);
        ctx.save(); ctx.translate(bx, by);
        ctx.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath();
        const g = ctx.createLinearGradient(0, -rad, 0, rad); g.addColorStop(0, "#3a8dff"); g.addColorStop(1, "#0b2f8a");
        ctx.fillStyle = g; ctx.shadowColor = "#ffd257"; ctx.shadowBlur = 10 + p * 20; ctx.fill();
        ctx.lineWidth = Math.max(2, cs * 0.035); ctx.strokeStyle = "#ffd257"; ctx.stroke(); ctx.shadowBlur = 0;
        ctx.font = `${Math.round(rad * 0.95)}px 'Lilita One', sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.lineWidth = 3; ctx.strokeStyle = "#08183f"; ctx.strokeText(`x${m}`, 0, 1); ctx.fillStyle = "#ffe27a"; ctx.fillText(`x${m}`, 0, 1);
        ctx.restore();
        s.pop[i] = Math.max(0, p - 0.04);
      }
      // particles
      s.particles = s.particles.filter((pt) => pt.life > 0);
      for (const pt of s.particles) {
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.25; pt.life -= 0.025;
        ctx.globalAlpha = Math.max(0, pt.life); ctx.fillStyle = `hsl(${pt.hue},100%,60%)`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, cs * 0.04, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      s.floaters = s.floaters.filter((f) => f.t < 1);
      for (const f of s.floaters) {
        f.t += 0.012; ctx.globalAlpha = 1 - easeIn(f.t);
        ctx.font = `${Math.round(cs * 0.5)}px 'Lilita One', sans-serif`; ctx.textAlign = "center";
        ctx.lineWidth = 6; ctx.strokeStyle = "#3a1c00"; ctx.strokeText(f.text, f.x, f.y - f.t * cs);
        ctx.fillStyle = "#ffd84d"; ctx.fillText(f.text, f.x, f.y - f.t * cs);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const burst = (i: number) => {
    const s = st.current, cs = s.size / COLS, x = (i % COLS) * cs + cs / 2, y = Math.floor(i / COLS) * cs + cs / 2;
    for (let k = 0; k < 10; k++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4; s.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, hue: 40 + Math.random() * 20 }); }
  };

  const dropIn = async (board: Board) => {
    const s = st.current;
    s.cells = board.map((sym, i) => ({ sym, y: Math.floor(i / COLS) - ROWS - 1, scale: 1, alpha: 1, win: false }));
    const from = s.cells.map((c) => c.y);
    await tween(520, (t) => s.cells.forEach((c, i) => {
      const col = i % COLS, row = Math.floor(i / COLS), lt = Math.min(1, Math.max(0, (t * 1.6 - col * 0.06 - (ROWS - 1 - row) * 0.02)));
      c.y = from[i] + (row - from[i]) * easeOutBack(lt);
    }));
  };

  useImperativeHandle(ref, () => ({
    setBoard(b, m) {
      st.current.cells = b.map((sym, i) => ({ sym, y: Math.floor(i / COLS), scale: 1, alpha: 1, win: false }));
      if (m) st.current.mults = m.slice();
    },
    async playSpin(r, { turbo, onCascade }) {
      const s = st.current; s.speed = turbo ? 2.2 : 1;
      s.mults = r.initialMultipliers.slice();
      const fromY = s.cells.map((c) => c.y);
      await tween(240, (t) => s.cells.forEach((c, i) => { c.y = fromY[i] + easeIn(t) * (ROWS + 2); }));
      await dropIn(r.initialBoard);
      await sleep(120 / s.speed);
      for (let k = 0; k < r.cascades.length; k++) {
        const cas = r.cascades[k], rm = new Set(cas.removed);
        s.cells.forEach((c, i) => (c.win = rm.has(i)));
        await tween(220, (t) => (s.dim = t));
        await sleep(520 / s.speed);
        for (const i of cas.removed) { if (cas.multipliersAfter[i] !== s.mults[i] && cas.multipliersAfter[i] >= 2) s.pop[i] = 1; burst(i); }
        s.mults = cas.multipliersAfter.slice();
        const cs = s.size / COLS, mid = cas.removed[Math.floor(cas.removed.length / 2)];
        s.floaters.push({ text: fmt(cas.cascadeWin), x: (mid % COLS) * cs + cs / 2, y: Math.floor(mid / COLS) * cs + cs / 2, t: 0 });
        onCascade?.(cas.cascadeWin, k);
        await tween(260, (t) => cas.removed.forEach((i) => { s.cells[i].scale = 1 + t * 0.5; s.cells[i].alpha = 1 - t; }));
        // gravity: survivors fall, new symbols enter from above
        const next: Cell[] = new Array(CELLS), starts: number[] = new Array(CELLS);
        for (let c = 0; c < COLS; c++) {
          const surv: number[] = [];
          for (let row = 0; row < ROWS; row++) if (!rm.has(row * COLS + c)) surv.push(row);
          const missing = ROWS - surv.length;
          for (let row = 0; row < ROWS; row++) {
            const i = row * COLS + c;
            next[i] = { sym: cas.nextBoard[i], y: 0, scale: 1, alpha: 1, win: false };
            starts[i] = row < missing ? row - missing - 0.5 : surv[row - missing];
          }
        }
        s.cells = next; s.dim = 0;
        await tween(400, (t) => next.forEach((c, i) => { const row = Math.floor(i / COLS); c.y = starts[i] + (row - starts[i]) * easeOutBack(t); }));
        await sleep(90 / s.speed);
      }
      s.cells.forEach((c) => (c.win = false)); s.dim = 0;
    },
  }));

  return (
    <div ref={wrapRef} className={className}>
      <canvas ref={canvasRef} className="block w-full" />
    </div>
  );
});
