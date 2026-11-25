// 7. ノレノレ（プクプク）: こうらをなげて当てる
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, steer, rnd, ri, r0, L, sm, LV, dist, clamp } from '../engine.js';

const X0 = -430, X1 = 430, Y0 = -170, Y1 = 200;
const SX = (x) => 480 + x, SY = (y) => 300 + y;

export default class Cheep extends BossBase {
  static meta = {
    id: 'cheep', boss: 'ノレノレ', title: 'ノレノレ・ショット', jp: 'ノレノレにこうらをぶつけろ！', stage: 'レットービーチ 中ボス', bg: '#1d6fb8',
    rules: ['あわの中のこうらにふれてゲット', 'ノレノレの前でこうらを投げて命中させると +3点', 'ノレノレのたいあたり（赤い円）に当たると -1点', 'いかり時はたいあたりが速く、連続になる！', 'とどめをさすと +3点ボーナス'],
    controls: [['←↑↓→ / WASD', 'およぐ'], ['Z / スペース', 'こうらを投げる']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(4 * this.n + 2);
    this.ps = this.slots.map((_, i) => ({ s: i, x: -240 + i * 160, y: 150, hold: 0, inv: 0, fx: 0 }));
    this.bo = { x: 0, y: -40, r: 95, t: 0 };
    this.bub = []; this.sh = []; this.id = 0; this.bubT = 0;
    this.ch = null; this.chT = 3.5; this.chN = 0;
  }
  update(dt, ins) {
    this.tick(dt);
    const ang = this.angry;
    // ボス移動
    const b = this.bo;
    if (!this.ch) { b.t += dt * (ang ? 1.5 : 1); b.x = Math.sin(b.t * 0.7) * 300; b.y = -40 + Math.sin(b.t * 1.3) * 90; }
    // たいあたり
    if (!this.done) {
      if (!this.ch) {
        this.chT -= dt;
        if (this.chT <= 0) {
          const tg = this.ps[ri(0, this.n - 1)];
          this.ch = { x: clamp(tg.x + rnd(-60, 60), X0 + 80, X1 - 80), y: clamp(tg.y + rnd(-40, 40), Y0 + 70, Y1 - 60), t: 0, w: ang ? 0.75 : 1.15, r: 115 };
          this.chN = this.chN > 0 ? this.chN - 1 : ang ? ri(1, 2) : 0;
        }
      } else {
        const c = this.ch; c.t += dt;
        if (c.t >= c.w && !c.hit) {
          c.hit = 1;
          for (const p of this.ps) if (p.inv <= 0 && dist(p.x, p.y, c.x, c.y) < c.r) { this.add(p.s, -1, SX(p.x), SY(p.y) - 30); p.inv = 1.3; p.hold = 0; const a = Math.atan2(p.y - c.y, p.x - c.x); p.x += Math.cos(a) * 60; p.y += Math.sin(a) * 60; }
        }
        if (c.t > c.w + 0.55) { b.x = c.x; b.y = c.y - 80; this.ch = null; this.chT = this.chN > 0 ? 0.35 : ang ? rnd(2.0, 3.0) : rnd(3.2, 4.4); }
      }
    }
    // あわ
    this.bubT -= dt;
    if (this.bubT <= 0 && this.bub.length < 3 + this.n) { this.bubT = rnd(0.5, 1.1); this.bub.push({ id: ++this.id, x: rnd(X0 + 40, X1 - 40), y: Y1 + 30, w: rnd(0, 6) }); }
    for (const q of this.bub) { q.y -= 48 * dt; q.x += Math.sin(this.T * 2 + q.w) * 20 * dt; if (q.y < Y0 - 40) q.out = 1; }
    // プレイヤー
    this.ps.forEach((p, i) => {
      const inp = this.done ? emptyIn() : ins[i];
      if (p.inv > 0) p.inv -= dt;
      let mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), my = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      const m = Math.hypot(mx, my); if (m) { mx /= m; my /= m; if (mx) p.fx = mx; }
      p.x = clamp(p.x + mx * 215 * dt, X0, X1); p.y = clamp(p.y + my * 215 * dt, Y0, Y1);
      if (!p.hold) for (const q of this.bub) if (!q.out && dist(p.x, p.y, q.x, q.y) < 34) { q.out = 1; p.hold = 1; }
      if (inp.A && p.hold) {
        p.hold = 0;
        this.sh.push({ id: ++this.id, s: i, x: p.x, y: p.y, t: 0 });
      }
    });
    this.bub = this.bub.filter((q) => !q.out);
    // こうら
    for (const k of this.sh) {
      k.t += dt / 0.5;
      if (k.t >= 1 && !k.dn) {
        k.dn = 1;
        if (!this.ch && dist(k.x, k.y, b.x, b.y) < b.r) {
          if (this.hit(1, [k.s], SX(b.x), SY(b.y))) this.add(k.s, 3, SX(b.x), SY(b.y) - 40);
          this.flash = this.T;
        } else this.pop(SX(k.x), SY(k.y) - 40, 'はずれ', '#cde');
      }
    }
    this.sh = this.sh.filter((k) => !k.dn);
  }
  cpuInput(i) {
    const p = this.ps[i], inp = emptyIn(), k = LV(this.lv(i));
    let tx, ty;
    if (!p.hold) {
      let best = null, bd = 1e9; for (const q of this.bub) { const d = dist(p.x, p.y, q.x, q.y - 30); if (d < bd) { bd = d; best = q; } }
      if (best) { tx = best.x; ty = best.y - 25; } else { tx = 0; ty = 120; }
    } else {
      tx = this.bo.x + (i - 1.5) * 25; ty = this.bo.y + 20;
      if (!this.ch && dist(p.x, p.y, this.bo.x, this.bo.y) < this.bo.r * (0.9 - k * 0.4) && Math.random() < 0.2 + k * 0.6) inp.A = 1;
    }
    if (this.ch && dist(p.x, p.y, this.ch.x, this.ch.y) < this.ch.r + 30 && Math.random() < k + 0.15) {
      const a = Math.atan2(p.y - this.ch.y, p.x - this.ch.x); tx = p.x + Math.cos(a) * 200; ty = p.y + Math.sin(a) * 200;
    }
    steer(inp, tx - p.x, ty - p.y, 8);
    return inp;
  }
  state() {
    const c = this.ch;
    return {
      ...this.head(),
      ps: this.ps.map((p) => [r0(p.x), r0(p.y), p.hold, p.inv > 0 ? 1 : 0, p.fx < 0 ? 1 : 0]),
      bo: [r0(this.bo.x), r0(this.bo.y), this.bo.r],
      bu: this.bub.map((q) => [q.id, r0(q.x), r0(q.y)]),
      sh: this.sh.map((k) => [k.id, r0(k.x), r0(k.y), Math.round(k.t * 100) / 100]),
      ch: c ? [r0(c.x), r0(c.y), c.r, Math.round((c.t / c.w) * 100) / 100] : 0,
      fl: this.flash ? r1(this.flash) : -9,
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#3aa3e8', '#0a2f6a');
    g.save(); g.globalAlpha = 0.12; for (let i = 0; i < 6; i++) { g.beginPath(); const x = 100 + i * 170 + Math.sin(v.t * 0.5 + i) * 30; g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x - 40, 540); g.lineTo(x - 100, 540); g.fillStyle = '#fff'; g.fill(); } g.restore();
    g.fillStyle = '#c8b27a'; g.beginPath(); g.moveTo(0, 540); g.quadraticCurveTo(480, 470, 960, 540); g.fill();
    for (let i = 0; i < 9; i++) { const x = 40 + i * 115; g.fillStyle = '#2f8a5a'; g.fillRect(x, 470 - (i % 3) * 18, 8, 70); }
    const dead = s.done ? v.t - s.dT : -1;
    const bo = L(s.bo), ch = s.ch ? L(s.ch) : null;
    // ボス
    let bx = SX(sm('cc_bx', bo[0] || 0)), by = SY(sm('cc_by', bo[1] || 0)), br = bo[2] || 95, sc = 1;
    if (ch) {
      const t = ch[3];
      ellipse(g, SX(ch[0]), SY(ch[1]), ch[2], ch[2] * 0.7, `rgba(255,40,40,${0.18 + 0.25 * Math.min(1, t)})`, '#ff3030', 4);
      txt(g, '!', SX(ch[0]), SY(ch[1]), { size: 40, col: '#ff4040' });
      if (t < 1) { sc = 0.6 - t * 0.2; by -= 40; }
      else { const k = Math.min(1, (t - 1) * 3); bx = SX(ch[0]); by = SY(ch[1]); sc = 0.5 + k * 1.1; }
    }
    if (dead < 0.8) {
      g.save(); g.translate(bx, by); g.scale(sc, sc);
      if (dead > 0) g.rotate(-dead * 0.8);
      g.beginPath(); g.moveTo(br * 0.8, 0); g.lineTo(br * 1.35, -br * 0.5); g.lineTo(br * 1.35, br * 0.5); g.closePath(); g.fillStyle = s.ang ? '#c2185b' : '#e94f2a'; g.fill();
      ellipse(g, 0, 0, br, br * 0.8, s.ang ? '#ff4f7a' : '#ff6a3c', '#5a1a0a', 5);
      g.beginPath(); g.moveTo(-10, -br * 0.78); g.lineTo(30, -br * 1.15); g.lineTo(50, -br * 0.7); g.fillStyle = '#ffd23c'; g.fill();
      ellipse(g, -br * 0.3, br * 0.25, br * 0.45, br * 0.3, '#ffd9b8');
      const fl = s.T - s.fl < 0.15;
      if (fl) ellipse(g, 0, 0, br, br * 0.8, 'rgba(255,255,255,.6)');
      g.restore();
      if (!ch) bossLabel(g, bx, by - br - 10, 'ノレノレ', s.ang);
    }
    if (dead > 0) boom(g, bx, by, dead, 140);
    // あわ
    L(s.bu).forEach((q) => {
      const x = SX(sm('cc_qx' + q[0], q[1])), y = SY(sm('cc_qy' + q[0], q[2]));
      circle(g, x, y, 24, 'rgba(200,240,255,.25)', 'rgba(255,255,255,.8)', 2);
      ellipse(g, x, y + 2, 13, 10, '#2fb24a', '#123', 2);
    });
    // プレイヤー
    L(s.ps).forEach((p, i) => {
      const x = SX(sm('cc_px' + i, p[0])), y = SY(sm('cc_py' + i, p[1]));
      drawChar(g, x, y, i, v.slots[i].ci, { blink: p[3], noRing: true });
      if (p[2]) ellipse(g, x + (p[4] ? -20 : 20), y + 8, 11, 8, '#2fb24a', '#123', 2);
    });
    // 投げたこうら
    L(s.sh).forEach((k) => {
      const t = k[3], x0 = SX(k[1]), y0 = SY(k[2]);
      const x = x0 + (bx - x0) * t * 0.15, y = y0 - t * 60;
      ellipse(g, x, y, 12 * (1 - t * 0.6), 9 * (1 - t * 0.6), '#2fb24a', '#123', 2);
      g.save(); g.globalAlpha = 0.4; circle(g, x, y + 14, 4, '#fff'); g.restore();
    });
  }
}
function r1(v) { return Math.round(v * 10) / 10; }
