"use client";
import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────
const LEVELS = {
  easy:   { cols: 2, rows: 4, label: "Initiate",  desc: "8 tiles · gentle intro"        },
  normal: { cols: 3, rows: 4, label: "Builder",   desc: "12 tiles · moderate challenge" },
  hard:   { cols: 4, rows: 5, label: "Architect", desc: "20 tiles · chaos mode"         },
};
const LB_KEY    = "qwerti_lb_v5";
const LB_MAX    = 10;
const APP_URL   = "https://app.qwerti.ai?ref=67c-01008";
const LW = 400, LH = 400; // logo viewBox

// ─────────────────────────────────────────────
//  COLOURS
// ─────────────────────────────────────────────
const C = {
  bg:"#07090e", surf:"#111520", surf2:"#181d2a",
  mg:"#d946ef", mglow:"rgba(217,70,239,0.35)", mdim:"rgba(217,70,239,0.12)",
  border:"rgba(217,70,239,0.22)", text:"#e8eaf0", dim:"#4a5278", mid:"#8890b0",
  gold:"#f5c518", silver:"#aab4c8", bronze:"#cd7f32",
  green:"#20d9a0", red:"#f43f5e",
  frame:"#3b2510", frameLight:"#5c3a1a", frameDark:"#1e1005",
  twitter:"#1d9bf0",
};

// ─────────────────────────────────────────────
//  LEADERBOARD UTILS
// ─────────────────────────────────────────────
function loadLB() {
  try { return JSON.parse(localStorage.getItem(LB_KEY)) || { easy:[], normal:[], hard:[] }; }
  catch { return { easy:[], normal:[], hard:[] }; }
}
function saveLB(d) { try { localStorage.setItem(LB_KEY, JSON.stringify(d)); } catch {} }

function recordTime(lvl, handle, t) {
  const d = loadLB();
  // Keep only best time per handle
  d[lvl] = d[lvl].filter(e => e.handle !== handle);
  d[lvl].push({ handle, t });
  d[lvl].sort((a, b) => a.t - b.t);
  d[lvl] = d[lvl].slice(0, LB_MAX);
  saveLB(d);
  return d[lvl].findIndex(e => e.handle === handle) + 1;
}

function getBest(handle, lvl) {
  const d = loadLB();
  const e = (d[lvl] || []).find(x => x.handle === handle);
  return e ? e.t : null;
}

function fmtTime(s) {
  if (s === null || s === undefined) return "--";
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${String(sec).padStart(2,"0")}s` : `${s}s`;
}

function normalizeHandle(raw) {
  const s = raw.trim().replace(/\s+/g, "");
  if (!s) return "";
  return s.startsWith("@") ? s : `@${s}`;
}

// ─────────────────────────────────────────────
//  SHUFFLE — guaranteed not sorted
// ─────────────────────────────────────────────
function doShuffle(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // If accidentally sorted, shuffle again
  if (a.every((v, i) => v === i)) return doShuffle(n);
  return a;
}

// ─────────────────────────────────────────────
//  LOGO SVG PATHS
// ─────────────────────────────────────────────
function rr(x, y, w, h, r) {
  return `M${x+r},${y}h${w-2*r}a${r},${r} 0 0 1 ${r},${r}v${h-2*r}a${r},${r} 0 0 1 -${r},${r}h-${w-2*r}a${r},${r} 0 0 1 -${r},-${r}v-${h-2*r}a${r},${r} 0 0 1 ${r},-${r}z`;
}
const OUTER = rr(55,15,290,290,72);
const INNER = rr(118,78,164,164,42);
const BAR   = rr(105,332,190,38,12);

// ─────────────────────────────────────────────
//  TILE SVG
// ─────────────────────────────────────────────
function Tile({ id, cols, rows, w, h, correct }) {
  const col = id % cols;
  const row = Math.floor(id / cols);
  const vx = col * (LW / cols);
  const vy = row * (LH / rows);
  const vw = LW / cols;
  const vh = LH / rows;
  const uid = `tile_${id}_${cols}_${rows}`;
  return (
    <svg width={w} height={h} viewBox={`${vx} ${vy} ${vw} ${vh}`}
      style={{ display:"block", pointerEvents:"none" }}>
      <defs>
        <clipPath id={uid}>
          <rect x={vx} y={vy} width={vw} height={vh}/>
        </clipPath>
      </defs>
      <rect x={vx} y={vy} width={vw} height={vh} fill="#0c0e18"/>
      <g clipPath={`url(#${uid})`}>
        <path d={`${OUTER} ${INNER}`} fill={correct ? "#ffffff" : "#dde0f0"} fillRule="evenodd"/>
        <path d={BAR} fill="rgba(217,70,239,0.25)" transform="translate(0,2)"/>
        <path d={BAR} fill="#d946ef"/>
      </g>
      <rect x={vx+0.5} y={vy+0.5} width={vw-1} height={vh-1} fill="none"
        stroke={correct ? "rgba(32,217,160,0.8)" : "rgba(217,70,239,0.22)"} strokeWidth={1.5}/>
    </svg>
  );
}

