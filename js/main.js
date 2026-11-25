// ===== メイン：画面遷移・ロビー・ゲームループ =====
import { W, H, CHARS, PCOL, setSmooth, smClear, L, txt, rr, drawChar } from './engine.js';
import { GAMES, COURSES } from './games/index.js';
import { Director } from './director.js';
import { drawIntro, drawHUD, drawPops, banner, drawResult, drawFinal } from './screens.js';
import { raw, setInputListener, enableInput, bindCanvas, setupTouchPad } from './input.js';
import { hasConfig, connect, Room, norm } from './net.js';
import { sfx, unlock, setMute, isMuted } from './sfx.js';

const $ = (q) => document.querySelector(q);
const scr = (id) => { document.querySelectorAll('.screen').forEach((e) => e.classList.toggle('on', e.id === id)); };
const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); };

// ---------- プロフィール ----------
const prof = (() => { try { return JSON.parse(localStorage.getItem('nbr_prof')) || {}; } catch (e) { return {}; } })();
prof.name = prof.name || 'プレイヤー'; prof.ci = prof.ci ?? 0;
const saveProf = () => { try { localStorage.setItem('nbr_prof', JSON.stringify(prof)); } catch (e) { /* noop */ } };

function buildCharGrid() {
  const box = $('#chars'); box.innerHTML = '';
  CHARS.forEach((c, i) => {
    const b = document.createElement('button'); b.className = 'ch' + (i === prof.ci ? ' sel' : '');
    b.innerHTML = `<span class="face" style="background:${c.col}">${c.m}</span><span>${c.name}</span>`;
    b.onclick = () => { prof.ci = i; saveProf(); buildCharGrid(); sfx('ok'); };
    box.appendChild(b);
  });
}
function courseOptions(sel) {
  sel.innerHTML = '';
  for (const [k, c] of Object.entries(COURSES)) sel.add(new Option(`${c.name}（${c.list.length}体）`, k));
  GAMES.forEach((G, i) => sel.add(new Option(`フリー：${G.meta.boss}（${G.meta.stage}）`, 'g' + i)));
}
const courseList = (k) => (k && k[0] === 'g' ? [+k.slice(1)] : (COURSES[k] || COURSES.all).list);

// ---------- セッション ----------
let S = null; // { host, room, dir, slots, me, snap, recvAt, inputs, online }
function makeSlots(humans, total, lv) {
  const slots = humans.map((h) => ({ name: h.name, ci: h.ci, cpu: 0, lv, uid: h.uid || '' }));
  const used = new Set(slots.map((s) => s.ci));
  while (slots.length < total) {
    let ci = Math.floor(Math.random() * CHARS.length);
    let tries = 0; while (used.has(ci) && tries++ < 30) ci = Math.floor(Math.random() * CHARS.length);
    used.add(ci);
    slots.push({ name: CHARS[ci].name, ci, cpu: 1, lv, uid: '' });
  }
  return slots;
}

// ---------- ひとりで ----------
$('#btnSolo').onclick = () => { unlock(); scr('solo'); };
$('#soloStart').onclick = () => {
  unlock();
  const total = +$('#soloTotal').value, lv = +$('#soloLv').value, list = courseList($('#soloCourse').value);
  const slots = makeSlots([{ name: prof.name, ci: prof.ci }], total, lv);
  startSession({ host: true, online: false, slots, me: 0, list });
};

// ---------- オンライン ----------
async function ensureNet() {
  if (!hasConfig()) { toast('firebase-config.js を設定してください（READMEを参照）'); throw new Error('no config'); }
  $('#netStatus').textContent = '接続中…';
  try { const f = await connect(); $('#netStatus').textContent = ''; return f; }
  catch (e) { $('#netStatus').textContent = ''; toast('Firebaseに接続できませんでした: ' + e.message); throw e; }
}
$('#btnCreate').onclick = async () => {
  unlock();
  try { await ensureNet(); const room = await Room.create({ name: prof.name, ci: prof.ci }); enterLobby(room); }
  catch (e) { console.error(e); }
};
$('#btnJoin').onclick = async () => {
  unlock();
  const code = $('#joinCode').value.trim();
  if (!code) { toast('ルームコードを入力してください'); return; }
  try { await ensureNet(); const room = await Room.join(code, { name: prof.name, ci: prof.ci }); enterLobby(room); }
  catch (e) { console.error(e); if (e.message !== 'no config') toast(e.message); }
};

