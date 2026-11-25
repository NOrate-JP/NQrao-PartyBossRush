// 2. ノレーチャン（ハナチャン）: 体の節をヒップドロップでふむ
import { BossBase, actor, stepActor, clampEllipse, separate, proj, drawChar, shadow, circle, ellipse, txt, grad, boom, bossLabel, emptyIn, steer, dist, rnd, ri, r0, L, sm, LV } from '../engine.js';

const RX = 400, RY = 220, SEG = 10, GAP = 34;

export default class Wiggler extends BossBase {
  static meta = {
    id: 'wiggler', boss: 'ノレーチャン', title: 'ノレーチャン・バウンス', jp: 'ノレーチャンをふみまくれ！', stage: 'ノレートロード ボス', bg: '#3f8a3a',
    rules: ['ジャンプ中にもう一度ボタンでヒップドロップ！', 'ノレーチャンの体（むらさきの節）をふむと +1点', 'オレンジの節は +3点＆大ダメージ', 'ノックンフラワーにふれると -1点', '他のプレイヤーをヒップドロップすると足止めできる', 'とどめをさすと +3点ボーナス'],
    controls: [['←↑↓→ / WASD', 'いどう'], ['Z / スペース', 'ジャンプ'], ['ジャンプ中に Z', 'ヒップドロップ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(20 + 10 * this.n);
    this.ps = this.slots.map((_, i) => actor(i, -150 + i * 100, 150));
    this.hd = { x: 0, y: -60, a: 0 };
    this.seg = []; for (let k = 0; k < SEG; k++) this.seg.push({ x: -k * GAP, y: -60, cd: 0 });
    this.org = ri(2, SEG - 1);
    this.pk = [[-250, 60], [250, 40], [0, 140]].map(([x, y], k) => ({ x, y, t: rnd(0, 3) + k }));
  }
  update(dt, ins) {
    this.tick(dt);
    const ang = this.angry;
    // ノレーチャン移動
    if (!this.done) {
      const h = this.hd, spd = ang ? 175 : 95;
      h.a += Math.sin(this.T * 0.9) * dt * 1.2 + (Math.random() - 0.5) * dt * 2;
      const nx = h.x + Math.cos(h.a) * spd * dt, ny = h.y + Math.sin(h.a) * spd * dt;
      if ((nx * nx) / (RX * 0.8) ** 2 + (ny * ny) / (RY * 0.75) ** 2 > 1) {
        const ta = Math.atan2(-h.y, -h.x); let da = ta - h.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        h.a += Math.sign(da) * Math.min(Math.abs(da), 3.2 * dt);
      }
      h.x += Math.cos(h.a) * spd * dt; h.y += Math.sin(h.a) * spd * dt;
      this.seg[0].x = h.x; this.seg[0].y = h.y;
      for (let k = 1; k < SEG; k++) {
        const a = this.seg[k - 1], b = this.seg[k], d = dist(a.x, a.y, b.x, b.y);
        if (d > GAP) { b.x = a.x + (b.x - a.x) * GAP / d; b.y = a.y + (b.y - a.y) * GAP / d; }
      }
    }
    this.seg.forEach((s) => { if (s.cd > 0) s.cd -= dt; });
    // ノックンフラワー
    const npk = ang ? 3 : 2;
    this.pk.forEach((p, k) => { if (k < npk) p.t += dt; });
    const up = (p) => { const c = p.t % 5; return c > 2.6 && c < 4.8; };
    // プレイヤー
    this.ps.forEach((p, i) => {
      const inp = this.done ? emptyIn() : ins[i];
      if (p.pcd > 0 && inp.A && p.z > 0) inp.A = 0;
      const r = stepActor(p, inp, dt, { pound: true, speed: 235 });
      clampEllipse(p, RX, RY);
      if (this.done) return;
      // 体をふむ
      if (p.pcd > 0) p.pcd -= dt;
      if (p.pd && p.z < 52) {
        for (let k = 0; k < SEG; k++) {
          const s = this.seg[k];
          if (s.cd > 0 || dist(p.x, p.y, s.x, s.y) > 32) continue;
          const big = k === this.org;
          const [sx, sy] = proj(s.x, s.y, 60);
          if (this.hit(big ? 3 : 1, [i], sx, sy)) this.add(i, big ? 3 : 1, sx, sy);
          s.cd = 0.45; p.pd = 0; p.vz = 560; p.z = Math.max(p.z, 40); p.pcd = 1.0;
          if (big) this.org = ri(1, SEG - 1);
          break;
        }
      }
      if (r.pounded) {
        for (const q of this.ps) if (q !== p && q.z < 20 && dist(p.x, p.y, q.x, q.y) < 30) { q.st = 1.0; }
      }
      // 地上では体にぶつかると押し出される
      if (p.z < 40) for (const s of this.seg) {
        const d = dist(p.x, p.y, s.x, s.y);
        if (d < 34 && d > 0.01) { p.x = s.x + (p.x - s.x) * 34 / d; p.y = s.y + (p.y - s.y) * 34 / d; }
      }
      // フラワー
      this.pk.forEach((f, k) => {
        if (k >= npk || !up(f) || p.inv > 0 || p.z > 45) return;
        if (dist(p.x, p.y, f.x, f.y) < 34) {
          const [sx, sy] = proj(p.x, p.y, 40); this.add(i, -1, sx, sy); p.inv = 1.3;
          const a = Math.atan2(p.y - f.y, p.x - f.x); p.x += Math.cos(a) * 50; p.y += Math.sin(a) * 50; p.vz = 300; p.z = 1;
        }
      });
    });
    separate(this.ps);
  }
  cpuInput(i) {
    const p = this.ps[i], inp = emptyIn(), lv = this.lv(i), k = LV(lv);
    let ti = (i * 3 + 1) % SEG;
    if (lv === 2 && (this.T + i * 3) % 8 < 3) ti = this.org;
    else if (lv === 1 && (this.T + i * 3) % 10 < 2) ti = this.org;
    const s = this.seg[ti];
    const spd = this.angry ? 175 : 95;
    const lead = 0.35 * k;
    const tx = s.x + Math.cos(this.hd.a) * spd * lead, ty = s.y + Math.sin(this.hd.a) * spd * lead;
    let gx = tx, gy = ty;
    const npk = this.angry ? 3 : 2;
    this.pk.forEach((f, j) => { if (j < npk && dist(p.x, p.y, f.x, f.y) < 70) { gx = p.x + (p.x - f.x) * 2; gy = p.y + (p.y - f.y) * 2; } });
    steer(inp, gx - p.x, gy - p.y, 6);
    const d = dist(p.x, p.y, s.x, s.y);
    if (p.z === 0 && d < 55 + 40 * k && Math.random() < 0.25 + k * 0.5) inp.A = 1;
    if (p.z > 30 && p.vz < 120 && !p.pd) {
      const near = this.seg.some((q) => dist(p.x, p.y, q.x, q.y) < 30);
      if (near || Math.random() < 0.02) inp.A = 1;
    }
    return inp;
  }
  state() {
    const npk = this.angry ? 3 : 2;
    return {
      ...this.head(),
      ps: this.ps.map((p) => [r0(p.x), r0(p.y), r0(p.z), p.inv > 0 ? 1 : 0, p.st > 0 ? 1 : 0, p.pd]),
      sg: this.seg.map((s) => [r0(s.x), r0(s.y), s.cd > 0.25 ? 1 : 0]),
      og: this.org, ha: Math.round(this.hd.a * 100) / 100,
      pk: this.pk.slice(0, npk).map((f) => { const c = f.t % 5; return [f.x, f.y, c > 2.6 && c < 4.8 ? 1 : c > 2.1 && c <= 2.6 ? 2 : 0]; }),
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#204d22', '#3f7f35');
    for (let i = 0; i < 14; i++) { const x = (i * 77) % 980, y = 40 + (i % 4) * 22; circle(g, x, y, 56, i % 2 ? '#1b4a1d' : '#235a24'); }
    ellipse(g, 480, 300, RX + 20, RY * 0.55 + 14, '#4f3a1f');
    ellipse(g, 480, 300, RX, RY * 0.55, '#a8915a', '#6f5a32', 4);
    const dead = s.done ? v.t - s.dT : -1;
    const items = [];
    L(s.pk).forEach((f) => items.push({ y: f[1], f: () => {
      const [x, y] = proj(f[0], f[1]);
      ellipse(g, x, y, 22, 9, '#1d3d10');
      if (f[2] === 0) return;
      const h = f[2] === 2 ? 14 : 48;
      g.fillStyle = '#2f8a2a'; g.fillRect(x - 4, y - h, 8, h);
      circle(g, x, y - h - 14, f[2] === 2 ? 10 : 20, '#d62828', '#222', 3);
      if (f[2] === 1) for (let k = 0; k < 6; k++) { const a = k * 1.05; circle(g, x + Math.cos(a) * 11, y - h - 14 + Math.sin(a) * 11, 3.5, '#fff'); }
    } }));
    const sg = L(s.sg);
    sg.forEach((q, k) => items.push({ y: q[1] + 0.1, f: () => {
      if (dead > 0.7) return;
      const x0 = sm('wg_x' + k, q[0]), y0 = sm('wg_y' + k, q[1]);
      const [x, y] = proj(x0, y0);
      shadow(g, x, y, 26);
      const wob = Math.sin(v.t * 10 + k) * 3;
      const col = k === s.og ? '#ff8a1f' : s.ang ? '#d83a5a' : '#8e4bd8';
      const yy = y - 26 - (k % 2 ? wob : -wob) - (dead > 0 ? dead * 80 : 0);
      circle(g, x, yy, k === 0 ? 30 : 26, q[2] ? '#fff' : col, '#2a1640', 3);
      if (k === 0) { circle(g, x, yy - 4, 20, s.ang ? '#ff4a4a' : '#ffe14d', '#2a1640', 2); }
      else { g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - 8, yy - 10, 7, 0, 7); g.fill(); }
    } }));
    L(s.ps).forEach((p, i) => items.push({ y: p[1], f: () => {
      const x0 = sm('wg_px' + i, p[0]), y0 = sm('wg_py' + i, p[1]);
      const [x, y] = proj(x0, y0, p[2]);
      shadow(g, x, proj(x0, y0)[1], 18);
      drawChar(g, x, y - 18, i, v.slots[i].ci, { blink: p[3], stun: p[4] });
      if (p[5]) txt(g, '▼', x, y + 8, { size: 16, col: '#fff' });
    } }));
    items.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    if (sg.length) {
      const [hx, hy] = proj(sm('wg_x0', sg[0][0]), sm('wg_y0', sg[0][1]));
      if (dead < 0.7) bossLabel(g, hx, hy - 80, 'ノレーチャン', s.ang);
      if (dead > 0) sg.forEach((q, k) => { const [x, y] = proj(q[0], q[1]); boom(g, x, y - 30, dead * 1.2 - k * 0.04, 50); });
    }
  }
}
