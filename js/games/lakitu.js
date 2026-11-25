// 1. ノレーム（ジュゲム）: ルーレットブロックをたたいてノラー（キラー）を飛ばす
import { BossBase, actor, stepActor, inEllipse, separate, proj, drawChar, shadow, circle, ellipse, rr, txt, spiky, grad, boom, bossLabel, emptyIn, steer, dist, rnd, pick, r0, L, sm, LV, clamp } from '../engine.js';

const RX = 380, RY = 210, BZ = 74;
const FACES = ['1', '2', '3', 'E'];

export default class Lakitu extends BossBase {
  static meta = {
    id: 'lakitu', boss: 'ノレーム', title: 'ソックイット・トゥ・ノレーム', jp: 'ノレームをぶっとばせ！', stage: 'ノレートロード 中ボス', bg: '#62b8ff',
    rules: ['フィールドの「ルーレットブロック」をジャンプでたたこう', 'ブロックの絵柄の数だけノラーが飛んでいき、1発 +1点', 'タマゴの絵柄だとトゲノーが出てくる！', 'トゲノーにふれると -1点（いかり時のデカトゲノーは -2点）', 'フィールドから落ちても点は減らない', 'とどめをさすと +3点ボーナス'],
    controls: [['←↑↓→ / WASD', 'いどう'], ['Z / スペース', 'ジャンプ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(10 + 6 * this.n);
    this.ps = this.slots.map((_, i) => actor(i, -150 + i * 100, 90));
    this.bl = []; this.bu = []; this.sp = []; this.eg = []; this.id = 0;
    this.bo = { x: 0, vx: 110 };
    this.eggT = 3; this.wait = 0.5;
  }
  spawnBlocks() {
    this.bl = [];
    for (let k = 0; k < 3; k++) {
      let x, y, ok, tries = 0;
      do {
        x = rnd(-RX * 0.72, RX * 0.72); y = rnd(-RY * 0.6, RY * 0.7);
        ok = inEllipse(x, y, RX * 0.75, RY * 0.75) && this.bl.every((b) => dist(b.x, b.y, x, y) > 150);
      } while (!ok && ++tries < 60);
      this.bl.push({ id: ++this.id, x, y, ph: rnd(0, 4), sp: rnd(2.2, 3.2), hit: 0 });
    }
  }
  face(b, t = this.T) { return Math.floor(t * b.sp + b.ph) % 4; }
  update(dt, ins) {
    this.tick(dt);
    const ang = this.angry;
    // ボス移動
    const spd = ang ? 190 : 110;
    this.bo.vx = Math.sign(this.bo.vx) * spd;
    this.bo.x += this.bo.vx * dt;
    if (Math.abs(this.bo.x) > 300) { this.bo.x = Math.sign(this.bo.x) * 300; this.bo.vx *= -1; }
    // ブロック
    if (!this.done) {
      if (this.bl.length === 0 || this.bl.every((b) => b.hit)) {
        this.wait -= dt;
        if (this.wait <= 0) { this.spawnBlocks(); this.wait = 1.0; }
      }
    }
    // プレイヤー
    this.ps.forEach((p, i) => {
      const inp = this.done ? emptyIn() : ins[i];
      if (p.fall > 0) {
        p.fall -= dt; p.z -= 500 * dt;
        if (p.fall <= 0) { p.x = rnd(-60, 60); p.y = rnd(-20, 40); p.z = 120; p.vz = 0; p.inv = 1.2; }
        return;
      }
      const prevZ = p.z;
      stepActor(p, inp, dt, { speed: 240 });
      if (!inEllipse(p.x, p.y, RX + 8, RY + 8) && p.z < 30) { p.fall = 1.6; p.vz = 0; return; }
      // ブロックをたたく
      if (p.vz > 0 && p.z > BZ - 30) for (const b of this.bl) {
        if (b.hit || dist(p.x, p.y, b.x, b.y) > 34) continue;
        b.hit = 1; p.vz = -80; b.ht = this.T;
        const f = this.face(b);
        if (f < 3) {
          for (let k = 0; k <= f; k++) this.bu.push({ id: ++this.id, s: i, x: b.x + (k - f / 2) * 22, y: b.y, z: BZ, t: -k * 0.18 });
        } else {
          this.sp.push({ id: ++this.id, x: b.x, y: b.y, a: rnd(0, Math.PI * 2), big: 0, z: BZ, vz: 150 });
        }
        break;
      }
      void prevZ;
    });
    separate(this.ps.filter((p) => !p.fall));
    // ノラー（キラー）
    for (const u of this.bu) {
      u.t += dt / 0.9;
      if (u.t >= 1 && !u.dn) {
        u.dn = 1;
        const [sx, sy] = proj(this.bo.x, -300, 5);
        if (this.hit(1, [u.s], sx, sy)) this.add(u.s, 1, sx + rnd(-20, 20), sy - 20);
        this.lastHitT = this.T;
      }
    }
    this.bu = this.bu.filter((u) => !u.dn);
    // タマゴ投げ
    if (!this.done) {
      this.eggT -= dt;
      if (this.eggT <= 0) {
        this.eggT = ang ? rnd(1.4, 2.0) : rnd(2.4, 3.2);
        const tgt = Math.random() < 0.6 ? pick(this.ps.filter((p) => !p.fall)) : null;
        const tx = tgt ? tgt.x + rnd(-40, 40) : rnd(-RX * 0.7, RX * 0.7), ty = tgt ? tgt.y + rnd(-30, 30) : rnd(-RY * 0.6, RY * 0.6);
        this.eg.push({ id: ++this.id, x0: this.bo.x, x1: tx, y1: ty, t: 0, big: ang ? 1 : 0 });
        if (this.sp.length > 9) this.sp.shift();
      }
    }
    for (const e of this.eg) {
      e.t += dt / 1.0;
      if (e.t >= 1) { e.dn = 1; this.sp.push({ id: ++this.id, x: e.x1, y: e.y1, a: rnd(0, Math.PI * 2), big: e.big, z: 0, vz: 0 }); }
    }
    this.eg = this.eg.filter((e) => !e.dn);
    // トゲノー
    for (const s of this.sp) {
      if (s.vz || s.z > 0) { s.vz -= 900 * dt; s.z += s.vz * dt; if (s.z <= 0) { s.z = 0; s.vz = 0; } }
      const v = s.big ? 60 : 75;
      s.x += Math.cos(s.a) * v * dt; s.y += Math.sin(s.a) * v * dt;
      if (Math.random() < dt * 0.3) s.a += rnd(-1, 1);
      if (!inEllipse(s.x, s.y, RX + 20, RY + 20)) s.out = 1;
      const R = s.big ? 40 : 26;
      if (this.done) continue;
      for (const p of this.ps) {
        if (p.fall || p.inv > 0 || p.z > 26) continue;
        if (dist(p.x, p.y, s.x, s.y) < R) {
          const [sx, sy] = proj(p.x, p.y, 40);
          this.add(p.s, s.big ? -2 : -1, sx, sy);
          p.inv = 1.4; p.vz = 300; p.z = 1;
          const a = Math.atan2(p.y - s.y, p.x - s.x); p.x += Math.cos(a) * 30; p.y += Math.sin(a) * 30;
        }
      }
    }
    this.sp = this.sp.filter((s) => !s.out);
  }
  cpuInput(i) {
    const p = this.ps[i], inp = emptyIn(), lv = this.lv(i), k = LV(lv);
    if (p.fall) return inp;
    let tx = 0, ty = 0;
    const open = this.bl.filter((b) => !b.hit);
    if (open.length) {
      open.sort((a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y));
      const b = open[(i + (this.T % 7 > 5 ? 1 : 0)) % Math.min(open.length, lv === 0 ? 2 : 1)] || open[0];
      tx = b.x; ty = b.y;
      const d = dist(p.x, p.y, b.x, b.y);
      if (d < 20 && p.z === 0) {
        const f = this.face(b, this.T + 0.22);
        const want = lv === 2 ? f === 2 || (f === 1 && Math.random() < 0.02) : lv === 1 ? f !== 3 : Math.random() < 0.08;
        if (want) inp.A = 1;
      }
    }
    // トゲノー回避
    for (const s of this.sp) {
      const d = dist(p.x, p.y, s.x, s.y);
      if (d < (s.big ? 90 : 70) * k + 20) { tx = p.x + (p.x - s.x) * 3; ty = p.y + (p.y - s.y) * 3; }
    }
    // 端に寄りすぎない
    if (!inEllipse(p.x, p.y, RX * 0.85, RY * 0.85)) { tx = 0; ty = 0; }
    steer(inp, tx - p.x, ty - p.y, 8);
    if (Math.random() > k + 0.2) { inp.l = inp.r = 0; }
    return inp;
  }
  state() {
    return {
      ...this.head(),
      ps: this.ps.map((p) => [r0(p.x), r0(p.y), r0(p.z), p.inv > 0 ? 1 : 0, p.fall > 0 ? 1 : 0]),
      bl: this.bl.map((b) => [b.id, r0(b.x), r0(b.y), this.face(b), b.hit]),
      bu: this.bu.map((u) => [u.id, r0(u.x), r0(u.y), Math.max(0, Math.round(u.t * 100) / 100)]),
      sp: this.sp.map((s) => [s.id, r0(s.x), r0(s.y), s.big, r0(s.z)]),
      eg: this.eg.map((e) => [e.id, r0(e.x0), r0(e.x1), r0(e.y1), Math.round(e.t * 100) / 100, e.big]),
      bo: r0(this.bo.x),
    };
  }
  static render(g, s, v) {
    // 空と雲
    grad(g, 0, 540, '#5fb4ff', '#cdeeff');
    for (let i = 0; i < 6; i++) { const x = ((i * 190 + v.t * 8) % 1100) - 70; ellipse(g, x, 60 + (i % 3) * 30, 60, 18, 'rgba(255,255,255,.7)'); }
    // 下の穴
    ellipse(g, 480, 330, RX + 60, RY * 0.55 + 70, '#2a6b2a');
    ellipse(g, 480, 345, RX + 30, RY * 0.55 + 40, '#183d18');
    // フィールド
    ellipse(g, 480, 312, RX + 6, RY * 0.55 + 10, '#7a5a2a');
    ellipse(g, 480, 300, RX, RY * 0.55, '#6cc94a', '#3b8a2a', 4);
    ellipse(g, 480, 300, RX * 0.7, RY * 0.55 * 0.7, null, 'rgba(255,255,255,.18)', 3);
    // ボス
    const bx = sm('lk_bo', s.bo);
    const [bsx, bsy] = proj(bx, -300, 5);
    const dead = s.done ? v.t - s.dT : -1;
    if (dead < 0 || dead < 1.2) {
      const fly = dead > 0 ? dead * 300 : 0;
      const yy = bsy + Math.sin(v.t * 2) * 6 - fly;
      for (let i = -2; i <= 2; i++) ellipse(g, bsx + i * 24, yy + 20 - Math.abs(i) * 3, 30, 20, '#fff', '#bcd', 2);
      circle(g, bsx, yy - 14, 24, s.ang ? '#ff5a3c' : '#ffd23c', '#333', 3);
      rr(g, bsx - 16, yy - 22, 32, 10, 5); g.fillStyle = '#333'; g.fill();
      bossLabel(g, bsx + 110, yy - 10, 'ノレーム', s.ang);
    }
    if (dead > 0) boom(g, bsx, bsy - 60 - dead * 300, dead * 1.3, 90);
    // 描画リスト（奥から）
    const items = [];
    L(s.bl).forEach((b) => items.push({ y: b[2], f: () => {
      const [x, y] = proj(b[1], b[2], 0);
      shadow(g, x, y, 22, 0.35);
      const bz = b[4] ? BZ + 10 : BZ;
      if (b[4]) g.globalAlpha = 0.35;
      rr(g, x - 22, y - bz - 22, 44, 44, 8); g.fillStyle = b[4] ? '#777' : '#ffcf3a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#5a3d00'; g.stroke();
      const f = FACES[b[3]];
      if (b[4]) txt(g, '・', x, y - bz, { size: 20 });
      else if (f === 'E') { circle(g, x, y - bz, 12, '#fff', '#c33', 3); txt(g, '!', x, y - bz, { size: 14, col: '#c33', stroke: null }); }
      else { const n = +f; for (let k = 0; k < n; k++) { const ox = (k - (n - 1) / 2) * 12; rr(g, x + ox - 5, y - bz - 10, 10, 20, 5); g.fillStyle = '#222'; g.fill(); } }
      g.globalAlpha = 1;
    } }));
    L(s.sp).forEach((p) => items.push({ y: p[2], f: () => {
      const x0 = sm('lk_spx' + p[0], p[1]), y0 = sm('lk_spy' + p[0], p[2]);
      const [x, y] = proj(x0, y0, p[4]);
      shadow(g, x, proj(x0, y0, 0)[1], p[3] ? 30 : 18);
      spiky(g, x, y - (p[3] ? 24 : 14), p[3] ? 24 : 14, '#e2332a', '#fff');
    } }));
    L(s.ps).forEach((p, i) => items.push({ y: p[1], f: () => {
      const x0 = sm('lk_px' + i, p[0]), y0 = sm('lk_py' + i, p[1]);
      const [x, y] = proj(x0, y0, p[2]);
      if (p[4]) { drawChar(g, x, y + 20, i, v.slots[i].ci, { alpha: 0.4, r: 14 }); return; }
      shadow(g, x, proj(x0, y0, 0)[1], 18);
      drawChar(g, x, y - 18, i, v.slots[i].ci, { blink: p[3] });
    } }));
    items.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    // タマゴ
    L(s.eg).forEach((e) => {
      const t = e[4];
      const [x0, y0] = proj(e[1], -300, 5), [x1, y1] = proj(e[2], e[3], 0);
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 120;
      ellipse(g, x, y, e[5] ? 16 : 10, e[5] ? 20 : 13, '#fff', '#c33', 3);
    });
    // ノラー（キラー）
    L(s.bu).forEach((u) => {
      const t = u[3]; if (t <= 0) return;
      const [x0, y0] = proj(u[1], u[2], BZ), [x1, y1] = proj(bx, -300, 5);
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      const a = Math.atan2(y1 - y0, x1 - x0);
      g.save(); g.translate(x, y); g.rotate(a);
      rr(g, -20, -11, 36, 22, 11); g.fillStyle = '#1b1b1b'; g.fill(); g.strokeStyle = '#888'; g.lineWidth = 2; g.stroke();
      g.restore();
    });
  }
}
