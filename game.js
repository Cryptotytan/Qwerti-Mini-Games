// ── YouTube Video IDs ─────────────────────────────────────
var YT_IDS = {
  easy:   "cpKlklE4NKI",
  normal: "0kcLgDgVugg",
  hard:   "FkIUkTsdCYg"
};

// ── YouTube IFrame API ────────────────────────────────────
var ytPlayers = {};
var ytReadyFlags = { easy: false, normal: false, hard: false };
var pendingPlay = null;
var currentPlayingLevel = null;

(function() {
  var s = document.createElement("script");
  s.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(s);
})();

function onYouTubeIframeAPIReady() {
  ["easy","normal","hard"].forEach(function(lvl) {
    ytPlayers[lvl] = new YT.Player("yt-" + lvl, {
      videoId: YT_IDS[lvl],
      playerVars: { autoplay:0, controls:0, loop:1, playlist:YT_IDS[lvl], mute:0, rel:0, modestbranding:1 },
      events: {
        onReady: (function(l) {
          return function(e) {
            ytReadyFlags[l] = true;
            e.target.setVolume(80);
            if (pendingPlay === l) { pendingPlay = null; doPlayLevel(l); }
          };
        })(lvl),
        onStateChange: (function(l) {
          return function(e) {
            if (e.data === YT.PlayerState.ENDED) { ytPlayers[l].seekTo(0); ytPlayers[l].playVideo(); }
          };
        })(lvl)
      }
    });
  });
}

function doPlayLevel(lvl) {
  ["easy","normal","hard"].forEach(function(l) {
    if (l !== lvl && ytReadyFlags[l]) { try { ytPlayers[l].pauseVideo(); ytPlayers[l].seekTo(0); } catch(e) {} }
  });
  if (!ytReadyFlags[lvl]) { pendingPlay = lvl; return; }
  try { ytPlayers[lvl].seekTo(0); ytPlayers[lvl].setVolume(80); ytPlayers[lvl].playVideo(); currentPlayingLevel = lvl; } catch(e) {}
}

function stopAllMusic() {
  ["easy","normal","hard"].forEach(function(l) {
    if (ytReadyFlags[l]) { try { ytPlayers[l].pauseVideo(); ytPlayers[l].seekTo(0); } catch(e) {} }
  });
  pendingPlay = null; currentPlayingLevel = null;
}

// ── Game State ────────────────────────────────────────────
var handle = "";
var currentLevelKey = "easy";
var tiles = [];
var correctPositions = [];
var timerInterval = null;
var elapsedSecs = 0;
var dragFromIdx = null;
var touchFromIdx = null;
var touchOverIdx = null;
var LB_MAX = 10;
var LEVELS = {
  easy:   { cols:2, rows:4, label:"Initiate"  },
  normal: { cols:3, rows:4, label:"Builder"   },
  hard:   { cols:4, rows:5, label:"Architect" }
};
var LVL_COLORS = { easy:"#20d9a0", normal:"#f5c518", hard:"#f43f5e" };
var LW = 400, LH = 400;
var localBests = { easy: null, normal: null, hard: null };

// ── Leaderboard API ───────────────────────────────────────
var API_BASE = "/api/leaderboard";

function fetchLeaderboard(lvl, callback) {
  showLbLoading(true);
  fetch(API_BASE + "?level=" + lvl)
    .then(function(r) { return r.json(); })
    .then(function(data) { showLbLoading(false); callback(null, data.entries || []); })
    .catch(function(err) { showLbLoading(false); callback(err, []); });
}

function submitScore(lvl, hdl, time, callback) {
  fetch(API_BASE + "?level=" + lvl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handle: hdl, time: time })
  })
    .then(function(r) { return r.json(); })
    .then(function(data) { callback(null, data); })
    .catch(function(err) { callback(err, null); });
}

function showLbLoading(on) {
  var el = document.getElementById("lb-loading");
  if (el) el.style.display = on ? "block" : "none";
}

