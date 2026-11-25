// ===== 共通エンジン：定数・数学・描画ヘルパー・ボス基底クラス =====
export const W = 960, H = 540;

// プレイヤー枠の色（1P〜4P）
export const PCOL = ['#2f7bff', '#ff3b3b', '#22b84a', '#ffbf00'];
export const PCOL_D = ['#123f99', '#991a1a', '#0d6b28', '#9a7000'];

// キャラクター（名前はすべて「のれーと」いじり）
export const CHARS = [
  { name: 'ノレオ', col: '#e53935', m: 'オ' },
  { name: 'ノイージ', col: '#2e9e3a', m: 'イ' },
  { name: 'ノーチ', col: '#ff7fb0', m: 'チ' },
  { name: 'ノレジー', col: '#ff9a1f', m: 'ジ' },
  { name: 'ワレート', col: '#f2d21b', m: 'ワ' },
  { name: 'ワルノート', col: '#7b3fbf', m: 'ル' },
  { name: 'ノッシー', col: '#5fd45f', m: 'シ' },
  { name: 'ノレサリン', col: '#ff5ad1', m: 'サ' },
  { name: 'ノレピオ', col: '#3d7bff', m: 'ピ' },
  { name: 'ノトノト', col: '#2fbfa8', m: 'ト' },
  { name: 'レイトー', col: '#c2185b', m: 'レ' },
  { name: 'ノメック', col: '#4b3db8', m: 'メ' },
];

