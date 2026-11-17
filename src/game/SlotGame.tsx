import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Info, Minus, Plus, RotateCw, Volume2, VolumeX, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BoardCanvas, type BoardHandle } from "./BoardCanvas";
import { MockGameProvider } from "./mockProvider";
import type { ScenarioId } from "./types";
import logo from "@/assets/hubies-logo.png";
import hubie from "@/assets/hubie.png";
import bg from "@/assets/bg-island.jpg";

const BETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const SCENARIOS: { id: ScenarioId; label: string; hint: string }[] = [
  { id: "random", label: "RNG", hint: "Random mock spins" },
  { id: "A", label: "A", hint: "No win" },
  { id: "B", label: "B", hint: "One cluster, one cascade" },
  { id: "C", label: "C", hint: "Multiple cascades" },
  { id: "D", label: "D", hint: "Multipliers + big win" },
  { id: "E", label: "E", hint: "Huge cluster celebration" },
];

function beep(freq: number) {
  try {
    const ac = new AudioContext(), o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq; o.type = "triangle"; g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.25);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.25);
  } catch { /* audio not available */ }
}

export function SlotGame() {
  const provider = useMemo(() => new MockGameProvider(), []);
  const board = useRef<BoardHandle>(null);
  const [balance, setBalance] = useState(10000);
  const [betIdx, setBetIdx] = useState(2);
  const [win, setWin] = useState(0);
  const [busy, setBusy] = useState(false);
  const [auto, setAuto] = useState(0);
  const [sound, setSound] = useState(true);
  const [turbo, setTurbo] = useState(false);
  const [scenario, setScenario] = useState<ScenarioId>("random");
  const [bonusOpen, setBonusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [freeSpins, setFreeSpins] = useState<number | null>(null);
  const bet = BETS[betIdx];

  useEffect(() => { board.current?.setBoard(provider.getInitialBoard()); }, [provider]);
  useEffect(() => { provider.setScenario(scenario); }, [scenario, provider]);

  const play = useCallback(async (result: Parameters<BoardHandle["playSpin"]>[0], base = 0) => {
    let shown = base;
    await board.current!.playSpin(result, { turbo, onCascade: (w, k) => { shown += w; setWin(Math.round(shown * 100) / 100); if (sound) beep(520 + k * 90); } });
    return result.totalWin;
  }, [turbo, sound]);

  const spin = useCallback(async () => {
    if (busy || balance < bet) return;
    setBusy(true); setWin(0); setBalance((b) => b - bet);
    if (sound) beep(300);
    const result = provider.spin(bet);
    await play(result);
    setWin(result.totalWin); setBalance((b) => b + result.totalWin);
    if (result.bigWin) { setCelebrate(result.totalWin); if (sound) [660, 880, 1100].forEach((f, i) => setTimeout(() => beep(f), i * 150)); await new Promise((r) => setTimeout(r, 2600)); setCelebrate(null); }
    setBusy(false);
  }, [busy, balance, bet, provider, play, sound]);

  const buyBonus = async () => {
    const price = provider.getBonusPrice(bet);
    setBonusOpen(false); if (balance < price) return;
    setBusy(true); setWin(0); setBalance((b) => b - price);
    const spins = provider.buyBonus(bet); let total = 0;
    for (let i = 0; i < spins.length; i++) { setFreeSpins(spins.length - i); total += await play(spins[i], total); setWin(Math.round(total * 100) / 100); }
    setFreeSpins(null); setBalance((b) => b + total);
    setCelebrate(total); await new Promise((r) => setTimeout(r, 2600)); setCelebrate(null);
    setBusy(false);
  };

  useEffect(() => {
    if (auto > 0 && !busy) { const t = setTimeout(() => { setAuto((a) => a - 1); spin(); }, 350); return () => clearTimeout(t); }
  }, [auto, busy, spin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); spin(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [spin]);

  return (
    <main className="relative min-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <img src={bg} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />

      <img src={hubie} alt="Hubie the sloth" className="pointer-events-none absolute bottom-24 right-[1%] hidden w-[19vw] max-w-[340px] drop-shadow-2xl lg:block" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col items-center px-2 pb-28 pt-2 sm:px-4">
        {/* demo scenario chooser */}
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1 rounded-xl border-2 border-gold bg-panel/90 p-1.5 shadow-lg sm:left-4 sm:top-4">
          <span className="px-1 font-display text-xs text-gold">DEMO</span>
          {SCENARIOS.map((s) => (
            <button key={s.id} title={s.hint} disabled={busy} onClick={() => setScenario(s.id)}
              className={`h-7 min-w-7 rounded-md px-2 font-display text-sm transition disabled:opacity-50 ${scenario === s.id ? "bg-gold text-panel" : "bg-panel-light text-foreground hover:bg-gold/30"}`}>
              {s.label}
            </button>
          ))}
        </div>

        <img src={logo} alt="Hubie's Gold Rush" className="logo-fade mt-10 w-[min(70vw,360px)] sm:mt-2" />

        <div className="relative mt-1 w-[min(94vw,calc(100dvh-270px),760px)]">
          {freeSpins !== null && (
            <div className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border-2 border-gold bg-panel px-4 py-1 font-display text-gold shadow-lg">
              GOLD RUSH SPINS: {freeSpins}
            </div>
          )}
          <div className="board-frame rounded-2xl p-[1.6%]">
            <BoardCanvas ref={board} className="w-full rounded-xl bg-board" />
          </div>
          <button onClick={() => setBonusOpen(true)} disabled={busy}
            className="absolute -left-2 top-1/3 hidden -translate-x-full flex-col items-center rounded-2xl border-2 border-gold bg-panel/95 px-4 py-3 font-display text-gold shadow-xl transition hover:scale-105 disabled:opacity-50 md:flex">
            <span className="text-sm">BUY</span><span className="text-lg leading-none">FEATURE</span>
            <span className="mt-1 text-foreground">{fmt(provider.getBonusPrice(bet))}</span>
          </button>
        </div>
      </div>

      {/* control bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-gold/70 bg-panel/95 px-2 py-2 backdrop-blur sm:px-4">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-1.5 sm:gap-3">
          <div className="flex gap-1.5">
            <RoundBtn label="Menu" onClick={() => setMenuOpen(true)}><Menu /></RoundBtn>
            <RoundBtn label="Info" onClick={() => setInfoOpen(true)} className="hidden sm:flex"><Info /></RoundBtn>
          </div>
          <Stat label="BALANCE" value={fmt(balance)} />
          <div className="pill flex items-center gap-1 px-1.5 sm:gap-3 sm:px-3">
            <RoundBtn small label="Lower bet" disabled={busy || betIdx === 0} onClick={() => setBetIdx((i) => i - 1)}><Minus /></RoundBtn>
            <div className="text-center"><div className="font-display text-[10px] text-gold sm:text-sm">BET</div><div className="font-display text-sm sm:text-xl">{fmt(bet)}</div></div>
            <RoundBtn small label="Raise bet" disabled={busy || betIdx === BETS.length - 1} onClick={() => setBetIdx((i) => i + 1)}><Plus /></RoundBtn>
          </div>
          <Stat label="WIN" value={fmt(win)} highlight={win > 0} />
          <button aria-label="Spin" onClick={spin} disabled={busy || balance < bet}
            className="spin-btn -mt-10 grid h-20 w-20 shrink-0 place-items-center rounded-full sm:h-28 sm:w-28">
            <RotateCw className={`h-10 w-10 text-gold sm:h-14 sm:w-14 ${busy ? "animate-spin" : ""}`} strokeWidth={3} />
          </button>
          <div className="flex gap-1.5">
            <button onClick={() => setAuto((a) => (a > 0 ? 0 : 10))}
              className={`pill h-11 px-3 font-display text-sm sm:h-12 sm:text-base ${auto > 0 ? "bg-gold text-panel" : ""}`}>
              {auto > 0 ? `STOP ${auto}` : "AUTO"}
            </button>
            <RoundBtn label="Turbo" onClick={() => setTurbo((t) => !t)} className={`hidden sm:flex ${turbo ? "bg-gold text-panel" : ""}`}><Zap /></RoundBtn>
            <RoundBtn label="Sound" onClick={() => setSound((s) => !s)}>{sound ? <Volume2 /> : <VolumeX />}</RoundBtn>
          </div>
        </div>
      </div>

      {celebrate !== null && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/50">
          {Array.from({ length: 24 }).map((_, i) => <span key={i} className="coin-rain" style={{ left: `${(i * 41) % 100}%`, animationDelay: `${(i % 8) * 0.12}s` }} />)}
          <div className="celebrate text-center">
            <div className="font-display text-6xl text-gold drop-shadow-[0_4px_0_var(--panel)] sm:text-8xl">BIG WIN!</div>
            <div className="mt-2 font-display text-4xl sm:text-6xl">{fmt(celebrate)}</div>
          </div>
        </div>
      )}

      <Dialog open={bonusOpen} onOpenChange={setBonusOpen}>
        <DialogContent className="border-2 border-gold bg-panel text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl text-gold">Gold Rush Spins</DialogTitle>
            <DialogDescription className="text-foreground/80">10 free spins. Multiplier spots stay on the board for the whole feature.</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-panel-light p-4 text-center">
            <div className="font-display text-sm text-gold">PRICE</div>
            <div className="font-display text-4xl">{fmt(provider.getBonusPrice(bet))}</div>
            <div className="text-sm text-foreground/70">at {fmt(bet)} bet</div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => setBonusOpen(false)} className="pill h-11 px-6 font-display">CANCEL</button>
            <button onClick={buyBonus} disabled={balance < provider.getBonusPrice(bet)} className="h-11 rounded-full bg-gold px-6 font-display text-panel disabled:opacity-50">CONFIRM</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="border-2 border-gold bg-panel text-foreground">
          <DialogHeader><DialogTitle className="font-display text-2xl text-gold">Menu</DialogTitle><DialogDescription className="text-foreground/70">Demo settings</DialogDescription></DialogHeader>
          <div className="grid gap-2">
            <button className="pill h-11 font-display md:hidden" onClick={() => { setMenuOpen(false); setBonusOpen(true); }}>BUY FEATURE</button>
            <button className="pill h-11 font-display" onClick={() => setTurbo((t) => !t)}>TURBO: {turbo ? "ON" : "OFF"}</button>
            <button className="pill h-11 font-display" onClick={() => { setMenuOpen(false); setInfoOpen(true); }}>PAYTABLE & RULES</button>
            <button className="pill h-11 font-display" onClick={() => setBalance(10000)}>RESET DEMO BALANCE</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-2 border-gold bg-panel text-foreground">
          <DialogHeader><DialogTitle className="font-display text-2xl text-gold">How to play</DialogTitle><DialogDescription className="text-foreground/70">Demo mode — play money only.</DialogDescription></DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>7×7 board. 5 or more matching symbols touching up/down/left/right pay.</li>
            <li>Winning symbols burst and new ones tumble in from above until no wins remain.</li>
            <li>A burst spot is marked gold. If it bursts again it becomes x2, then doubles each time up to x128.</li>
            <li>Multipliers under a winning cluster are added together and applied to that cluster.</li>
            <li>WILD replaces any symbol. Spots reset after each normal spin.</li>
            <li>Press SPACE to spin. Use the DEMO buttons to replay scenarios A–E.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function RoundBtn({ children, label, small, className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; small?: boolean }) {
  return (
    <button aria-label={label} {...p}
      className={`pill grid shrink-0 place-items-center rounded-full disabled:opacity-40 [&_svg]:h-5 [&_svg]:w-5 ${small ? "h-8 w-8 sm:h-10 sm:w-10" : "h-11 w-11 sm:h-12 sm:w-12"} ${className}`}>
      {children}
    </button>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="pill min-w-0 flex-1 px-2 py-1 text-center sm:px-4">
      <div className="font-display text-[10px] text-gold sm:text-sm">{label}</div>
      <div className={`truncate font-display text-sm sm:text-xl ${highlight ? "text-gold" : ""}`}>{value}</div>
    </div>
  );
}
