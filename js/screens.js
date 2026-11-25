// ===== 共通画面：説明・HUD・バナー・結果・最終結果 =====
import { W, H, PCOL, PCOL_D, CHARS, rr, txt, circle, drawChar, L, grad, star } from './engine.js';
import { GAMES } from './games/index.js';
import { OK_BTN, RP } from './director.js';

const Y = '#ffe14d';

function panelBg(g, x, y, w, h, col = 'rgba(0,0,0,.55)', r = 16) { rr(g, x, y, w, h, r); g.fillStyle = col; g.fill(); }

// ---- ボスマップ（進行度） ----
export function drawMap(g, list, bi, y = 30) {
  const n = list.length, gap = Math.min(70, 820 / n), x0 = 480 - ((n - 1) * gap) / 2;
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + (n - 1) * gap, y); g.stroke();
  list.forEach((id, k) => {
    const x = x0 + k * gap, cur = k === bi, done = k < bi;
    circle(g, x, y, cur ? 15 : 11, done ? '#777' : cur ? Y : '#fff', '#222', 3);
    if (done) txt(g, '✔', x, y + 1, { size: 12, col: '#fff', stroke: null });
    else txt(g, String(k + 1), x, y + 1, { size: cur ? 14 : 11, col: '#222', stroke: null });
  });
}

// ---- 説明画面（MP9のボスミニゲームは赤背景） ----
export function drawIntro(g, s, slots, me) {
  const G = GAMES[s.gid], M = G.meta;
  grad(g, 0, 0 + H, '#c4161c', '#6a0508');
  g.save(); g.globalAlpha = 0.12; for (let i = -4; i < 20; i++) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(i * 80 + ((s.pt * 30) % 80), 0); g.lineTo(i * 80 + 40 + ((s.pt * 30) % 80), 0); g.lineTo(i * 80 - 160 + ((s.pt * 30) % 80), H); g.lineTo(i * 80 - 200 + ((s.pt * 30) % 80), H); g.fill(); } g.restore();
  drawMap(g, L(s.list), s.bi, 26);
  txt(g, `BOSS ${s.bi + 1} / ${L(s.list).length}　${M.stage}`, 480, 58, { size: 16, col: '#ffd0d0', lw: 4 });
  // タイトル帯
  rr(g, 120, 72, 720, 64, 32); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 6; g.strokeStyle = '#7a0a0a'; g.stroke();
  txt(g, M.title, 480, 104, { size: 34, col: '#c4161c', stroke: null });
  // あそびかた
  panelBg(g, 40, 150, 560, 290, 'rgba(255,255,255,.95)');
  rr(g, 56, 140, 140, 32, 16); g.fillStyle = '#c4161c'; g.fill(); txt(g, 'あそびかた', 126, 156, { size: 18, stroke: null });
  M.rules.forEach((r, i) => {
    circle(g, 68, 196 + i * 40, 7, '#c4161c');
    txt(g, r, 84, 196 + i * 40, { size: 17, col: '#222', stroke: null, align: 'left', w: 700 });
  });
  // そうさ
  panelBg(g, 620, 150, 300, 290, 'rgba(0,0,0,.55)');
  rr(g, 636, 140, 110, 32, 16); g.fillStyle = '#222'; g.fill(); txt(g, 'そうさ', 691, 156, { size: 18, stroke: null });
  M.controls.forEach(([k, d], i) => {
    rr(g, 640, 186 + i * 62, 262, 50, 10); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill();
    txt(g, k, 652, 202 + i * 62, { size: 15, col: Y, align: 'left', stroke: null });
    txt(g, d, 652, 224 + i * 62, { size: 15, col: '#fff', align: 'left', stroke: null, w: 700 });
  });
  // 準備OK
  const rd = L(s.rd);
  slots.forEach((sl, i) => {
    const x = 120 + i * 120;
    drawChar(g, x - 70 + 0, 478, i, sl.ci, { r: 16, tag: false });
    txt(g, rd[i] ? 'OK!' : '…', x - 70 + 34, 478, { size: 18, col: rd[i] ? '#7dff7d' : '#ffd0d0', align: 'left' });
  });
  if (me >= 0 && !rd[me]) {
    const [x, y, w, h] = OK_BTN;
    rr(g, x, y, w, h, 23); g.fillStyle = Y; g.fill(); g.lineWidth = 4; g.strokeStyle = '#7a4a00'; g.stroke();
    txt(g, 'じゅんびOK！（Z）', x + w / 2, y + h / 2 + 1, { size: 20, col: '#5a2a00', stroke: null });
  } else txt(g, 'みんなを待っています…', 480 + 150, 476, { size: 18, col: '#ffd0d0' });
  txt(g, `のこり ${Math.max(0, Math.ceil(30 - s.pt))}`, 900, 478, { size: 14, col: '#ffd0d0' });
}