export const rnd = (a, b) => a + Math.random() * (b - a);
export const ri = (a, b) => Math.floor(rnd(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const L = (x) => (Array.isArray(x) ? x : x ? Object.values(x) : []);
export const r1 = (v) => Math.round(v * 10) / 10;
export const r0 = (v) => Math.round(v);

// CPUの強さ係数 0=よわい 1=ふつう 2=つよい
export const LV = (lv) => [0.35, 0.65, 0.92][lv ?? 1];

// ---- 空入力 ----
export function emptyIn() {
  return { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, A: 0, B: 0, Lp: 0, Rp: 0, Up: 0, Dp: 0, P: 0, px: -1, py: -1, k: -1 };
}
// CPU用：目標座標へ向かう方向キー
export function steer(inp, dx, dy, dead = 6) {
  inp.l = dx < -dead ? 1 : 0; inp.r = dx > dead ? 1 : 0;
  inp.u = dy < -dead ? 1 : 0; inp.d = dy > dead ? 1 : 0;
  return inp;
}

// ---- スムージング（クライアント側で位置をなめらかにする） ----
let smoothOn = false, frameDt = 1 / 60;
const smap = new Map();
export function setSmooth(on, dt) { smoothOn = on; frameDt = dt; }
export function sm(key, v, rate = 16) {
  if (!smoothOn) return v;
  const o = smap.get(key);
  if (o === undefined || Math.abs(o - v) > 300) { smap.set(key, v); return v; }
  const nv = o + (v - o) * Math.min(1, frameDt * rate);
  smap.set(key, nv);
  return nv;
}
export function smClear() { smap.clear(); }

// ---- 描画ヘルパー ----
export function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export const FONT = '"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Meiryo",sans-serif';
export function txt(g, s, x, y, o = {}) {
  const size = o.size || 24;
  g.font = `${o.w || 900} ${size}px ${FONT}`;
  g.textAlign = o.align || 'center';
  g.textBaseline = o.base || 'middle';
  if (o.stroke !== null) {
    g.lineJoin = 'round';
    g.lineWidth = o.lw ?? Math.max(3, size / 5);
    g.strokeStyle = o.stroke || '#222';
    g.strokeText(s, x, y);
  }
  g.fillStyle = o.col || '#fff';
  g.fillText(s, x, y);
}
export function circle(g, x, y, r, fill, stroke, lw = 3) {
  g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
export function ellipse(g, x, y, rx, ry, fill, stroke, lw = 3) {
  g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); }
}
export function shadow(g, x, y, r, a = 0.3) { ellipse(g, x, y, r, r * 0.45, `rgba(0,0,0,${a})`); }

// プレイヤーキャラ（画像なし：色つきの丸＋マーク）
export function drawChar(g, x, y, slot, ci, o = {}) {
  const r = o.r || 18, c = CHARS[ci] || CHARS[0];
  if (o.blink && Math.floor(performance.now() / 80) % 2) return;
  g.save();
  if (o.alpha != null) g.globalAlpha = o.alpha;
  // 体
  circle(g, x, y + r * 0.35, r * 0.85, PCOL_D[slot]);
  circle(g, x, y - r * 0.1, r, c.col, '#1a1a1a', 3);
  // 顔マーク
  txt(g, c.m, x, y - r * 0.12, { size: r * 1.05, col: '#fff', stroke: '#1a1a1a', lw: 3 });
  // 足元の枠色リング
  if (!o.noRing) { g.beginPath(); g.ellipse(x, y + r * 1.05, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); g.lineWidth = 3; g.strokeStyle = PCOL[slot]; g.stroke(); }
  if (o.stun) { for (let i = 0; i < 3; i++) { const a = performance.now() / 200 + i * 2.1; txt(g, '★', x + Math.cos(a) * r, y - r * 1.3 + Math.sin(a) * 5, { size: 13, col: '#ffe14d', lw: 2 }); } }
  if (o.tag !== false) {
    const lbl = `${slot + 1}P`;
    rr(g, x - 16, y - r * 2.15 - 9, 32, 18, 6); g.fillStyle = PCOL[slot]; g.fill();
    txt(g, lbl, x, y - r * 2.15, { size: 13, stroke: null });
  }
  g.restore();
}

// 星型
export function star(g, x, y, r, fill, stroke) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r; const a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.lineWidth = 3; g.strokeStyle = stroke; g.stroke(); }
}
// トゲつき丸（トゲノー・ノニラ・トゲ鉄球）
export function spiky(g, x, y, r, fill, spike = '#fff', n = 10) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n; const rad = i % 2 ? r : r * 1.35; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
  g.closePath(); g.fillStyle = spike; g.fill(); g.lineWidth = 2; g.strokeStyle = '#222'; g.stroke();
  circle(g, x, y, r, fill, '#222', 2);
}
// 爆発エフェクト
export function boom(g, x, y, t, size = 80) {
  if (t < 0 || t > 1) return;
  g.save(); g.globalAlpha = 1 - t;
  circle(g, x, y, size * (0.3 + t), '#ffdd55');
  circle(g, x, y, size * (0.2 + t * 0.7), '#ff7a1a');
  circle(g, x, y, size * (0.1 + t * 0.4), '#fff7c2');
  g.restore();
}
// ボス共通：名前プレート付きの抽象ボス
export function bossLabel(g, x, y, name, angry) {
  const w = name.length * 18 + 26;
  rr(g, x - w / 2, y - 14, w, 28, 14); g.fillStyle = angry ? 'rgba(200,0,0,.85)' : 'rgba(0,0,0,.6)'; g.fill();
  txt(g, name, x, y + 1, { size: 18, stroke: null });
}