function updateLocalBest(lvl, time) {
  if (localBests[lvl] === null || time < localBests[lvl]) localBests[lvl] = time;
}

function updateLevelsBests() {
  var parts = [];
  ["easy","normal","hard"].forEach(function(l) {
    var t = localBests[l];
    if (t !== null) parts.push('<span style="color:'+LVL_COLORS[l]+';margin-left:8px">'+l+' '+fmtTime(t)+'</span>');
  });
  document.getElementById("levels-bests").innerHTML = parts.length > 0 ? "Your best this session: " + parts.join("") : "";
}

// ── SVG Helpers ───────────────────────────────────────────
function rrPath(x,y,w,h,r) {
  return "M"+(x+r)+","+y+"h"+(w-2*r)+"a"+r+","+r+" 0 0 1 "+r+","+r
    +"v"+(h-2*r)+"a"+r+","+r+" 0 0 1 -"+r+","+r
    +"h-"+(w-2*r)+"a"+r+","+r+" 0 0 1 -"+r+",-"+r
    +"v-"+(h-2*r)+"a"+r+","+r+" 0 0 1 "+r+",-"+r+"z";
}
var OUTER = rrPath(55,15,290,290,72);
var INNER = rrPath(118,78,164,164,42);
var BAR   = rrPath(105,332,190,38,12);

function makeTileSVG(id, cols, rows, correct) {
  var vx = (id % cols) * (LW / cols);
  var vy = Math.floor(id / cols) * (LH / rows);
  var vw = LW / cols, vh = LH / rows;
  var uid = "t_"+id+"_"+cols+"_"+rows;
  var fill   = correct ? "#ffffff" : "#dde0f0";
  var stroke = correct ? "rgba(32,217,160,0.8)" : "rgba(217,70,239,0.22)";
  return '<svg viewBox="'+vx+' '+vy+' '+vw+' '+vh+'" style="display:block;pointer-events:none;width:100%;height:100%">'
    +'<defs><clipPath id="'+uid+'"><rect x="'+vx+'" y="'+vy+'" width="'+vw+'" height="'+vh+'"/></clipPath></defs>'
    +'<rect x="'+vx+'" y="'+vy+'" width="'+vw+'" height="'+vh+'" fill="#0c0e18"/>'
    +'<g clip-path="url(#'+uid+')">'
    +'<path d="'+OUTER+' '+INNER+'" fill="'+fill+'" fill-rule="evenodd"/>'
    +'<path d="'+BAR+'" fill="rgba(217,70,239,0.25)" transform="translate(0,2)"/>'
    +'<path d="'+BAR+'" fill="#d946ef"/>'
    +'</g>'
    +'<rect x="'+(vx+0.5)+'" y="'+(vy+0.5)+'" width="'+(vw-1)+'" height="'+(vh-1)+'" fill="none" stroke="'+stroke+'" stroke-width="1.5"/>'
    +'</svg>';
}

// ── Utilities ─────────────────────────────────────────────
function fmtTime(s) {
  var m = Math.floor(s / 60), r = s % 60;
  return m > 0 ? m+"m "+pad(r)+"s" : s+"s";
}
function pad(n) { return String(n).padStart(2,"0"); }