// ─────────────────────────────────────────────
//  SHARED UI
// ─────────────────────────────────────────────
function PBtn({ onClick, children, style={} }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:C.mg, color:"#fff", border:"none", borderRadius:10,
        padding:"13px 22px", fontFamily:"monospace", fontWeight:800,
        fontSize:"0.9rem", letterSpacing:"0.04em", cursor:"pointer",
        boxShadow: h?`0 0 32px ${C.mglow}`:`0 0 16px ${C.mglow}`,
        transform: h?"translateY(-2px)":"none",
        transition:"all 0.15s", ...style }}>
      {children}
    </button>
  );
}

function GBtn({ onClick, children, style={} }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:"transparent",
        border:`1px solid ${h?C.mg:C.border}`,
        color: h?C.mg:C.mid, borderRadius:10,
        padding:"10px 16px", fontFamily:"monospace",
        fontSize:"0.72rem", cursor:"pointer",
        transition:"all 0.2s", whiteSpace:"nowrap", ...style }}>
      {children}
    </button>
  );
}

function AppBtn() {
  const [h, setH] = useState(false);
  return (
    <a href={APP_URL} target="_blank" rel="noopener noreferrer"
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        gap:8, background: h?"rgba(217,70,239,0.12)":"rgba(217,70,239,0.06)",
        border:`1px solid ${h?C.mg:"rgba(217,70,239,0.3)"}`,
        color: h?C.mg:C.mid, borderRadius:12,
        padding:"11px 24px", fontFamily:"monospace",
        fontSize:"0.78rem", fontWeight:700, letterSpacing:"0.06em",
        textDecoration:"none",
        boxShadow: h?`0 0 24px ${C.mglow}`:"none",
        transition:"all 0.2s" }}>
      <span>⚡</span>Try the Qwerti App
    </a>
  );
}