// ---- HUD（ボス体力・スコア） ----
export function drawHUD(g, gs, gid, slots, me, t) {
  const M = GAMES[gid].meta;
  const hp = gs.hp ?? 0, mhp = gs.mhp || 1, ang = gs.ang;
  // ボス体力
  const bw = 420, bx = 480 - bw / 2, by = 8;
  rr(g, bx - 70, by, bw + 90, 34, 17); g.fillStyle = 'rgba(0,0,0,.7)'; g.fill();
  txt(g, M.boss, bx - 8, by + 17, { size: 15, align: 'right', col: ang ? '#ff8a8a' : '#fff', stroke: null });
  rr(g, bx, by + 7, bw, 20, 10); g.fillStyle = '#331'; g.fill();
  const f = Math.max(0, hp / mhp);
  if (f > 0) { rr(g, bx, by + 7, Math.max(20, bw * f), 20, 10); g.fillStyle = ang ? (Math.floor(t * 6) % 2 ? '#ff3030' : '#ff6a3a') : '#ffcf2a'; g.fill(); }
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx + bw / 2, by + 7); g.lineTo(bx + bw / 2, by + 27); g.stroke();
  rr(g, bx, by + 7, bw, 20, 10); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
  // スコアパネル
  const sc = L(gs.sc), n = slots.length, pw = 200, gap = 14, x0 = 480 - (n * pw + (n - 1) * gap) / 2;
  const best = Math.max(...sc, 0);
  slots.forEach((sl, i) => {
    const x = x0 + i * (pw + gap), y = 494;
    rr(g, x, y, pw, 40, 12); g.fillStyle = PCOL_D[i]; g.fill();
    rr(g, x + 3, y + 3, pw - 6, 34, 10); g.fillStyle = PCOL[i]; g.fill();
    if (i === me) { rr(g, x - 3, y - 3, pw + 6, 46, 14); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
    drawChar(g, x + 22, y + 22, i, sl.ci, { r: 13, tag: false, noRing: true });
    txt(g, sl.name.slice(0, 7), x + 42, y + 20, { size: 14, align: 'left', lw: 3 });
    const v = sc[i] ?? 0;
    txt(g, String(v).padStart(gid === 5 ? 3 : 2, '0'), x + pw - 12, y + 21, { size: 26, align: 'right', col: '#fff', lw: 5 });
    if (v === best && best > 0) txt(g, '👑', x + 8, y - 4, { size: 16, stroke: null });
    if (sl.cpu) txt(g, 'CPU', x + 42, y + 33, { size: 9, align: 'left', col: '#ddd', stroke: null });
  });
}

// ---- 得点ポップ ----
export function drawPops(g, gs) {
  const T = gs.T || 0;
  L(gs.pops).forEach((p) => {
    const a = (T - p.b) / 1.2; if (a < 0 || a > 1) return;
    g.save(); g.globalAlpha = 1 - Math.max(0, a - 0.6) * 2.5;
    txt(g, p.t, p.x, p.y - a * 40, { size: p.t.length > 3 ? 20 : 26, col: p.c });
    g.restore();
  });
}

// ---- バナー ----
export function banner(g, text, k, col = Y) {
  const s = k < 0.15 ? k / 0.15 : 1;
  g.save(); g.translate(480, 270); g.scale(0.4 + s * 0.6, 0.4 + s * 0.6); g.rotate(-0.05);
  rr(g, -330, -60, 660, 120, 60); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
  txt(g, text, 0, 4, { size: 86, col, lw: 14, stroke: '#a2280a' });
  g.restore();
}

