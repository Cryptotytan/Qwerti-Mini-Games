"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// ── Level config ────────────────────────────────────────────
const LEVELS = {
  easy:   { cols: 2, rows: 4, label: "Initiate",  frags: "8 tiles"  },
  normal: { cols: 3, rows: 4, label: "Builder",   frags: "12 tiles" },
  hard:   { cols: 4, rows: 5, label: "Architect", frags: "20 tiles" },
};

const LB_KEY = "qwerti_tile_lb_v2";
const LB_MAX = 10;

const C = {
  bg: "#07090e", surf: "#111520", surf2: "#181d2a",
  mg: "#d946ef", mglow: "rgba(217,70,239,0.35)", mdim: "rgba(217,70,239,0.12)",
  border: "rgba(217,70,239,0.22)", text: "#e8eaf0", dim: "#4a5278", mid: "#8890b0",
  gold: "#f5c518", silver: "#aab4c8", bronze: "#cd7f32",
  green: "#20d9a0", red: "#f43f5e",
  frame: "#3b2510", frameLight: "#5c3a1a", frameDark: "#1e1005",
};

// ── Leaderboard helpers ─────────────────────────────────────
function loadLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || { easy: [], normal: [], hard: [] }; }
  catch { return { easy: [], normal: [], hard: [] }; }
}
function saveLB(d) { try { localStorage.setItem(LB_KEY, JSON.stringify(d)); } catch {} }
function addLB(lvl, user, t) {
  const d = loadLB();
  d[lvl].push({ user, t });
  d[lvl].sort((a, b) => a.t - b.t);
  d[lvl] = d[lvl].slice(0, LB_MAX);
  saveLB(d);
  return d[lvl].findIndex(e => e.user === user && e.t === t) + 1;
}
function fmt(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${s}s`;
}

// ── Shuffle ─────────────────────────────────────────────────
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // Make sure it's not already in solved order
  if (a.every((v, i) => v === i)) return shuffleArr(arr);
  return a;
}

// ── Logo SVG paths (400×400 space) ──────────────────────────
const LW = 400, LH = 400;
function rrPath(x, y, w, h, r) {
  return `M${x+r},${y}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}v${h-2*r}a${r},${r} 0 0 1 -${r},${r}h-${w-2*r}a${r},${r} 0 0 1 -${r},-${r}v-${h-2*r}a${r},${r} 0 0 1 ${r},-${r}z`;
}
const OUTER = rrPath(55, 15, 290, 290, 72);
const INNER = rrPath(118, 78, 164, 164, 42);
const BAR   = rrPath(105, 332, 190, 38, 12);

// ── Tile renderer ───────────────────────────────────────────
function TileSVG({ tileId, cols, rows, cellW, cellH, correct }) {
  const col = tileId % cols;
  const row = Math.floor(tileId / cols);
  const vx = col * (LW / cols);
  const vy = row * (LH / rows);
  const vw = LW / cols;
  const vh = LH / rows;
  const uid = `t${tileId}_${cols}x${rows}`;
  return (
    <svg
      width={cellW} height={cellH}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      style={{ display: "block", pointerEvents: "none" }}
    >
      <defs>
        <clipPath id={uid}>
          <rect x={vx} y={vy} width={vw} height={vh} />
        </clipPath>
      </defs>
      {/* Tile background */}
      <rect x={vx} y={vy} width={vw} height={vh} fill="#0c0e18" />
      <g clipPath={`url(#${uid})`}>
        {/* O ring — bright so it's clearly visible */}
        <path d={`${OUTER} ${INNER}`} fill={correct ? "#ffffff" : "#dde0f0"} fillRule="evenodd" />
        {/* Magenta bar with soft glow behind it */}
        <path d={BAR} fill="rgba(217,70,239,0.28)" transform="translate(0,2) scale(1.01)" />
        <path d={BAR} fill="#d946ef" />
      </g>
      {/* Tile border */}
      <rect
        x={vx + 0.5} y={vy + 0.5} width={vw - 1} height={vh - 1}
        fill="none"
        stroke={correct ? "rgba(32,217,160,0.7)" : "rgba(217,70,239,0.2)"}
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ── Button components ───────────────────────────────────────
function PrimaryBtn({ onClick, children, style = {} }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: C.mg, color: "#fff", border: "none", borderRadius: 10,
        padding: "13px 22px", fontFamily: "monospace", fontWeight: 800,
        fontSize: "0.9rem", letterSpacing: "0.04em", cursor: "pointer",
        boxShadow: h ? `0 0 32px ${C.mglow}` : `0 0 16px ${C.mglow}`,
        transform: h ? "translateY(-2px)" : "none",
        transition: "all 0.15s", ...style,
      }}
    >{children}</button>
  );
}