function LvlCard({ lvl, onClick }) {
  const [h, setH] = useState(false);
  const color = {easy:C.green, normal:C.gold, hard:C.red}[lvl];
  const {label, desc} = LEVELS[lvl];
  return (
    <div onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{ background:C.surf, border:`1px solid ${h?color:C.border}`,
        borderRadius:16, padding:"26px 20px", cursor:"pointer",
        transform:h?"translateY(-4px)":"none",
        boxShadow:h?`0 0 36px rgba(217,70,239,0.13)`:"none",
        transition:"all 0.2s", display:"flex", flexDirection:"column",
        gap:10, position:"relative", overflow:"hidden" }}>
      {h && <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(217,70,239,0.06),transparent 60%)",pointerEvents:"none" }}/>}
      <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:"0.6rem",letterSpacing:"0.2em",textTransform:"uppercase",color }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}` }}/>{lvl}
      </div>
      <div style={{ fontWeight:800, fontSize:"1.4rem", color:C.text }}>{label}</div>
      <div style={{ fontSize:"0.7rem", color:C.dim, lineHeight:1.6 }}>{desc}</div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PARTICLES
// ─────────────────────────────────────────────
function Particles({ active }) {
  const [ps, setPs] = useState([]);
  useEffect(() => {
    if (!active) { setPs([]); return; }
    const cols = [C.mg,"#a855f7",C.gold,C.green,C.red,"#fff"];
    setPs(Array.from({length:70},(_,i)=>({
      id:i, x:Math.random()*100, y:Math.random()*100,
      dx:(Math.random()-0.5)*35, dy:-(Math.random()*28+8),
      size:Math.random()*10+4,
      color:cols[Math.floor(Math.random()*cols.length)],
      dur:0.8+Math.random()*0.7, delay:Math.random()*0.35,
    })));
    const t = setTimeout(()=>setPs([]), 2500);
    return ()=>clearTimeout(t);
  }, [active]);
  return (
    <>
      {ps.map(p=>(
        <div key={p.id} style={{
          position:"fixed", left:`${p.x}vw`, top:`${p.y}vh`,
          width:p.size, height:p.size, borderRadius:"50%",
          background:p.color, boxShadow:`0 0 ${p.size*2}px ${p.color}`,
          pointerEvents:"none", zIndex:9999,
          animation:`fly ${p.dur}s ease-out ${p.delay}s forwards`,
          "--dx":`${p.dx}vw`, "--dy":`${p.dy}vh`,
        }}/>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────
//  APP
// ─────────────────────────────────────────────
export default function App() {
  // ── screens: connect | levels | game | leaderboard
  const [screen,  setScreen]  = useState("connect");
  const [handle,  setHandle]  = useState("");       // confirmed @handle
  const [hInput,  setHInput]  = useState("");
  const [hErr,    setHErr]    = useState("");

  // ── game state (plain values, NOT inside stale closures)
  const [level,   setLevel]   = useState("easy");
  const [tiles,   setTiles]   = useState([]);       // array of tileIds in grid positions
  const [drag,    setDrag]    = useState(null);     // position index being dragged
  const [over,    setOver]    = useState(null);     // position index being hovered

  // ── timer
  const [secs,    setSecs]    = useState(0);
  const timerRef  = useRef(null);

  // ── result
  const [won,     setWon]     = useState(false);
  const [winSecs, setWinSecs] = useState(0);
  const [winRank, setWinRank] = useState(null);
  const [showParticles, setShowParticles] = useState(false);

  // ── feedback message
  const [msg,     setMsg]     = useState({ text:"", ok:true });

  // ── correct cells (highlighted green)
  const [correct, setCorrect] = useState([]);       // set of position indices

  // ── leaderboard tab
  const [lbTab,   setLbTab]   = useState("easy");
  const [lbData,  setLbData]  = useState({easy:[],normal:[],hard:[]});

  // ── board pixel width
  const [bw, setBw] = useState(360);
  const boardRef = useRef(null);

  // measure board width
  useEffect(()=>{
    if(screen!=="game") return;
    const m=()=>{ if(boardRef.current) setBw(boardRef.current.clientWidth); };
    m();
    window.addEventListener("resize",m);
    return ()=>window.removeEventListener("resize",m);
  },[screen]);

  // cleanup timer on unmount
  useEffect(()=>()=>clearInterval(timerRef.current),[]);

  // ─── TIMER helpers ───────────────────────────────────
  function startClock() {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(()=>setSecs(s=>s+1), 1000);
  }
  function stopClock() {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // ─── CONNECT handle ──────────────────────────────────
  function connectHandle() {
    const h = normalizeHandle(hInput);
    if (!h || h.replace("@","").length < 2) {
      setHErr("Please enter a valid Twitter handle."); return;
    }
    setHErr("");
    setHandle(h);
    setScreen("levels");
  }

  // ─── START GAME ──────────────────────────────────────
  function startGame(lvl) {
    const {cols, rows} = LEVELS[lvl];
    const n = cols * rows;
    stopClock();
    setLevel(lvl);
    setTiles(doShuffle(n));
    setSecs(0);
    setWon(false);
    setCorrect([]);
    setMsg({text:"",ok:true});
    setDrag(null);
    setOver(null);
    setScreen("game");
    setTimeout(startClock, 60);
  }

  // ─── SHUFFLE BUTTON ──────────────────────────────────
  // Re-scrambles tiles completely. Timer keeps running.
  function handleShuffle() {
    const {cols, rows} = LEVELS[level];
    const n = cols * rows;
    setTiles(doShuffle(n));       // always produces a new scrambled order
    setCorrect([]);
    setMsg({text:"Tiles reshuffled — good luck! 🔀",ok:true});
  }

  // ─── CHECK PLACEMENT BUTTON ──────────────────────────
  // Reads tiles directly from state at call time — no stale ref needed
  // because this function is recreated fresh on every render.
  function handleCheck() {
    if (!tiles || tiles.length === 0) return;

    const correctPositions = tiles
      .map((tileId, posIdx) => ({ tileId, posIdx, isCorrect: tileId === posIdx }));

    const correctSet  = correctPositions.filter(x => x.isCorrect).map(x => x.posIdx);
    const totalTiles  = tiles.length;
    const totalCorrect = correctSet.length;

    setCorrect(correctSet);

    if (totalCorrect === totalTiles) {
      // ── PUZZLE COMPLETE ──
      stopClock();
      const finalTime = secs;
      setWon(true);
      setWinSecs(finalTime);
      const rank = recordTime(level, handle, finalTime);
      setWinRank(rank);
      setShowParticles(true);
      setTimeout(()=>setShowParticles(false), 2600);
      setMsg({text:"",ok:true});
    } else if (totalCorrect === 0) {
      setMsg({text:"Keep trying! None of the tiles are in the right place yet. 💪",ok:false});
    } else {
      setMsg({text:`Getting there! ${totalCorrect} of ${totalTiles} tiles are correct. Keep going! 🧩`,ok:true});
    }
  }

  // ─── DRAG HANDLERS ───────────────────────────────────
  function onDragStart(e, posIdx) {
    e.dataTransfer.effectAllowed = "move";
    setDrag(posIdx);
  }
  function onDragEnter(e, posIdx) {
    e.preventDefault();
    setOver(posIdx);
  }
  function onDragOverCell(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDrop(e, posIdx) {
    e.preventDefault();
    if (drag === null || drag === posIdx) { setDrag(null); setOver(null); return; }
    setTiles(prev => {
      const next = [...prev];
      [next[drag], next[posIdx]] = [next[posIdx], next[drag]];
      return next;
    });
    setDrag(null);
    setOver(null);
    // Clear correct highlights after a move since state changed
    setCorrect([]);
    setMsg({text:"",ok:true});
  }
  function onDragEndCell() {
    setDrag(null);
    setOver(null);
  }

  // ─── TOUCH HANDLERS ──────────────────────────────────
  const touchFromRef = useRef(null);
  const touchOverRef = useRef(null);

  function onTouchStart(e, posIdx) {
    touchFromRef.current = posIdx;
    setDrag(posIdx);
  }
  function onTouchMoveBoard(e) {
    e.preventDefault();
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el) {
      const cell = el.closest("[data-pos]");
      if (cell) {
        const idx = parseInt(cell.dataset.pos);
        touchOverRef.current = idx;
        setOver(idx);
      }
    }
  }
  function onTouchEndBoard(e) {
    e.preventDefault();
    const from = touchFromRef.current;
    const to   = touchOverRef.current;
    if (from !== null && to !== null && from !== to) {
      setTiles(prev => {
        const next = [...prev];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
      });
      setCorrect([]);
      setMsg({text:"",ok:true});
    }
    touchFromRef.current = null;
    touchOverRef.current = null;
    setDrag(null);
    setOver(null);
  }

  // ─── DERIVED VALUES ───────────────────────────────────
  const {cols, rows} = LEVELS[level] || LEVELS.easy;
  const cellW = bw > 0 ? Math.floor(bw / cols) : 80;
  const cellH = bw > 0 ? Math.floor((bw * LH/LW) / rows) : 80;
  const lvlColor = {easy:C.green, normal:C.gold, hard:C.red};
  const mm = String(Math.floor(secs/60)).padStart(2,"0");
  const ss = String(secs%60).padStart(2,"0");

  // ─────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────
  return (
    <div style={{fontFamily:"monospace",background:C.bg,minHeight:"100vh",color:C.text,overflowX:"hidden",position:"relative"}}
      onTouchMove={screen==="game"?onTouchMoveBoard:undefined}
      onTouchEnd={screen==="game"?onTouchEndBoard:undefined}>

      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fly{to{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0)}}
        @keyframes xpulse{0%,100%{box-shadow:0 0 0 0 rgba(29,155,240,0.4)}50%{box-shadow:0 0 0 8px rgba(29,155,240,0)}}
        *{box-sizing:border-box;} input{outline:none;}
        .tc{cursor:grab;transition:transform 0.1s,opacity 0.1s,box-shadow 0.1s;border-radius:4px;overflow:hidden;user-select:none;touch-action:none;line-height:0;}
        .tc:active{cursor:grabbing;}
        .tc.dragging{opacity:0.3;transform:scale(0.92);}
        .tc.hovering{box-shadow:0 0 0 3px #d946ef,0 0 20px rgba(217,70,239,0.55);transform:scale(1.05);z-index:20;}
        .tc.correct{box-shadow:0 0 0 2px #20d9a0,0 0 14px rgba(32,217,160,0.5);}
      `}</style>

      {/* BG decoration */}
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,background:`radial-gradient(ellipse 70% 50% at 75% 5%,rgba(217,70,239,0.09),transparent 70%),radial-gradient(ellipse 50% 40% at 15% 85%,rgba(217,70,239,0.05),transparent 70%)`}}/>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,opacity:0.03,backgroundImage:`linear-gradient(${C.mg} 1px,transparent 1px),linear-gradient(90deg,${C.mg} 1px,transparent 1px)`,backgroundSize:"56px 56px"}}/>

      <Particles active={showParticles}/>

      {/* ══════════ CONNECT SCREEN ══════════ */}
      {screen==="connect" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,padding:24,position:"relative",zIndex:1,animation:"fadeUp 0.5s ease"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <div style={{width:74,height:74,border:"14px solid #dde",borderRadius:22,boxShadow:`0 0 40px ${C.mglow}`,animation:"pulse 3s ease-in-out infinite"}}/>
            <div style={{width:46,height:10,background:C.mg,borderRadius:4,boxShadow:`0 0 20px ${C.mg}`,animation:"pulse 3s ease-in-out infinite 0.5s"}}/>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:"clamp(2rem,6vw,3.2rem)",lineHeight:1,letterSpacing:"-0.02em"}}>
              QWERTI<br/><span style={{color:C.mg,textShadow:`0 0 30px ${C.mg}`}}>PUZZLE</span>
            </div>
            <div style={{marginTop:10,fontSize:"0.68rem",letterSpacing:"0.22em",textTransform:"uppercase",color:C.dim}}>
              reconstruct the logo · race the clock
            </div>
          </div>
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:16,padding:32,width:"100%",maxWidth:420,display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(29,155,240,0.12)",border:"1px solid rgba(29,155,240,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",animation:"xpulse 2.5s ease-in-out infinite"}}>𝕏</div>
              <div>
                <div style={{fontWeight:800,fontSize:"0.95rem",color:C.text}}>Connect via Twitter / X</div>
                <div style={{fontSize:"0.65rem",color:C.dim,marginTop:2}}>Your handle will appear on the leaderboard</div>
              </div>
            </div>
            <div>
              <label style={{fontSize:"0.62rem",letterSpacing:"0.18em",textTransform:"uppercase",color:C.dim}}>Twitter handle</label>
              <div style={{position:"relative",marginTop:8}}>
                <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:C.twitter,fontWeight:800,fontSize:"1rem",pointerEvents:"none"}}>@</span>
                <input value={hInput.startsWith("@")?hInput.slice(1):hInput}
                  onChange={e=>setHInput(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&connectHandle()}
                  placeholder="yourtwittername" maxLength={20} autoComplete="off" autoCapitalize="none" spellCheck={false}
                  style={{display:"block",width:"100%",background:C.bg,border:`1px solid ${hInput?C.twitter:"rgba(29,155,240,0.25)"}`,borderRadius:10,padding:"12px 14px 12px 36px",color:C.text,fontFamily:"monospace",fontSize:"1rem",fontWeight:700,boxShadow:hInput?`0 0 0 3px rgba(29,155,240,0.1)`:"none",transition:"all 0.2s"}}/>
              </div>
            </div>
            {hErr && <div style={{fontSize:"0.72rem",color:C.red,textAlign:"center"}}>{hErr}</div>}
            <button onClick={connectHandle}
              style={{width:"100%",background:"linear-gradient(135deg,#1d9bf0,#1a6fc4)",color:"#fff",border:"none",borderRadius:10,padding:"13px 22px",fontFamily:"monospace",fontWeight:800,fontSize:"0.95rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 20px rgba(29,155,240,0.35)",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"}
              onMouseLeave={e=>e.currentTarget.style.transform="none"}>
              <span>𝕏</span> Connect & Play
            </button>
            <div style={{fontSize:"0.62rem",color:C.dim,textAlign:"center",lineHeight:1.5}}>Your best times are saved to your handle.<br/>No password needed.</div>
          </div>
          <AppBtn/>
        </div>
      )}

      {/* ══════════ LEVELS SCREEN ══════════ */}
      {screen==="levels" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:28,padding:24,position:"relative",zIndex:1,animation:"fadeUp 0.4s ease"}}>
          <div style={{width:"100%",maxWidth:700,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <GBtn onClick={()=>setScreen("connect")}>← Change Handle</GBtn>
            <div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(29,155,240,0.08)",border:"1px solid rgba(29,155,240,0.2)",borderRadius:20,padding:"6px 14px"}}>
              <span style={{color:C.twitter}}>𝕏</span>
              <span style={{fontWeight:700,fontSize:"0.82rem",color:C.text}}>{handle}</span>
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:"clamp(1.6rem,4vw,2.4rem)"}}>Select Difficulty</div>
            {/* Show existing best times if any */}
            {(()=>{
              const d = loadLB();
              const bests = ["easy","normal","hard"].map(l=>({l,t:getBest(handle,l)})).filter(x=>x.t!==null);
              return bests.length>0?(
                <div style={{marginTop:8,fontSize:"0.68rem",color:C.mid}}>
                  Your best times:
                  {bests.map(b=>(
                    <span key={b.l} style={{color:{easy:C.green,normal:C.gold,hard:C.red}[b.l],marginLeft:8}}>
                      {b.l} {fmtTime(b.t)}
                    </span>
                  ))}
                </div>
              ):null;
            })()}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,width:"100%",maxWidth:700}}>
            {["easy","normal","hard"].map(l=><LvlCard key={l} lvl={l} onClick={()=>startGame(l)}/>)}
          </div>
          <GBtn onClick={()=>{setLbData(loadLB());setLbTab("easy");setScreen("leaderboard");}}>
            View Leaderboards →
          </GBtn>
          <AppBtn/>
        </div>
      )}

      {/* ══════════ GAME SCREEN ══════════ */}
      {screen==="game" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 14px",gap:14,position:"relative",zIndex:1}}>

          {/* Header */}
          <div style={{width:"100%",maxWidth:520,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <GBtn onClick={()=>{stopClock();setWon(false);setScreen("levels");}}>← Back</GBtn>
              <div style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.6rem",letterSpacing:"0.15em",textTransform:"uppercase",color:lvlColor[level]}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:lvlColor[level],boxShadow:`0 0 8px ${lvlColor[level]}`}}/>{level} · {LEVELS[level].label}
              </div>
            </div>
            {/* Timer */}
            <div style={{fontWeight:800,fontSize:"2rem",color:C.mg,textShadow:`0 0 20px ${C.mglow}`,letterSpacing:"0.06em"}}>
              {mm}:{ss}
            </div>
          </div>

          {/* Handle + best time */}
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.65rem",color:C.mid}}>
            <span style={{color:C.twitter}}>𝕏</span>
            <span style={{fontWeight:700,color:C.text}}>{handle}</span>
            {getBest(handle,level)!==null && (
              <span style={{color:C.dim,marginLeft:4}}>· best: {fmtTime(getBest(handle,level))}</span>
            )}
          </div>

          <div style={{fontSize:"0.6rem",color:C.dim,letterSpacing:"0.12em",textTransform:"uppercase"}}>
            drag tiles to swap · hit check when ready
          </div>

          {/* ── BOARD ── */}
          <div style={{width:"100%",maxWidth:520,position:"relative"}}>
            <div style={{background:`linear-gradient(160deg,${C.frameLight} 0%,${C.frame} 50%,${C.frameDark} 100%)`,borderRadius:20,padding:14,boxShadow:`0 0 0 1px ${C.frameLight},0 12px 50px rgba(0,0,0,0.8),inset 0 2px 6px rgba(255,180,80,0.1)`,position:"relative"}}>
              <div style={{position:"absolute",inset:0,borderRadius:20,pointerEvents:"none",opacity:0.07,backgroundImage:`repeating-linear-gradient(8deg,transparent,transparent 6px,rgba(255,200,120,0.4) 7px,transparent 8px)`}}/>
              <div style={{borderRadius:10,overflow:"hidden",boxShadow:"inset 0 3px 10px rgba(0,0,0,0.7)"}}>
                <div ref={boardRef} style={{width:"100%"}}>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(${cols},1fr)`,gap:3,background:"#030406",padding:3}}>
                    {tiles.map((tileId, posIdx) => {
                      const isCorrect = correct.includes(posIdx);
                      const isDragging = drag === posIdx;
                      const isOver = over === posIdx;
                      return (
                        <div key={posIdx} data-pos={posIdx}
                          className={`tc${isDragging?" dragging":""}${isOver?" hovering":""}${isCorrect?" correct":""}`}
                          draggable={!won}
                          onDragStart={e=>onDragStart(e,posIdx)}
                          onDragEnter={e=>onDragEnter(e,posIdx)}
                          onDragOver={onDragOverCell}
                          onDrop={e=>onDrop(e,posIdx)}
                          onDragEnd={onDragEndCell}
                          onTouchStart={won?undefined:e=>onTouchStart(e,posIdx)}
                          style={{aspectRatio:`${LW/cols} / ${LH/rows}`}}>
                          <Tile id={tileId} cols={cols} rows={rows} w={cellW} h={cellH} correct={isCorrect}/>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── BUTTONS ── */}
          <div style={{display:"flex",gap:10,width:"100%",maxWidth:520}}>
            {/*
              CHECK PLACEMENT:
              Calls handleCheck() directly — no stale closure issues because
              handleCheck() reads `tiles` and `secs` from the component's current render scope.
              Both are plain useState values, always fresh on every render.
            */}
            <PBtn onClick={handleCheck} style={{flex:1}}>✓ Check Placement</PBtn>

            {/*
              SHUFFLE:
              Calls handleShuffle() which calls doShuffle(n) — always produces
              a fresh scrambled array and sets it directly into state.
              Timer is NOT reset. Screen does NOT change.
            */}
            <GBtn onClick={handleShuffle}>↺ Shuffle</GBtn>
          </div>

          {/* Feedback message */}
          {msg.text && (
            <div style={{fontSize:"0.78rem",color:msg.ok?C.green:C.red,textAlign:"center",letterSpacing:"0.03em",maxWidth:520,lineHeight:1.5}}>
              {msg.text}
            </div>
          )}

          <div style={{marginTop:4}}><AppBtn/></div>
        </div>
      )}

      {/* ══════════ LEADERBOARD SCREEN ══════════ */}
      {screen==="leaderboard" && (
        <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",padding:24,gap:20,position:"relative",zIndex:1,animation:"fadeUp 0.4s ease"}}>
          <div style={{width:"100%",maxWidth:640,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{fontWeight:800,fontSize:"1.8rem"}}>Leaderboard</div>
            <GBtn onClick={()=>setScreen("levels")}>← Back</GBtn>
          </div>
          <div style={{display:"flex",gap:6,background:C.surf,border:`1px solid ${C.border}`,borderRadius:10,padding:4}}>
            {["easy","normal","hard"].map(t=>(
              <button key={t} onClick={()=>setLbTab(t)}
                style={{padding:"8px 18px",borderRadius:7,fontSize:"0.68rem",letterSpacing:"0.1em",textTransform:"uppercase",cursor:"pointer",border:"none",fontFamily:"monospace",background:lbTab===t?C.mg:"transparent",color:lbTab===t?"#fff":C.dim,boxShadow:lbTab===t?`0 0 15px ${C.mglow}`:"none",transition:"all 0.2s"}}>
                {t}
              </button>
            ))}
          </div>
          <div style={{background:C.surf,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",width:"100%",maxWidth:640}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:C.surf2,borderBottom:`1px solid ${C.border}`}}>
                  {["Rank","Twitter / X","Time"].map(h=>(
                    <th key={h} style={{padding:"12px 16px",fontSize:"0.58rem",letterSpacing:"0.2em",textTransform:"uppercase",color:C.dim,textAlign:"left",fontWeight:400}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lbData[lbTab]||[]).length===0
                  ?<tr><td colSpan={3} style={{padding:40,textAlign:"center",color:C.dim,fontSize:"0.8rem"}}>No entries yet — be the first!</td></tr>
                  :(lbData[lbTab]||[]).map((e,i)=>{
                    const rank=i+1;
                    const medal=rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":`#${rank}`;
                    const rc=rank===1?C.gold:rank===2?C.silver:rank===3?C.bronze:C.dim;
                    const isMe=e.handle===handle;
                    return(
                      <tr key={i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)",background:isMe?"rgba(217,70,239,0.06)":"transparent"}}>
                        <td style={{padding:"12px 16px"}}>
                          <span style={{fontWeight:800,fontSize:"1rem",color:rc,textShadow:rank<=3?`0 0 10px ${rc}`:"none"}}>{medal}</span>
                        </td>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{color:C.twitter,fontSize:"0.8rem"}}>𝕏</span>
                            <span style={{fontWeight:700,color:isMe?C.mg:C.text}}>{e.handle}</span>
                            {isMe&&<span style={{fontSize:"0.55rem",background:C.mdim,color:C.mg,borderRadius:4,padding:"2px 6px",letterSpacing:"0.1em"}}>YOU</span>}
                          </div>
                        </td>
                        <td style={{padding:"12px 16px",color:C.mg,fontWeight:700}}>{fmtTime(e.t)}</td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
          <AppBtn/>
        </div>
      )}

      {/* ══════════ WIN OVERLAY ══════════ */}
      {won && (
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(7,9,14,0.92)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:C.surf,border:`1px solid ${C.mg}`,borderRadius:20,padding:"40px 32px",maxWidth:440,width:"90%",textAlign:"center",boxShadow:`0 0 80px ${C.mglow},0 0 160px rgba(217,70,239,0.08)`,display:"flex",flexDirection:"column",gap:16,animation:"popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)"}}>
            <div style={{fontSize:"3rem"}}>🎉</div>
            <div style={{fontWeight:800,fontSize:"2.2rem",color:C.mg,textShadow:`0 0 30px ${C.mg}`}}>Congratulations!</div>
            <div style={{fontWeight:800,fontSize:"1rem",color:C.text}}>Logo Fully Restored!</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,color:C.mid,fontSize:"0.82rem"}}>
              <span style={{color:C.twitter}}>𝕏</span>
              <span style={{fontWeight:700,color:C.text}}>{handle}</span>
            </div>
            <div style={{color:C.mid,fontSize:"0.9rem"}}>
              Completed in<br/>
              <span style={{fontWeight:800,fontSize:"2rem",color:C.text}}>{fmtTime(winSecs)}</span>
            </div>
            {winRank<=LB_MAX?(
              <div style={{fontSize:"0.75rem",letterSpacing:"0.1em",textTransform:"uppercase",color:C.mg,background:C.mdim,borderRadius:8,padding:"8px 16px"}}>
                🏆 You ranked #{winRank} on the {level} leaderboard!
              </div>
            ):(
              <div style={{fontSize:"0.72rem",color:C.dim}}>Finish faster to crack the top {LB_MAX}!</div>
            )}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <PBtn onClick={()=>{setWon(false);startGame(level);}} style={{flex:1}}>Play Again</PBtn>
              <GBtn onClick={()=>{setWon(false);setLbData(loadLB());setLbTab(level);setScreen("leaderboard");}}>Leaderboard</GBtn>
            </div>
            <GBtn onClick={()=>{setWon(false);stopClock();setScreen("levels");}} style={{width:"100%"}}>← Choose Level</GBtn>
            <AppBtn/>
          </div>
        </div>
      )}
    </div>
  );
}