let L_ = { room: null, meta: null, players: {} };
function enterLobby(room) {
  L_ = { room, meta: null, players: {} };
  scr('lobby');
  $('#roomCode').textContent = room.code;
  const host = room.isHost;
  ['#lobCourse', '#lobTotal', '#lobLv'].forEach((q) => { $(q).disabled = !host; });
  $('#lobStart').style.display = host ? '' : 'none';
  $('#lobWait').style.display = host ? 'none' : '';
  room.on('meta', (m) => {
    if (!m) { if (L_.room === room) { toast('ルームが解散されました'); exitAll(); } return; }
    L_.meta = m;
    $('#lobCourse').value = m.course; $('#lobTotal').value = String(m.total); $('#lobLv').value = String(m.lv);
    if (m.st === 'play' && m.slots && !(S && S.room === room)) {
      const slots = L(m.slots);
      const me = slots.findIndex((s) => s.uid === room.uid);
      startSession({ host: room.isHost, online: true, room, slots, me, list: L(m.list) });
    }
    if (m.st === 'lobby' && S && S.room === room) { stopSession(); scr('lobby'); }
    renderLobby();
  });
  room.on('players', (p) => {
    L_.players = p || {};
    renderLobby();
    if (S && S.room === room && S.host && S.dir) {
      // 抜けた人はCPUに交代
      S.slots.forEach((s, i) => { if (!s.cpu && s.uid && !L_.players[s.uid] && s.uid !== room.uid) { s.cpu = 1; S.dir.slots[i].cpu = 1; toast(`${s.name} が抜けたのでCPUが代わります`); } });
    }
  });
}
function renderLobby() {
  const ps = Object.entries(L_.players).sort((a, b) => a[1].t - b[1].t);
  const box = $('#lobPlayers'); box.innerHTML = '';
  const total = Math.max(+(L_.meta?.total || 4), ps.length);
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div'); d.className = 'pl';
    d.style.borderColor = PCOL[i];
    if (i < ps.length) {
      const [uid, p] = ps[i], c = CHARS[p.ci] || CHARS[0];
      d.innerHTML = `<b style="background:${PCOL[i]}">${i + 1}P</b><span class="face" style="background:${c.col}">${c.m}</span><span>${esc(p.name)}</span>${uid === L_.meta?.host ? '<em>ホスト</em>' : ''}${uid === L_.room.uid ? '<em>あなた</em>' : ''}`;
    } else if (i < total) d.innerHTML = `<b style="background:${PCOL[i]}">${i + 1}P</b><span class="cpu">CPU</span>`;
    else { d.classList.add('empty'); d.innerHTML = `<b>${i + 1}P</b><span>—</span>`; }
    box.appendChild(d);
  }
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
['#lobCourse', '#lobTotal', '#lobLv'].forEach((q) => $(q).addEventListener('change', () => {
  if (!L_.room?.isHost) return;
  L_.room.update('meta', { course: $('#lobCourse').value, total: +$('#lobTotal').value, lv: +$('#lobLv').value });
}));
$('#lobStart').onclick = async () => {
  const room = L_.room; if (!room?.isHost) return;
  const ps = Object.entries(L_.players).sort((a, b) => a[1].t - b[1].t).map(([uid, p]) => ({ uid, name: p.name, ci: p.ci }));
  const total = Math.max(2, +$('#lobTotal').value, ps.length);
  if (ps.length > 4) { toast('4人までです'); return; }
  const slots = makeSlots(ps, Math.min(4, total), +$('#lobLv').value);
  await room.set('snap', null); await room.set('inputs', null);
  await room.update('meta', { st: 'play', slots, list: courseList($('#lobCourse').value) });
};
$('#lobLeave').onclick = () => exitAll();
$('#copyCode').onclick = () => { navigator.clipboard?.writeText(L_.room?.code || ''); toast('コピーしました'); };

async function exitAll() {
  stopSession();
  const r = L_.room; L_ = { room: null, meta: null, players: {} };
  if (r) await r.leave();
  scr('title');
}

// ---------- ゲーム ----------
const cv = $('#cv'), g = cv.getContext('2d');
bindCanvas(cv);
setupTouchPad($('#pad'));
let worker = null;
function resize() {
  const ww = window.innerWidth, wh = window.innerHeight;
  const sc = Math.min(ww / W, wh / H), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.style.width = Math.floor(W * sc) + 'px'; cv.style.height = Math.floor(H * sc) + 'px';
  cv.width = Math.floor(W * sc * dpr); cv.height = Math.floor(H * sc * dpr);
  g.setTransform((sc * dpr * W) / W * 1, 0, 0, sc * dpr, 0, 0);
}
window.addEventListener('resize', resize);