function GhostBtn({ onClick, children, style = {} }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "transparent",
        border: `1px solid ${h ? C.mg : C.border}`,
        color: h ? C.mg : C.mid, borderRadius: 10,
        padding: "10px 16px", fontFamily: "monospace",
        fontSize: "0.72rem", cursor: "pointer",
        transition: "all 0.2s", whiteSpace: "nowrap", ...style,
      }}
    >{children}</button>
  );
}

function QwertiAppBtn() {
  const [h, setH] = useState(false);
  return (
    <a
      href="https://app.qwerti.ai?ref=67c-01008"
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: h ? "rgba(217,70,239,0.12)" : "rgba(217,70,239,0.06)",
        border: `1px solid ${h ? C.mg : "rgba(217,70,239,0.3)"}`,
        color: h ? C.mg : C.mid,
        borderRadius: 12, padding: "11px 24px",
        fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 700,
        letterSpacing: "0.06em", textDecoration: "none",
        boxShadow: h ? `0 0 24px ${C.mglow}` : "none",
        transition: "all 0.2s",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: "1rem" }}>⚡</span>
      Try the Qwerti App
    </a>
  );
}

function LevelCard({ lvl, onClick }) {
  const [h, setH] = useState(false);
  const color = { easy: C.green, normal: C.gold, hard: C.red }[lvl];
  const { label, frags } = LEVELS[lvl];
  const desc = { easy: "gentle intro", normal: "moderate challenge", hard: "chaos mode" }[lvl];
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: C.surf, border: `1px solid ${h ? color : C.border}`,
        borderRadius: 16, padding: "26px 20px", cursor: "pointer",
        transform: h ? "translateY(-4px)" : "none",
        boxShadow: h ? `0 0 36px rgba(217,70,239,0.13)` : "none",
        transition: "all 0.2s", display: "flex", flexDirection: "column",
        gap: 10, position: "relative", overflow: "hidden",
      }}
    >
      {h && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(217,70,239,0.06),transparent 60%)", pointerEvents: "none" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
        {lvl}
      </div>
      <div style={{ fontWeight: 800, fontSize: "1.4rem", color: C.text }}>{label}</div>
      <div style={{ fontSize: "0.7rem", color: C.dim, lineHeight: 1.6 }}>
        <span style={{ color: C.mid }}>{frags}</span> · {desc}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════
