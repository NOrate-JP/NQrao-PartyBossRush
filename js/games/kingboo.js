// 6. キングノレート（キングテレサ）: パズルアタック（3つそろえ）
import { BossBase, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, PCOL, LV, dist, clamp } from '../engine.js';

const COLS = 8, ROWS = 6, CS = 52, X0 = 200, Y0 = 118;
const NT = 5; // 0:みどりこうら 1:あかこうら 2:アイスフラワー 3:ファイアフラワー 4:カミナリ

export function drawItem(g, t, x, y, r = 20, a = 1) {
  g.save(); g.globalAlpha = a;
  if (t === 0 || t === 1) {
    ellipse(g, x, y + 2, r, r * 0.82, t ? '#e8322c' : '#2fb24a', '#222', 3);
    ellipse(g, x, y - 1, r * 0.55, r * 0.42, t ? '#ff8a80' : '#9df0a8');
    ellipse(g, x, y + r * 0.55, r * 0.9, r * 0.25, '#fff');
  } else if (t === 2 || t === 3) {
    const c = t === 2 ? '#7fe3ff' : '#ff8a1f';
    for (let k = 0; k < 4; k++) { const a2 = k * Math.PI / 2 + Math.PI / 4; circle(g, x + Math.cos(a2) * r * 0.48, y - 4 + Math.sin(a2) * r * 0.48, r * 0.42, c, '#222', 2); }
    circle(g, x, y - 4, r * 0.3, '#fff59d', '#222', 2);
    g.fillStyle = '#2e9e3a'; g.fillRect(x - 3, y + 6, 6, r * 0.6);
  } else {
    g.beginPath(); g.moveTo(x + 4, y - r); g.lineTo(x - r * 0.6, y + 3); g.lineTo(x - 1, y + 3); g.lineTo(x - 5, y + r); g.lineTo(x + r * 0.6, y - 4); g.lineTo(x + 1, y - 4); g.closePath();
    g.fillStyle = '#ffe21a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#7a5a00'; g.stroke();
  }
  g.restore();
}