function doShuffle2(n) {
  var a = [];
  for (var i = 0; i < n; i++) a.push(i);
  for (var i = n-1; i > 0; i--) {
    var j = Math.floor(Math.random()*(i+1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  var ok = true;
  for (var i = 0; i < n; i++) if (a[i] !== i) { ok = false; break; }
  if (ok) return doShuffle2(n);
  return a;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(function(s) { s.classList.remove("active"); });
  document.getElementById("screen-"+id).classList.add("active");
}

// ── Timer ─────────────────────────────────────────────────
function startTimer() {
  stopTimer(); elapsedSecs = 0; updateTimerDisplay();
  timerInterval = setInterval(function() { elapsedSecs++; updateTimerDisplay(); }, 1000);
}
function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
function updateTimerDisplay() {
  document.getElementById("timer").textContent = pad(Math.floor(elapsedSecs/60))+":"+pad(elapsedSecs%60);
}

// ── Board ─────────────────────────────────────────────────
function renderBoard() {
  var lvl = LEVELS[currentLevelKey], cols = lvl.cols, rows = lvl.rows;
  var board = document.getElementById("board");
  board.style.gridTemplateColumns = "repeat("+cols+",1fr)";
  board.innerHTML = "";
  for (var posIdx = 0; posIdx < tiles.length; posIdx++) {
    var tileId = tiles[posIdx];
    var isCorrect = correctPositions.indexOf(posIdx) !== -1;
    var el = document.createElement("div");
    el.className = "tile" + (isCorrect ? " correct" : "");
    el.dataset.pos = posIdx;
    el.style.aspectRatio = (LW/cols)+" / "+(LH/rows);
    el.innerHTML = makeTileSVG(tileId, cols, rows, isCorrect);
    el.draggable = true;
    el.addEventListener("dragstart",  makeDragStart(posIdx));
    el.addEventListener("dragenter",  makeDragEnter(posIdx));
    el.addEventListener("dragover",   function(e) { e.preventDefault(); e.dataTransfer.dropEffect="move"; });
    el.addEventListener("drop",       makeDrop(posIdx));
    el.addEventListener("dragend",    function() { dragFromIdx = null; clearHover(); });
    el.addEventListener("touchstart", makeTouchStart(posIdx), { passive: true });
    board.appendChild(el);
  }
}

function makeDragStart(p) {
  return function(e) {
    e.dataTransfer.effectAllowed = "move"; dragFromIdx = p;
    var el = document.querySelector("[data-pos='"+p+"']");
    if (el) el.classList.add("dragging");
  };
}
function makeDragEnter(p) {
  return function(e) {
    e.preventDefault(); clearHover();
    var el = document.querySelector("[data-pos='"+p+"']");
    if (el) el.classList.add("hovering");
  };
}
function makeDrop(p) {
  return function(e) {
    e.preventDefault(); clearHover();
    var from = dragFromIdx; dragFromIdx = null;
    if (from === null || from === p) return;
    swapTiles(from, p);
  };
}
function makeTouchStart(p) {
  return function(e) {
    touchFromIdx = p;
    var el = document.querySelector("[data-pos='"+p+"']");
    if (el) el.classList.add("dragging");
  };
}
function clearHover() {
  document.querySelectorAll(".tile.hovering,.tile.dragging").forEach(function(t) {
    t.classList.remove("hovering","dragging");
  });
}
function swapTiles(from, to) {
  var tmp = tiles[from]; tiles[from] = tiles[to]; tiles[to] = tmp;
  correctPositions = []; setMsg("",""); renderBoard();
}

document.addEventListener("touchmove", function(e) {
  if (touchFromIdx === null) return; e.preventDefault();
  var pt = e.touches[0], el = document.elementFromPoint(pt.clientX, pt.clientY);
  if (el) {
    var cell = el.closest ? el.closest("[data-pos]") : null;
    if (cell) {
      var idx = parseInt(cell.dataset.pos);
      if (idx !== touchFromIdx) { touchOverIdx = idx; clearHover(); cell.classList.add("hovering"); }
    }
  }
}, { passive: false });

document.addEventListener("touchend", function(e) {
  if (touchFromIdx === null) return;
  var from = touchFromIdx, to = touchOverIdx;
  touchFromIdx = null; touchOverIdx = null; clearHover();
  if (from !== null && to !== null && from !== to) swapTiles(from, to);
});

// ── Connect ───────────────────────────────────────────────
function doConnect() {
  var raw = document.getElementById("handle-input").value;
  var h = raw.trim().replace(/\s+/g, "");
  if (!h) { showErr("Please enter a valid handle."); return; }
  if (!h.startsWith("@")) h = "@" + h;
  if (h.length < 3) { showErr("Handle too short."); return; }
  handle = h;
  hideErr();
  document.getElementById("levels-handle").textContent = handle;
  showScreen("levels");
  updateLevelsBests();
}

function showErr(msg) {
  var e = document.getElementById("handle-err");
  e.textContent = msg;
  e.style.display = "block";
}
function hideErr() {
  document.getElementById("handle-err").style.display = "none";
}

document.getElementById("handle-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") doConnect();
});

// ── Game ──────────────────────────────────────────────────
function startGame(lvl) {
  currentLevelKey = lvl;
  var cfg = LEVELS[lvl], n = cfg.cols * cfg.rows;
  tiles = doShuffle2(n); correctPositions = [];
  var color = LVL_COLORS[lvl];
  document.getElementById("game-lvl-badge").innerHTML =
    '<div style="width:6px;height:6px;border-radius:50%;background:'+color+';box-shadow:0 0 8px '+color+';flex-shrink:0"></div>'
    +'<span style="color:'+color+';letter-spacing:0.15em;text-transform:uppercase;font-size:0.6rem">'+lvl+' · '+cfg.label+'</span>';
  document.getElementById("game-handle").textContent = handle;
  var best = localBests[lvl];
  document.getElementById("game-best").textContent = best !== null ? "· best: "+fmtTime(best) : "";
  setMsg("",""); showScreen("game"); renderBoard(); startTimer();
  doPlayLevel(lvl);
}

function doBack() { stopTimer(); stopAllMusic(); showScreen("levels"); updateLevelsBests(); }

function doShuffle() {
  var cfg = LEVELS[currentLevelKey];
  tiles = doShuffle2(cfg.cols * cfg.rows); correctPositions = [];
  setMsg("Tiles reshuffled — good luck! 🔀","var(--green)"); renderBoard();
}

function doCheck() {
  var correct = [];
  for (var i = 0; i < tiles.length; i++) if (tiles[i] === i) correct.push(i);
  correctPositions = correct; renderBoard();

  if (correct.length === tiles.length) {
    stopTimer();
    var finalTime = elapsedSecs;
    updateLocalBest(currentLevelKey, finalTime);

    document.getElementById("win-handle").textContent = handle;
    document.getElementById("win-time").textContent = fmtTime(finalTime);

    var rMsg = document.getElementById("win-rank-msg");
    rMsg.textContent = "Saving your score...";
    rMsg.style.background = "var(--mdim)";
    rMsg.style.color = "var(--mid)";

    document.getElementById("win-overlay").classList.add("active");
    spawnParticles();

    submitScore(currentLevelKey, handle, finalTime, function(err, data) {
      if (err || !data) {
        rMsg.textContent = "Leaderboard unavailable right now.";
        rMsg.style.background = "transparent";
        rMsg.style.color = "var(--dim)";
        return;
      }
      if (data.improved === false) {
        // New time was slower — personal best stays
        rMsg.textContent = "Not your best time — your record still stands!";
        rMsg.style.background = "transparent";
        rMsg.style.color = "var(--dim)";
      } else if (data.inTop10 && data.rank) {
        rMsg.textContent = "You ranked #"+data.rank+" on the "+currentLevelKey+" leaderboard!";
        rMsg.style.background = "var(--mdim)";
        rMsg.style.color = "var(--mg)";
      } else {
        rMsg.textContent = "Finish faster to crack the top "+LB_MAX+"!";
        rMsg.style.background = "transparent";
        rMsg.style.color = "var(--dim)";
      }
    });

  } else if (correct.length === 0) {
    setMsg("Keep trying! None of the tiles are in the right place yet.","var(--red)");
  } else {
    setMsg("Getting there! "+correct.length+" of "+tiles.length+" tiles correct. Keep going!","var(--green)");
  }
}

function setMsg(text, color) {
  var el = document.getElementById("game-msg");
  if (!text) { el.style.display = "none"; return; }
  el.textContent = text; el.style.color = color; el.style.display = "block";
}

function closeWin() {
  document.getElementById("win-overlay").classList.remove("active");
  stopAllMusic(); showScreen("levels"); updateLevelsBests();
}
function playAgain() {
  document.getElementById("win-overlay").classList.remove("active");
  startGame(currentLevelKey);
}
function goToLeaderboard() {
  document.getElementById("win-overlay").classList.remove("active");
  stopAllMusic(); showLeaderboard();
}

// ── Leaderboard Screen ────────────────────────────────────
var currentLbTab = "easy";

function showLeaderboard() {
  currentLbTab = "easy";
  document.querySelectorAll(".lb-tab").forEach(function(t) { t.classList.remove("active"); });
  document.querySelector(".lb-tab").classList.add("active");
  showScreen("leaderboard");
  fetchLeaderboard("easy", function(err, entries) { renderLb(entries); });
}

function setLbTab(lvl, btn) {
  currentLbTab = lvl;
  document.querySelectorAll(".lb-tab").forEach(function(t) { t.classList.remove("active"); });
  btn.classList.add("active");
  fetchLeaderboard(lvl, function(err, entries) { renderLb(entries); });
}

function renderLb(entries) {
  var tbody = document.getElementById("lb-body");
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="padding:40px;text-align:center;color:var(--dim);font-size:0.8rem">No entries yet — be the first!</td></tr>';
    return;
  }
  var html = "";
  entries.forEach(function(e, i) {
    var rank = i + 1;
    var medal = rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":"#"+rank;
    var rc = rank===1?"var(--gold)":rank===2?"var(--silver)":rank===3?"var(--bronze)":"var(--dim)";
    var isMe = e.handle.toLowerCase() === handle.toLowerCase();
    var bg = isMe ? "rgba(217,70,239,0.06)" : "transparent";
    var nc = isMe ? "var(--mg)" : "var(--text)";
    var you = isMe ? '<span style="font-size:0.55rem;background:var(--mdim);color:var(--mg);border-radius:4px;padding:2px 6px;margin-left:4px">YOU</span>' : "";
    html += '<tr style="border-bottom:1px solid rgba(255,255,255,0.03);background:'+bg+'">'
      +'<td><span style="font-weight:800;font-size:1rem;color:'+rc+(rank<=3?";text-shadow:0 0 10px "+rc:"")+'">'+ medal+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:6px"><span style="color:var(--mg)">𝕏</span><span style="font-weight:700;color:'+nc+'">'+e.handle+'</span>'+you+'</div></td>'
      +'<td style="color:var(--mg);font-weight:700">'+fmtTime(e.time)+'</td></tr>';
  });
  tbody.innerHTML = html;
}

// ── Particles ─────────────────────────────────────────────
function spawnParticles() {
  var colors = ["#d946ef","#a855f7","#f5c518","#20d9a0","#f43f5e","#ffffff"];
  for (var i = 0; i < 60; i++) {
    (function() {
      var p = document.createElement("div");
      p.className = "particle";
      var size = Math.random()*10+4;
      var color = colors[Math.floor(Math.random()*colors.length)];
      var dx = (Math.random()-0.5)*35, dy = -(Math.random()*28+8);
      var dur = (0.8+Math.random()*0.7).toFixed(2), delay = (Math.random()*0.35).toFixed(2);
      p.style.cssText = "left:"+Math.random()*100+"vw;top:"+Math.random()*100+"vh;"
        +"width:"+size+"px;height:"+size+"px;background:"+color+";"
        +"box-shadow:0 0 "+(size*2)+"px "+color+";"
        +"--dx:"+dx+"vw;--dy:"+dy+"vh;"
        +"animation:fly "+dur+"s ease-out "+delay+"s forwards;";
      document.body.appendChild(p);
      setTimeout(function() { p.remove(); }, (parseFloat(dur)+parseFloat(delay)+0.1)*1000);
    })();
  }
}