function startSession(o) {
  stopSession();
  S = { ...o, snap: null, recvAt: 0, inputs: {}, lastPush: 0, simT: performance.now(), prev: {} };
  smClear();
  scr('game'); resize(); enableInput(true);
  $('#finalBox').classList.remove('on');
  if (S.host) {
    S.dir = new Director(S.slots.map((s) => ({ ...s })), S.list);
    if (S.online) S.room.on('inputs', (v) => { S && (S.inputs = v || {}); });
    // バックグラウンドでも止まりにくいように Worker のタイマーで進める
    const blob = new Blob(['setInterval(()=>postMessage(0),1000/60)'], { type: 'text/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = hostTick;
  } else {
    S.room.on('snap', (v) => { if (!S) return; S.snap = v; S.recvAt = performance.now(); });
    let pending = false, lastSend = 0;
    setInputListener((moveOnly) => {
      if (!S || S.host) return;
      const now = performance.now();
      if (pending) return;
      const wait = Math.max(0, (moveOnly ? 50 : 0) - (now - lastSend));
      pending = true;
      setTimeout(() => { pending = false; lastSend = performance.now(); S && S.room.set(`inputs/${S.room.uid}`, raw); }, wait);
    });
  }
  const id = ++loopId;
  requestAnimationFrame((t) => frame(t, id));
}
function stopSession() {
  if (worker) { worker.terminate(); worker = null; }
  setInputListener(() => {});
  enableInput(false);
  S = null;
}
function hostTick() {
  if (!S || !S.dir) return;
  const now = performance.now();
  let acc = Math.min(0.1, (now - S.simT) / 1000);
  const step = 1 / 60;
  while (acc >= step * 0.999) {
    const raws = S.slots.map((s, i) => (i === S.me ? raw : S.inputs[s.uid] || null));
    S.dir.update(step, raws);
    acc -= step; S.simT += step * 1000;
  }
  if (now - S.simT > 200) S.simT = now;
  if (S.online && now - S.lastPush > 80) { S.lastPush = now; S.room.set('snap', S.dir.snap()); }
}
let lastFrame = performance.now(), loopId = 0;
function frame(now, id) {
  if (!S || id !== loopId) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000); lastFrame = now;
  let s, since = 0;
  if (S.host) s = S.dir.snap();
  else { s = S.snap; since = Math.min(0.2, (now - S.recvAt) / 1000); }
  setSmooth(!S.host || DBG_RTDB, dt);
  if (DBG_RTDB && s) s = norm(rtdbize(JSON.parse(JSON.stringify(s))));
  g.clearRect(0, 0, W, H);
  try { render(s, since); } catch (e) { console.error(e); }
  requestAnimationFrame((t) => frame(t, id));
}

function sounds(s) {
  const p = S.prev, gs = s.gs || {};
  if (s.ph !== p.ph) {
    if (s.ph === 'start') sfx('start');
    if (s.ph === 'finish') sfx('finish');
    if (s.ph === 'result') sfx('result');
    if (s.ph === 'final') sfx('champ');
  }
  if (s.ph === 'play' || s.ph === 'finish') {
    if (p.hp != null && gs.hp < p.hp && p.gid === s.gid) sfx('hit');
    const my = L(gs.sc)[S.me];
    if (p.my != null && my != null && p.gid === s.gid) { if (my > p.my) sfx('coin'); else if (my < p.my) sfx('ouch'); }
    if (gs.ang && !p.ang && p.gid === s.gid && gs.hp > 0) sfx('angry');
    p.hp = gs.hp; p.my = my; p.ang = gs.ang;
  } else { p.hp = null; p.my = null; p.ang = 0; }
  p.ph = s.ph; p.gid = s.gid;
}

function render(s, since) {
  if (!s) { g.fillStyle = '#111'; g.fillRect(0, 0, W, H); txt(g, '接続中…', 480, 270, { size: 28 }); return; }
  sounds(s);
  const slots = S.slots, me = S.me;
  const finalBox = $('#finalBox');
  finalBox.classList.toggle('on', s.ph === 'final');
  if (s.ph === 'final') { $('#finalLobby').style.display = S.online && S.host ? '' : 'none'; $('#finalRetry').style.display = S.online ? 'none' : ''; $('#finalWait').style.display = S.online && !S.host ? '' : 'none'; }
  switch (s.ph) {
    case 'intro': drawIntro(g, s, slots, me); break;
    case 'start': case 'play': case 'finish': {
      const G = GAMES[s.gid], gs = s.gs;
      if (!gs) break;
      const v = { t: (gs.T || 0) + since, me, slots, since };
      G.render(g, gs, v);
      drawPops(g, gs);
      drawHUD(g, gs, s.gid, slots, me, v.t);
      if (s.ph === 'start') { const k = s.pt + since; if (k > 0.6) banner(g, 'スタート！', (k - 0.6) / 1.6); else banner(g, 'よーい…', k / 0.6, '#fff'); }
      if (s.ph === 'finish') banner(g, 'フィニッシュ！', (s.pt + since) / 2);
      if (s.ph === 'play' && gs.angT >= 0 && v.t - gs.angT < 2.2 && !gs.done) { g.save(); g.globalAlpha = Math.min(1, (2.2 - (v.t - gs.angT)) * 2); banner(g, `${G.meta.boss}がおこった！`, (v.t - gs.angT) / 1, '#ff6a6a'); g.restore(); }
      break;
    }
    case 'result': drawResult(g, s, slots, me); break;
    case 'final': drawFinal(g, s, slots, me); break;
  }
}

$('#finalLobby').onclick = async () => { if (S?.room?.isHost) { const r = S.room; await r.update('meta', { st: 'lobby', slots: null, list: null }); await r.set('snap', null); } };
$('#finalRetry').onclick = () => { if (!S) return; const o = { host: true, online: false, slots: S.slots, me: 0, list: S.list }; startSession(o); };
$('#finalTitle').onclick = () => exitAll();
$('#gameQuit').onclick = () => { if (confirm('ゲームをやめてタイトルにもどりますか？')) exitAll(); };
$('#gameMute').onclick = () => { setMute(!isMuted()); $('#gameMute').textContent = isMuted() ? '🔇' : '🔊'; };

// ---------- タイトル ----------
$('#pname').value = prof.name;
$('#pname').addEventListener('input', () => { prof.name = $('#pname').value.trim().slice(0, 10) || 'プレイヤー'; saveProf(); });
buildCharGrid();
courseOptions($('#soloCourse')); courseOptions($('#lobCourse'));
document.querySelectorAll('[data-back]').forEach((b) => (b.onclick = () => scr('title')));
if (!hasConfig()) $('#netNote').textContent = '※オンラインは firebase-config.js の設定後に使えます';
scr('title');

// デバッグ用：Realtime DB を通した後のデータ形（空配列が消える等）を再現して描画テスト
const DBG_RTDB = new URLSearchParams(location.search).has('rtdb');
function rtdbize(v) {
  if (Array.isArray(v)) { const o = {}; let any = false; v.forEach((x, i) => { const y = rtdbize(x); if (y !== undefined) { o[i] = y; any = true; } }); return any ? o : undefined; }
  if (v && typeof v === 'object') { const o = {}; let any = false; for (const k in v) { const y = rtdbize(v[k]); if (y !== undefined) { o[k] = y; any = true; } } return any ? o : undefined; }
  return v === null ? undefined : v;
}
// デバッグ用：URLに ?auto=ボス番号 で即プレイ（CPU4人観戦）
const q = new URLSearchParams(location.search);
if (q.has('auto')) {
  const gi = +q.get('auto');
  const slots = makeSlots([{ name: prof.name, ci: prof.ci }], 4, 1); if (q.has('cpu')) slots[0].cpu = 1;
  startSession({ host: true, online: false, slots, me: 0, list: gi >= 0 ? [gi] : COURSES.all.list });
  if (q.has('skip')) { const d = S.dir; d.ph = 'play'; }
}
// ロゴ描画
(() => {
  const c = $('#logo'), x = c.getContext('2d');
  x.clearRect(0, 0, c.width, c.height);
  txt(x, 'のれーとパーティ', 330, 60, { size: 58, col: '#ffe14d', lw: 12, stroke: '#a2280a' });
  rr(x, 120, 104, 420, 72, 36); x.fillStyle = '#c4161c'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke();
  txt(x, '9 ボスラッシュ', 330, 141, { size: 44, col: '#fff', lw: 8, stroke: '#5a0505' });
  [0, 4, 8, 6].forEach((ci, i) => drawChar(x, 60 + i * 180 + (i > 1 ? 20 : 0), 230, i, ci, { r: 22, tag: false }));
})();