export default function QwertiPuzzle() {
  const [screen, setScreen] = useState("username");
  const [uInput, setUInput] = useState("");
  const [uErr, setUErr] = useState("");
  const [user, setUser] = useState("");

  const [level, setLevel] = useState("easy");
  const [tiles, setTiles] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const [elapsed, setElapsed] = useState(0);
  const [won, setWon] = useState(false);
  const [winT, setWinT] = useState(0);
  const [winRank, setWinRank] = useState(null);

  const [fb, setFb] = useState({ msg: "", ok: true });
  const [solvedCells, setSolvedCells] = useState([]);
  const [parts, setParts] = useState([]);

  const [lbTab, setLbTab] = useState("easy");
  const [lbData, setLbData] = useState({ easy: [], normal: [], hard: [] });
  const [boardW, setBoardW] = useState(360);

  const boardRef = useRef(null);
  const timerRef = useRef(null);
  // Use ref to always have latest tiles value inside check without stale closure
  const tilesRef = useRef(tiles);
  useEffect(() => { tilesRef.current = tiles; }, [tiles]);
  const elapsedRef = useRef(elapsed);
  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);

  // ── Board size measurement ──────────────────────────────
  useEffect(() => {
    if (screen !== "game") return;
    const measure = () => {
      if (boardRef.current) setBoardW(boardRef.current.clientWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [screen]);

  // ── Timer ───────────────────────────────────────────────
  // Use a single timer that we explicitly start/stop
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Start a new game ────────────────────────────────────
  const startGame = useCallback((lvl) => {
    stopTimer();
    const { cols, rows } = LEVELS[lvl];
    const fresh = shuffleArr(Array.from({ length: cols * rows }, (_, i) => i));
    setLevel(lvl);
    setTiles(fresh);
    tilesRef.current = fresh;
    setElapsed(0);
    elapsedRef.current = 0;
    setWon(false);
    setSolvedCells([]);
    setFb({ msg: "", ok: true });
    setDragging(null);
    setDragOver(null);
    setScreen("game");
    // Small delay so state settles before timer starts
    setTimeout(() => startTimer(), 50);
  }, [stopTimer, startTimer]);

  // ── Back button ─────────────────────────────────────────
  const goBack = useCallback(() => {
    stopTimer();
    setWon(false);
    setScreen("levels");
  }, [stopTimer]);

  // ── Shuffle button (reshuffle only, keep timer running) ─
  const reshuffleOnly = useCallback(() => {
    const { cols, rows } = LEVELS[level];
    const fresh = shuffleArr(Array.from({ length: cols * rows }, (_, i) => i));
    setTiles(fresh);
    tilesRef.current = fresh;
    setSolvedCells([]);
    setFb({ msg: "", ok: true });
    setDragging(null);
    setDragOver(null);
  }, [level]);

  // ── Drag & Drop ─────────────────────────────────────────
  const onDragStart = useCallback((e, idx) => {
    e.dataTransfer.effectAllowed = "move";
    setDragging(idx);
  }, []);

  const onDragEnter = useCallback((e, idx) => {
    e.preventDefault();
    setDragOver(idx);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((e, idx) => {
    e.preventDefault();
    setTiles(prev => {
      const from = dragging;
      if (from === null || from === idx) return prev;
      const n = [...prev];
      [n[from], n[idx]] = [n[idx], n[from]];
      tilesRef.current = n;
      return n;
    });
    setDragging(null);
    setDragOver(null);
  }, [dragging]);

  const onDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(null);
  }, []);

  // ── Touch drag ──────────────────────────────────────────
  const touchDragFrom = useRef(null);

  const onTouchStart = useCallback((e, idx) => {
    touchDragFrom.current = idx;
    setDragging(idx);
  }, []);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const cell = el.closest("[data-ci]");
      if (cell) {
        const idx = parseInt(cell.dataset.ci);
        if (idx !== touchDragFrom.current) setDragOver(idx);
      }
    }
  }, []);

  const onTouchEnd = useCallback((e) => {
    e.preventDefault();
    const from = touchDragFrom.current;
    const to = dragOver;
    if (from !== null && to !== null && from !== to) {
      setTiles(prev => {
        const n = [...prev];
        [n[from], n[to]] = [n[to], n[from]];
        tilesRef.current = n;
        return n;
      });
    }
    touchDragFrom.current = null;
    setDragging(null);
    setDragOver(null);
  }, [dragOver]);

  // ── Check placement ─────────────────────────────────────
  // Uses ref so it always reads latest tiles, no stale closure
  const check = useCallback(() => {
    const current = tilesRef.current;
    const correct = current.map((id, pos) => id === pos);
    const solved = correct.filter(Boolean).length;
    const total = current.length;
    setSolvedCells(correct.map((c, i) => c ? i : -1).filter(i => i >= 0));

    if (solved === total) {
      stopTimer();
      const t = elapsedRef.current;
      setWon(true);
      setWinT(t);
      setWinRank(addLB(level, user, t));
      spawnParticles();
    } else if (solved === 0) {
      setFb({ msg: "✗ No tiles correct yet — keep swapping!", ok: false });
    } else {
      setFb({ msg: `✓ ${solved} / ${total} tiles correct — keep going!`, ok: true });
    }
  }, [level, user, stopTimer]);

  // ── Particles ───────────────────────────────────────────
  const spawnParticles = () => {
    const palette = [C.mg, "#a855f7", C.gold, C.green, C.red, "#fff"];
    setParts(Array.from({ length: 70 }, (_, i) => ({
      id: i,
      x: Math.random() * 100, y: Math.random() * 100,
      dx: (Math.random() - 0.5) * 35, dy: -(Math.random() * 28 + 8),
      size: Math.random() * 10 + 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      dur: 0.8 + Math.random() * 0.7,
      delay: Math.random() * 0.35,
    })));
    setTimeout(() => setParts([]), 2500);
  };

  // ── Username submit ──────────────────────────────────────
  const submitUser = () => {
    const v = uInput.trim();
    if (!v) { setUErr("Please enter a username."); return; }
    if (v.length < 2) { setUErr("At least 2 characters."); return; }
    setUErr("");
    setUser(v);
    setScreen("levels");
  };

  // ── Derived values ───────────────────────────────────────
  const { cols, rows } = LEVELS[level] || LEVELS.easy;
  const cellW = boardW > 0 ? Math.floor(boardW / cols) : 80;
  const cellH = boardW > 0 ? Math.floor((boardW * (LH / LW)) / rows) : 80;
  const lvlColor = { easy: C.green, normal: C.gold, hard: C.red };

  // ══════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════
  return (
    <div
      style={{ fontFamily: "monospace", background: C.bg, minHeight: "100vh", color: C.text, overflowX: "hidden", position: "relative" }}
      onTouchMove={screen === "game" ? onTouchMove : undefined}
      onTouchEnd={screen === "game" ? onTouchEnd : undefined}
    >
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn  { from{opacity:0;transform:scale(0.82)}      to{opacity:1;transform:scale(1)} }
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes fly    { to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)} }
        * { box-sizing: border-box; }
        input { outline: none; }
        .tc {
          cursor: grab;
          transition: transform 0.1s, opacity 0.1s, box-shadow 0.1s;
          border-radius: 4px; overflow: hidden;
          user-select: none; touch-action: none; line-height: 0;
        }
        .tc:active { cursor: grabbing; }
        .tc.drag    { opacity: 0.35; transform: scale(0.93); }
        .tc.over    { box-shadow: 0 0 0 3px #d946ef, 0 0 20px rgba(217,70,239,0.6); transform: scale(1.04); z-index: 10; }
        .tc.correct { box-shadow: 0 0 0 2px #20d9a0, 0 0 14px rgba(32,217,160,0.5); }
      `}</style>

      {/* ── Background decorations ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse 70% 50% at 75% 5%,rgba(217,70,239,0.09),transparent 70%),radial-gradient(ellipse 50% 40% at 15% 85%,rgba(217,70,239,0.05),transparent 70%)` }} />
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: 0.03, backgroundImage: `linear-gradient(${C.mg} 1px,transparent 1px),linear-gradient(90deg,${C.mg} 1px,transparent 1px)`, backgroundSize: "56px 56px" }} />

      {/* ── Particles ── */}
      {parts.map(p => (
        <div key={p.id} style={{
          position: "fixed", left: `${p.x}vw`, top: `${p.y}vh`,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.color, boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          pointerEvents: "none", zIndex: 9999,
          animation: `fly ${p.dur}s ease-out ${p.delay}s forwards`,
          "--dx": `${p.dx}vw`, "--dy": `${p.dy}vh`,
        }} />
      ))}

      {/* ════ USERNAME SCREEN ════ */}
      {screen === "username" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: 24, position: "relative", zIndex: 1, animation: "fadeUp 0.5s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 74, height: 74, border: "14px solid #dde", borderRadius: 22, boxShadow: `0 0 40px ${C.mglow},0 0 80px rgba(217,70,239,0.1)`, animation: "pulse 3s ease-in-out infinite" }} />
            <div style={{ width: 46, height: 10, background: C.mg, borderRadius: 4, boxShadow: `0 0 20px ${C.mg},0 0 40px ${C.mglow}`, animation: "pulse 3s ease-in-out infinite 0.5s" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: "clamp(2rem,6vw,3.2rem)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              QWERTI<br /><span style={{ color: C.mg, textShadow: `0 0 30px ${C.mg}` }}>PUZZLE</span>
            </div>
            <div style={{ marginTop: 10, fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", color: C.dim }}>
              reconstruct the logo · race the clock
            </div>
          </div>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.dim }}>Your username</label>
              <input
                value={uInput}
                onChange={e => setUInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitUser()}
                placeholder="enter a name..."
                maxLength={18}
                autoComplete="off"
                style={{ display: "block", width: "100%", marginTop: 8, background: C.bg, border: `1px solid ${uInput ? C.mg : "rgba(217,70,239,0.25)"}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, boxShadow: uInput ? `0 0 0 3px ${C.mdim}` : "none", transition: "all 0.2s" }}
              />
            </div>
            {uErr && <div style={{ fontSize: "0.72rem", color: C.red, textAlign: "center" }}>{uErr}</div>}
            <PrimaryBtn onClick={submitUser} style={{ width: "100%" }}>Enter the Game →</PrimaryBtn>
          </div>
          <QwertiAppBtn />
        </div>
      )}

      {/* ════ LEVEL SELECT SCREEN ════ */}
      {screen === "levels" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 32, padding: 24, position: "relative", zIndex: 1, animation: "fadeUp 0.4s ease" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.mg, marginBottom: 6 }}>Welcome, {user}</div>
            <div style={{ fontWeight: 800, fontSize: "clamp(1.6rem,4vw,2.4rem)" }}>Select Difficulty</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, width: "100%", maxWidth: 700 }}>
            {["easy", "normal", "hard"].map(lvl => <LevelCard key={lvl} lvl={lvl} onClick={() => startGame(lvl)} />)}
          </div>
          <GhostBtn onClick={() => { setLbData(loadLB()); setLbTab("easy"); setScreen("leaderboard"); }}>
            View Leaderboards →
          </GhostBtn>
          <QwertiAppBtn />
        </div>
      )}

      {/* ════ GAME SCREEN ════ */}
      {screen === "game" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 14px", gap: 14, position: "relative", zIndex: 1 }}>

          {/* Header */}
          <div style={{ width: "100%", maxWidth: 520, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* ← BACK BUTTON — stops timer, goes to levels */}
              <GhostBtn onClick={goBack}>← Back</GhostBtn>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", color: lvlColor[level] }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: lvlColor[level], boxShadow: `0 0 8px ${lvlColor[level]}` }} />
                {level} · {LEVELS[level].label}
              </div>
            </div>
            {/* Timer */}
            <div style={{ fontWeight: 800, fontSize: "2rem", color: won ? C.green : C.mg, textShadow: `0 0 20px ${won ? C.green : C.mglow}`, letterSpacing: "0.06em" }}>
              {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
            </div>
          </div>

          <div style={{ fontSize: "0.6rem", color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            drag tiles to swap · hit check when ready
          </div>

          {/* ── PUZZLE BOARD ── */}
          <div style={{ width: "100%", maxWidth: 520, position: "relative" }}>
            {/* Wooden frame */}
            <div style={{
              background: `linear-gradient(160deg, ${C.frameLight} 0%, ${C.frame} 50%, ${C.frameDark} 100%)`,
              borderRadius: 20, padding: 14,
              boxShadow: `0 0 0 1px ${C.frameLight}, 0 12px 50px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,180,80,0.1), inset 0 -2px 4px rgba(0,0,0,0.4)`,
              position: "relative",
            }}>
              {/* Wood grain overlay */}
              <div style={{ position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none", opacity: 0.07, backgroundImage: `repeating-linear-gradient(8deg, transparent, transparent 6px, rgba(255,200,120,0.4) 7px, transparent 8px)` }} />
              {/* Board inner */}
              <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "inset 0 3px 10px rgba(0,0,0,0.7)" }}>
                <div ref={boardRef} style={{ width: "100%" }}>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3, background: "#030406", padding: 3 }}>
                    {tiles.map((tileId, posIdx) => {
                      const isCorrect = solvedCells.includes(posIdx);
                      const isDragging = dragging === posIdx;
                      const isDragOver = dragOver === posIdx;
                      return (
                        <div
                          key={posIdx}
                          data-ci={posIdx}
                          className={`tc${isDragging ? " drag" : ""}${isDragOver ? " over" : ""}${isCorrect ? " correct" : ""}`}
                          draggable={!won}
                          onDragStart={e => onDragStart(e, posIdx)}
                          onDragEnter={e => onDragEnter(e, posIdx)}
                          onDragOver={onDragOver}
                          onDrop={e => onDrop(e, posIdx)}
                          onDragEnd={onDragEnd}
                          onTouchStart={won ? undefined : e => onTouchStart(e, posIdx)}
                          style={{ aspectRatio: `${LW / cols} / ${LH / rows}` }}
                        >
                          <TileSVG
                            tileId={tileId}
                            cols={cols} rows={rows}
                            cellW={cellW} cellH={cellH}
                            correct={isCorrect}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Controls ── */}
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 520 }}>
            {/* CHECK PLACEMENT — reads latest tiles via ref, never stale */}
            <PrimaryBtn onClick={check} style={{ flex: 1 }}>
              ✓ Check Placement
            </PrimaryBtn>
            {/* SHUFFLE — only reshuffles tiles, does NOT reset timer or screen */}
            <GhostBtn onClick={reshuffleOnly}>
              ↺ Shuffle
            </GhostBtn>
          </div>

          {fb.msg && (
            <div style={{ fontSize: "0.72rem", color: fb.ok ? C.green : C.red, textAlign: "center", letterSpacing: "0.04em" }}>
              {fb.msg}
            </div>
          )}
          <div style={{ marginTop: 4 }}><QwertiAppBtn /></div>
        </div>
      )}

      {/* ════ LEADERBOARD SCREEN ════ */}
      {screen === "leaderboard" && (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: 24, gap: 20, position: "relative", zIndex: 1, animation: "fadeUp 0.4s ease" }}>
          <div style={{ width: "100%", maxWidth: 640, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: "1.8rem" }}>Leaderboard</div>
            <GhostBtn onClick={() => setScreen("levels")}>← Back</GhostBtn>
          </div>
          <div style={{ display: "flex", gap: 6, background: C.surf, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
            {["easy", "normal", "hard"].map(t => (
              <button key={t} onClick={() => setLbTab(t)} style={{ padding: "8px 18px", borderRadius: 7, fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer", border: "none", fontFamily: "monospace", background: lbTab === t ? C.mg : "transparent", color: lbTab === t ? "#fff" : C.dim, boxShadow: lbTab === t ? `0 0 15px ${C.mglow}` : "none", transition: "all 0.2s" }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 640 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surf2, borderBottom: `1px solid ${C.border}` }}>
                  {["Rank", "Username", "Time"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: C.dim, textAlign: "left", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lbData[lbTab] || []).length === 0
                  ? <tr><td colSpan={3} style={{ padding: 40, textAlign: "center", color: C.dim, fontSize: "0.8rem" }}>No entries yet — be the first!</td></tr>
                  : (lbData[lbTab] || []).map((e, i) => {
                      const rank = i + 1;
                      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                      const rc = rank === 1 ? C.gold : rank === 2 ? C.silver : rank === 3 ? C.bronze : C.dim;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ fontWeight: 800, fontSize: "1rem", color: rc, textShadow: rank <= 3 ? `0 0 10px ${rc}` : "none" }}>{medal}</span>
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: C.text }}>{e.user}</td>
                          <td style={{ padding: "12px 16px", color: C.mg }}>{fmt(e.t)}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <QwertiAppBtn />
        </div>
      )}

      {/* ════ WIN OVERLAY ════ */}
      {won && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(7,9,14,0.92)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.surf, border: `1px solid ${C.mg}`, borderRadius: 20, padding: "40px 32px", maxWidth: 420, width: "90%", textAlign: "center", boxShadow: `0 0 80px ${C.mglow},0 0 160px rgba(217,70,239,0.08)`, display: "flex", flexDirection: "column", gap: 16, animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ fontSize: "2.8rem" }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: "2rem", color: C.mg, textShadow: `0 0 30px ${C.mg}` }}>Logo Restored!</div>
            <div style={{ color: C.mid, fontSize: "0.9rem" }}>
              Completed in<br />
              <span style={{ fontWeight: 800, fontSize: "1.7rem", color: C.text }}>{fmt(winT)}</span>
            </div>
            {winRank <= LB_MAX && (
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.mg }}>
                🏆 Ranked #{winRank} on {level} leaderboard!
              </div>
            )}
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <PrimaryBtn onClick={() => { setWon(false); startGame(level); }} style={{ flex: 1 }}>Play Again</PrimaryBtn>
              <GhostBtn onClick={() => { setWon(false); setLbData(loadLB()); setLbTab(level); setScreen("leaderboard"); }}>Leaderboard</GhostBtn>
            </div>
            <GhostBtn onClick={() => { setWon(false); goBack(); }} style={{ width: "100%" }}>← Choose Level</GhostBtn>
          </div>
        </div>
      )}
    </div>
  );
}