// ===== ボス基底クラス =====
export class BossBase {
  constructor(cfg) {
    this.cfg = cfg;
    this.n = cfg.slots.length;
    this.slots = cfg.slots;
    this.T = 0;
    this.sc = Array(this.n).fill(0);
    this.hp = this.mhp = 10;
    this.done = false; this.doneT = 0;
    this.pops = []; this.pid = 0;
    this.bonus = 3;
    this.angT = -1;
    this.last = [];
  }
  lv(slot) { return this.slots[slot].lv ?? 1; }
  setHP(v) { this.hp = this.mhp = Math.max(1, Math.round(v)); }
  get angry() { return this.hp <= this.mhp / 2; }
  pop(x, y, t, c = '#ffe14d') { this.pops.push({ i: ++this.pid, x: r0(x), y: r0(y), t: String(t), c, b: r1(this.T) }); }
  add(slot, d, x, y) {
    const b = this.sc[slot];
    this.sc[slot] = Math.max(0, b + d);
    if (x != null) this.pop(x, y, (d > 0 ? '+' : '') + d, d > 0 ? '#ffe14d' : '#7fd3ff');
    return this.sc[slot] - b;
  }
  // ダメージ（とどめボーナス付き）
  hit(dmg, slots, x, y) {
    if (this.done) return false;
    const wasAngry = this.angry;
    this.hp = Math.max(0, this.hp - dmg);
    if (!wasAngry && this.angry && this.hp > 0) this.angT = this.T;
    if (this.hp <= 0) {
      this.done = true; this.doneT = this.T;
      const set = [...new Set(slots)];
      this.last = set;
      set.forEach((s, i) => this.add(s, this.bonus, x != null ? x + i * 10 : null, y != null ? y - 30 : null));
      if (x != null) this.pop(x, (y ?? 200) - 60, 'とどめ！', '#ff7b00');
    }
    return true;
  }
  tick(dt) { this.T += dt; if (this.pops.length) this.pops = this.pops.filter((p) => this.T - p.b < 1.3); }
  head() {
    return { T: Math.round(this.T * 100) / 100, hp: this.hp, mhp: this.mhp, sc: this.sc.slice(), ang: this.angry ? 1 : 0, angT: r1(this.angT), done: this.done ? 1 : 0, dT: r1(this.doneT), pops: this.pops, last: this.last };
  }
}

// ===== 見下ろしアクション用：投影とアクター =====
export const proj = (x, y, z = 0, cy = 300, k = 0.55) => [480 + x, cy + y * k - z];
export function actor(slot, x, y) { return { s: slot, x, y, z: 0, vz: 0, fx: 0, fy: 1, pd: 0, inv: 0, st: 0, fall: 0, hold: -1 }; }
// 移動・ジャンプ・ヒップドロップ。戻り値 {landed, pounded}
export function stepActor(p, inp, dt, o = {}) {
  const speed = o.speed ?? 230;
  let mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), my = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
  if (p.st > 0) { p.st -= dt; mx = my = 0; }
  if (p.inv > 0) p.inv -= dt;
  const m = Math.hypot(mx, my);
  if (m > 0) { mx /= m; my /= m; p.fx = mx; p.fy = my; }
  const sp = p.pd ? 0 : speed * (o.slow ?? 1);
  p.x += mx * sp * dt; p.y += my * sp * dt;
  let landed = false, pounded = false;
  if (o.jump !== false && inp.A && p.st <= 0) {
    if (p.z <= 0 && p.vz <= 0) { p.vz = o.jv ?? 440; p.z = 0.01; }
    else if (o.pound && !p.pd && p.z > 12) { p.pd = 1; p.vz = -980; }
  }
  if (p.z > 0 || p.vz > 0) {
    p.vz -= (o.grav ?? 1350) * dt; p.z += p.vz * dt;
    if (p.z <= 0) { p.z = 0; p.vz = 0; landed = true; if (p.pd) { pounded = true; p.pd = 0; } }
  }
  return { landed, pounded };
}
export function inEllipse(x, y, rx, ry) { return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1; }
export function clampEllipse(p, rx, ry) {
  const v = (p.x * p.x) / (rx * rx) + (p.y * p.y) / (ry * ry);
  if (v > 1) { const s = 1 / Math.sqrt(v); p.x *= s; p.y *= s; }
}
export function clampRect(p, x0, y0, x1, y1) { p.x = clamp(p.x, x0, x1); p.y = clamp(p.y, y0, y1); }
// 押し合い
export function separate(ps, r = 26) {
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j]; if (a.fall || b.fall) continue;
    const d = dist(a.x, a.y, b.x, b.y);
    if (d > 0.01 && d < r) { const k = (r - d) / 2 / d, dx = (a.x - b.x) * k, dy = (a.y - b.y) * k; a.x += dx; a.y += dy; b.x -= dx; b.y -= dy; }
  }
}
// 背景：空のグラデ
export function grad(g, y0, y1, c0, c1, x0 = 0, x1 = W) {
  const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
}
// 押せるボタン（ポインタ選択用）
export function hitRect(px, py, x, y, w, h) { return px >= x && px <= x + w && py >= y && py <= y + h; }