// ---- 結果画面 ----
export function drawResult(g, s, slots, me) {
  grad(g, 0, H, '#1a3a8a', '#0a1a40');
  for (let i = 0; i < 30; i++) star(g, (i * 173) % 960, (i * 97) % 540, 4 + (i % 3) * 2, 'rgba(255,255,255,.15)');
  const M = GAMES[s.gid].meta;
  drawMap(g, L(s.list), s.bi, 26);
  txt(g, `${M.boss} をたおした！`, 480, 74, { size: 34, col: Y });
  if (s.to) txt(g, '（時間切れ）', 480, 108, { size: 16, col: '#ccc' });
  const rk = L(s.rk).slice().sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  const tot = L(s.tot);
  rk.forEach((r, j) => {
    const [i, sc, rank, rp] = r;
    const y = 130 + j * 76, k = Math.min(1, Math.max(0, (s.pt - j * 0.25) / 0.3));
    g.save(); g.globalAlpha = k; g.translate((1 - k) * 80, 0);
    rr(g, 150, y, 660, 64, 18); g.fillStyle = PCOL_D[i]; g.fill(); rr(g, 154, y + 4, 652, 56, 15); g.fillStyle = PCOL[i]; g.fill();
    if (i === me) { rr(g, 146, y - 4, 668, 72, 20); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); }
    txt(g, `${rank}位`, 200, y + 33, { size: 30, col: rank === 1 ? Y : '#fff' });
    drawChar(g, 268, y + 34, i, slots[i].ci, { r: 18, tag: false, noRing: true });
    txt(g, slots[i].name, 298, y + 33, { size: 22, align: 'left' });
    txt(g, `${sc}点`, 600, y + 33, { size: 24, align: 'right' });
    txt(g, `+${rp}`, 680, y + 33, { size: 26, col: Y, align: 'right' });
    txt(g, `計 ${tot[i]}`, 790, y + 33, { size: 20, align: 'right', col: '#fff' });
    g.restore();
  });
  txt(g, '1位 +5 / 2位 +3 / 3位 +2 / 4位 +1 ポイント', 480, 448, { size: 15, col: '#bcd' });
  const rd = L(s.rd);
  if (me >= 0 && !rd[me] && s.pt > 1.5) {
    const [x, y, w, h] = OK_BTN;
    rr(g, x, y + 20, w, h, 23); g.fillStyle = Y; g.fill(); txt(g, 'つぎへ（Z）', x + w / 2, y + 20 + h / 2 + 1, { size: 20, col: '#5a2a00', stroke: null });
  } else txt(g, 'つぎのボスへ…', 480, 492, { size: 18, col: '#bcd' });
}

// ---- 最終結果 ----
export function drawFinal(g, s, slots, me) {
  grad(g, 0, H, '#3a1a6a', '#0a0420');
  for (let i = 0; i < 40; i++) { const x = (i * 211 + s.pt * 40 * (i % 3 + 1)) % 980, y = (i * 67 + s.pt * 60) % 560; star(g, x, y, 5 + (i % 4) * 2, ['#ffe14d', '#ff8ad8', '#7fe3ff', '#fff'][i % 4]); }
  txt(g, 'ボスラッシュ クリア！', 480, 62, { size: 44, col: Y, lw: 10 });
  const tot = L(s.tot), raw = L(s.raw);
  const order = slots.map((_, i) => i).sort((a, b) => tot[b] - tot[a] || raw[b] - raw[a]);
  const champ = order[0];
  const ranks = order.map((i) => 1 + order.filter((j) => tot[j] > tot[i] || (tot[j] === tot[i] && raw[j] > raw[i])).length);
  rr(g, 280, 100, 400, 150, 24); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); g.lineWidth = 4; g.strokeStyle = Y; g.stroke();
  txt(g, 'チャンピオン', 480, 124, { size: 20, col: Y });
  drawChar(g, 480, 186, champ, slots[champ].ci, { r: 34, tag: false });
  txt(g, slots[champ].name, 480, 234, { size: 26 });
  order.forEach((i, j) => {
    const y = 270 + j * 52;
    rr(g, 220, y, 520, 44, 14); g.fillStyle = PCOL[i]; g.fill();
    if (i === me) { g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
    txt(g, `${ranks[j]}位`, 262, y + 23, { size: 22, col: ranks[j] === 1 ? Y : '#fff' });
    drawChar(g, 320, y + 23, i, slots[i].ci, { r: 14, tag: false, noRing: true });
    txt(g, slots[i].name, 344, y + 23, { size: 20, align: 'left' });
    txt(g, `${tot[i]} pt`, 640, y + 23, { size: 22, align: 'right', col: Y });
    txt(g, `(${raw[i]}点)`, 728, y + 23, { size: 14, align: 'right' });
  });
  void RP;
}