export default class KingBoo extends BossBase {
  static meta = {
    id: 'kingboo', boss: 'キングノレート', title: 'キングノレートのパズルアタック', jp: 'キングノレートのパズルアタック', stage: 'ノレサのホラーキャッスル ボス', bg: '#3a2458',
    rules: ['となりのアイテムと入れかえて、同じアイテムを3つ以上ならべよう', 'こうら・フラワーは1コにつき +1点＆ダメージ', 'カミナリを3つそろえると +10点！ 他の人は -3点＆大ダメージ', 'いかり時はノレサが出現。カーソルがふれるとしびれる（Z連打で回復）', 'カミナリでノレサを全部やっつけられる', 'とどめをさすと +10点ボーナス'],
    controls: [['←↑↓→', 'カーソルいどう'], ['Z', 'つかむ（もう一度でキャンセル）'], ['つかんで ←↑↓→', '入れかえ'], ['Z 連打', 'しびれから回復']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(50 + 25 * this.n);
    this.bonus = 10;
    this.bd = [];
    for (let y = 0; y < ROWS; y++) { const row = []; for (let x = 0; x < COLS; x++) { let t; do { t = this.rt(); } while ((x >= 2 && row[x - 1] === t && row[x - 2] === t) || (y >= 2 && this.bd[y - 1][x] === t && this.bd[y - 2][x] === t)); row.push(t); } this.bd.push(row); }
    this.cu = this.slots.map((_, i) => ({ x: [1, 6, 1, 6][i], y: [1, 1, 4, 4][i], g: 0, st: 0, sh: 0, cpu: null, cpuT: rnd(1, 2), bad: 0 }));
    this.lock = 0; this.clr = []; this.who = -1; this.phase = 0; this.pt = 0; this.chain = 0;
    this.boos = []; this.booT = 2; this.id = 0; this.shots = [];
  }
  rt() { return Math.random() < 0.06 ? 4 : ri(0, 3); }
  findMatches() {
    const m = new Set(), groups = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS;) {
      const t = this.bd[y][x]; let e = x; while (e + 1 < COLS && this.bd[y][e + 1] === t) e++;
      if (t >= 0 && e - x >= 2) { const gp = []; for (let k = x; k <= e; k++) { m.add(y * COLS + k); gp.push(y * COLS + k); } groups.push({ t, c: gp }); }
      x = e + 1;
    }
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS;) {
      const t = this.bd[y][x]; let e = y; while (e + 1 < ROWS && this.bd[e + 1][x] === t) e++;
      if (t >= 0 && e - y >= 2) { const gp = []; for (let k = y; k <= e; k++) { m.add(k * COLS + x); gp.push(k * COLS + x); } groups.push({ t, c: gp }); }
      y = e + 1;
    }
    return { m, groups };
  }
  swap(a, b) { const t = this.bd[a[1]][a[0]]; this.bd[a[1]][a[0]] = this.bd[b[1]][b[0]]; this.bd[b[1]][b[0]] = t; }
  validMoves() {
    const res = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy; if (nx >= COLS || ny >= ROWS) continue;
      this.swap([x, y], [nx, ny]);
      const { m, groups } = this.findMatches();
      if (m.size) res.push({ x, y, dx, dy, v: m.size + (groups.some((gq) => gq.t === 4) ? 20 : 0) });
      this.swap([x, y], [nx, ny]);
    }
    return res;
  }
  update(dt, ins) {
    this.tick(dt); this.pt += dt;
    // 解決中
    if (this.lock) {
      if (this.phase === 1 && this.pt > 0.32) {
        // 消す
        for (const k of this.clr) this.bd[Math.floor(k / COLS)][k % COLS] = -1;
        // 落下
        for (let x = 0; x < COLS; x++) {
          const col = []; for (let y = ROWS - 1; y >= 0; y--) if (this.bd[y][x] >= 0) col.push(this.bd[y][x]);
          for (let y = ROWS - 1, j = 0; y >= 0; y--, j++) this.bd[y][x] = j < col.length ? col[j] : this.rt();
        }
        this.phase = 2; this.pt = 0;
      } else if (this.phase === 2 && this.pt > 0.2) {
        if (!this.resolveStep()) { this.lock = 0; if (!this.validMoves().length) this.reshuffle(); }
      }
    }
    // ノレサ
    if (this.angry && !this.done) {
      this.booT -= dt;
      if (this.booT <= 0 && this.boos.length < 3) { this.booT = rnd(3, 5); const fromL = Math.random() < 0.5; this.boos.push({ id: ++this.id, x: fromL ? X0 - 30 : X0 + COLS * CS + 30, y: Y0 + rnd(20, ROWS * CS - 20), vx: (fromL ? 1 : -1) * rnd(40, 70), ph: rnd(0, 6) }); }
    }
    for (const b of this.boos) { b.x += b.vx * dt; b.y += Math.sin(this.T * 1.5 + b.ph) * 30 * dt; if (b.x < X0 - 60 || b.x > X0 + COLS * CS + 60) b.out = 1; }
    this.boos = this.boos.filter((b) => !b.out);
    // カーソル
    this.cu.forEach((c, i) => {
      const inp = ins[i];
      if (c.bad > 0) c.bad -= dt;
      if (this.done) return;
      if (c.st > 0) { if (inp.A || inp.B) { c.sh++; if (c.sh >= 8) { c.st = 0; c.sh = 0; } } return; }
      const cx = X0 + c.x * CS + CS / 2, cy = Y0 + c.y * CS + CS / 2;
      for (const b of this.boos) if (dist(cx, cy, b.x, b.y) < 30) { c.st = 1; c.sh = 0; c.g = 0; this.pop(cx, cy - 20, 'しびれた！', '#c9a6ff'); }
      if (c.st) return;
      let dx = 0, dy = 0;
      if (inp.Lp) dx = -1; else if (inp.Rp) dx = 1; else if (inp.Up) dy = -1; else if (inp.Dp) dy = 1;
      if (inp.A) c.g = c.g ? 0 : 1;
      if (dx || dy) {
        const nx = c.x + dx, ny = c.y + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return;
        if (c.g) {
          c.g = 0;
          if (this.lock) { c.bad = 0.3; return; }
          this.swap([c.x, c.y], [nx, ny]);
          const { m } = this.findMatches();
          if (!m.size) { this.swap([c.x, c.y], [nx, ny]); c.bad = 0.3; return; }
          c.x = nx; c.y = ny;
          this.who = i; this.chain = 0; this.lock = 1;
          this.resolveStep();
        } else { c.x = nx; c.y = ny; }
      }
    });
  }
  resolveStep() {
    const { m, groups } = this.findMatches();
    if (!m.size) return false;
    this.chain++;
    const i = this.who;
    let pts = 0, dmg = 0, zap = 0;
    for (const gq of groups) {
      if (gq.t === 4) { zap++; pts += 10; dmg += 6; }
      else { pts += gq.c.length; dmg += gq.c.length; }
    }
    // 位置
    let ax = 0, ay = 0; for (const k of m) { ax += X0 + (k % COLS) * CS + CS / 2; ay += Y0 + Math.floor(k / COLS) * CS + CS / 2; } ax /= m.size; ay /= m.size;
    const ok = this.hit(dmg, [i], 840, 200);
    if (ok) {
      this.add(i, pts, ax, ay);
      if (zap) {
        for (let k = 0; k < this.n; k++) if (k !== i) this.add(k, -3 * zap, 840, 330 + k * 20);
        if (this.boos.length) { this.boos.forEach((b) => this.pop(b.x, b.y, 'バチッ', '#ffe14d')); this.boos = []; }
        this.cu.forEach((c) => { c.st = 0; });
      }
      this.shots.push({ id: ++this.id, x: r0(ax), y: r0(ay), b: this.T, z: zap });
    }
    if (this.chain > 1) this.pop(ax, ay - 30, `${this.chain}れんさ！`, '#ff9de0');
    this.clr = [...m]; this.phase = 1; this.pt = 0;
    this.shots = this.shots.filter((sh) => this.T - sh.b < 0.8);
    return true;
  }
  reshuffle() {
    let tries = 0;
    do {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) this.bd[y][x] = this.rt();
    } while ((this.findMatches().m.size || !this.validMoves().length) && ++tries < 50);
  }
  cpuInput(i) {
    const inp = emptyIn(), c = this.cu[i], lv = this.lv(i);
    if (c.st) { if (Math.random() < [0.12, 0.2, 0.3][lv]) inp.A = 1; return inp; }
    c.cpuT -= 1 / 60;
    if (!c.cpu) {
      if (c.cpuT > 0 || this.lock) return inp;
      const mv = this.validMoves();
      if (!mv.length) return inp;
      mv.sort((a, b) => b.v - a.v + (dist(a.x, a.y, c.x, c.y) - dist(b.x, b.y, c.x, c.y)) * (lv === 2 ? 0.1 : 0.6));
      c.cpu = mv[Math.min(mv.length - 1, lv === 2 ? 0 : ri(0, Math.min(3, mv.length - 1)))];
      c.stepT = 0;
    }
    c.stepT -= 1 / 60;
    if (c.stepT > 0) return inp;
    c.stepT = [0.28, 0.18, 0.11][lv];
    const t = c.cpu;
    if (c.x !== t.x) { if (t.x < c.x) inp.Lp = 1; else inp.Rp = 1; return inp; }
    if (c.y !== t.y) { if (t.y < c.y) inp.Up = 1; else inp.Dp = 1; return inp; }
    if (!c.g) { inp.A = 1; return inp; }
    if (t.dx) inp.Rp = 1; else inp.Dp = 1;
    c.cpu = null; c.cpuT = [3.0, 1.7, 1.0][lv] * rnd(0.7, 1.3);
    return inp;
  }
  state() {
    return {
      ...this.head(),
      bd: this.bd.map((r) => r.map((t) => t + 1).join('')),
      cl: this.lock && this.phase === 1 ? this.clr.slice() : [], cp: Math.round(this.pt * 100) / 100,
      cu: this.cu.map((c) => [c.x, c.y, c.g, c.st ? 8 - c.sh : 0, c.bad > 0 ? 1 : 0]),
      bo: this.boos.map((b) => [b.id, r0(b.x), r0(b.y)]),
      sh: this.shots.map((sh) => [sh.id, sh.x, sh.y, Math.round(sh.b * 100) / 100, sh.z]),
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#150b25', '#3d2560');
    for (let i = 0; i < 20; i++) circle(g, (i * 137) % 960, (i * 71) % 300 + 20, 2, 'rgba(255,255,255,.4)');
    // ボス
    const dead = s.done ? v.t - s.dT : -1;
    const bx = 845, by = 230 + Math.sin(v.t * 1.6) * 12;
    if (dead < 0.9) {
      g.save(); if (dead > 0) { g.translate(bx, by); g.rotate(dead * 12); g.scale(1 - dead, 1 - dead); g.translate(-bx, -by); }
      g.globalAlpha = 0.92;
      circle(g, bx, by, 78, s.ang ? '#ffd6e6' : '#f4f4ff', '#555', 4);
      g.beginPath(); g.moveTo(bx - 70, by + 30); g.lineTo(bx - 100, by + 70); g.lineTo(bx - 40, by + 60); g.fillStyle = '#f4f4ff'; g.fill();
      rr(g, bx - 30, by - 100, 60, 26, 6); g.fillStyle = '#ffd23c'; g.fill();
      g.restore();
      bossLabel(g, bx, by + 105, 'キングノレート', s.ang);
    }
    // 盤面
    rr(g, X0 - 12, Y0 - 12, COLS * CS + 24, ROWS * CS + 24, 16); g.fillStyle = 'rgba(10,5,25,.85)'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#b48cff'; g.stroke();
    const rows = L(s.bd), cl = new Set(L(s.cl));
    rows.forEach((row, y) => {
      for (let x = 0; x < COLS; x++) {
        const t = +String(row)[x] - 1;
        const cx = X0 + x * CS + CS / 2, cy = Y0 + y * CS + CS / 2;
        rr(g, cx - CS / 2 + 2, cy - CS / 2 + 2, CS - 4, CS - 4, 8); g.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.12)'; g.fill();
        if (t < 0) continue;
        if (cl.has(y * COLS + x)) { const k = Math.min(1, s.cp / 0.32); drawItem(g, t, cx, cy, 20 * (1 + k * 0.5), 1 - k); circle(g, cx, cy, 26 * k, null, '#fff', 3); }
        else drawItem(g, t, cx, cy, 20);
      }
    });
    // ノレサ
    L(s.bo).forEach((b) => {
      const x = b[1], y = b[2];
      g.save(); g.globalAlpha = 0.85; circle(g, x, y, 20, '#fff', '#666', 2); g.restore();
      g.fillStyle = '#333'; g.fillRect(x - 8, y - 6, 4, 6); g.fillRect(x + 4, y - 6, 4, 6);
    });
    // カーソル
    L(s.cu).forEach((c, i) => {
      const x = X0 + c[0] * CS, y = Y0 + c[1] * CS;
      const pulse = c[2] ? 3 + Math.sin(v.t * 14) * 2 : 0;
      const ox = c[4] ? Math.sin(v.t * 60) * 4 : 0;
      rr(g, x - pulse + ox + i * 1.5, y - pulse + i * 1.5, CS + pulse * 2 - i * 3, CS + pulse * 2 - i * 3, 10);
      g.lineWidth = c[2] ? 6 : 4; g.strokeStyle = PCOL[i]; g.stroke();
      txt(g, `${i + 1}P`, x + (i % 2 ? CS - 10 : 10), y + (i < 2 ? 8 : CS - 8), { size: 12, col: '#fff', lw: 3, stroke: PCOL[i] });
      if (c[3]) { txt(g, `しびれ！Z×${c[3]}`, x + CS / 2, y - 10, { size: 14, col: '#e0c8ff' }); }
    });
    // 攻撃エフェクト
    L(s.sh).forEach((sh) => {
      const t = (s.T - sh[3]) / 0.6; if (t < 0 || t > 1) return;
      const x = sh[1] + (bx - sh[1]) * t, y = sh[2] + (by - sh[2]) * t - Math.sin(t * Math.PI) * 60;
      circle(g, x, y, sh[4] ? 18 : 10, sh[4] ? '#ffe21a' : '#ffffff', '#ff9de0', 3);
      if (t > 0.85) boom(g, bx, by, (t - 0.85) * 6, 50);
    });
    if (dead > 0) boom(g, bx, by, dead, 120);
  }
}
