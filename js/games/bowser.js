// 12. トッレ（クッパ）: ブロックバトル（サイコロをなげて自分の顔を出す）
import { BossBase, actor, stepActor, clampRect, separate, proj, drawChar, shadow, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, steer, dist, rnd, ri, r0, L, sm, LV, PCOL, CHARS, pick, clamp, spiky } from '../engine.js';

const XA = -380, XB = 380, YA = -150, YB = 185;
const HZ = ['ノレーチャン', 'キングノレ兵', 'キングノレート', 'レットー', 'ノンノン', 'トッレ'];

export default class Bowser extends BossBase {
  static meta = {
    id: 'bowser', boss: 'トッレ', title: 'トッレのブロックバトル', jp: 'トッレのブロックバトル', stage: 'トッレステーション ボス', bg: '#2a0a3a',
    rules: ['ブロック（サイコロ）をひろって投げ、自分の顔を出そう（1ラウンド10秒）', '自分の顔が出たブロック1つにつき +1点＆攻撃！', 'トッレマークが出ると火の玉が飛んでくる。当たると -1点', 'ほかの人の顔が出たブロックを投げなおすのもアリ', 'いかり時は足場がかたむき、ボスルーレットの攻撃もくる！', 'とどめをさすと +3点ボーナス'],
    controls: [['←↑↓→ / WASD', 'いどう'], ['Z / スペース', 'ブロックをひろう / なげる']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(4 * this.n + 6);
    this.ps = this.slots.map((_, i) => actor(i, -180 + i * 120, 130));
    this.dc = []; this.fb = []; this.id = 0; this.ph = 'intro'; this.pt = 0;
    this.hz = null; this.dz = []; this.spawnQ = [];
  }
  go(p) { this.ph = p; this.pt = 0; }
  toss() {
    const nd = this.n + 3;
    this.dc = [];
    for (let k = 0; k < nd; k++) {
      const tx = rnd(XA + 40, XB - 40), ty = rnd(YA + 30, YB - 40);
      this.dc.push({ id: ++this.id, x: rnd(-60, 60), y: YA - 60, tx, ty, z: 0, vx: 0, vy: 0, f: ri(0, this.n), st: 3, h: -1, t: 0, ft: 0 });
    }
    this.go('toss');
  }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt, ang = this.angry;
    const tilt = ang && (this.ph === 'play' || this.ph === 'settle') ? Math.sin(this.T * 0.9) * 75 : 0;
    this.tilt = tilt;
    // プレイヤー
    const canMove = !this.done && this.ph !== 'intro';
    this.ps.forEach((p, i) => {
      const inp = canMove ? ins[i] : emptyIn();
      const a = inp.A; inp.A = 0;
      stepActor(p, inp, dt, { speed: 225, jump: false });
      p.x += tilt * dt;
      clampRect(p, XA, YA, XB, YB);
      if (this.ph === 'play' && a) {
        if (p.hold >= 0) this.throwDie(p);
        else {
          let best = null, bd = 44;
          for (const d of this.dc) if (d.st === 0 || d.st === 2) { const dd = dist(p.x, p.y, d.x, d.y); if (dd < bd) { bd = dd; best = d; } }
          if (best) { best.st = 1; best.h = i; p.hold = this.dc.indexOf(best); }
        }
      }
      // ダメージ判定
      if (p.inv <= 0 && !this.done) {
        for (const f of this.fb) if (dist(p.x, p.y, f.x, f.y) < f.r + 14) { this.hurt(p); break; }
        if (p.inv <= 0) for (const z of this.dz) if (z[4] && dist(p.x, p.y, z[0], z[1]) < z[2] + 12) { this.hurt(p); break; }
      }
    });
    separate(this.ps, 30);
    // サイコロ
    for (const d of this.dc) {
      if (d.st === 3) { d.t += dt / 1.1; const k = Math.min(1, d.t); d.x = d.x + (d.tx - d.x) * Math.min(1, dt * 6); d.y = d.y + (d.ty - d.y) * Math.min(1, dt * 6); d.z = Math.sin(k * Math.PI) * 120; d.ft += dt; if (d.ft > 0.08) { d.ft = 0; d.f = ri(0, this.n); } if (k >= 1) { d.st = 0; d.z = 0; d.x = d.tx; d.y = d.ty; } continue; }
      if (d.st === 1) { const p = this.ps[d.h]; d.x = p.x; d.y = p.y; d.z = 48; continue; }
      if (d.st === 0) { d.x += tilt * dt * 0.8; d.x = clamp(d.x, XA, XB); continue; }
      // 転がり
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < XA || d.x > XB) { d.vx *= -0.7; d.x = clamp(d.x, XA, XB); }
      if (d.y < YA || d.y > YB) { d.vy *= -0.7; d.y = clamp(d.y, YA, YB); }
      const f = Math.exp(-2.4 * dt); d.vx *= f; d.vy *= f;
      d.z = Math.abs(Math.sin(this.T * 14)) * Math.min(24, Math.hypot(d.vx, d.vy) / 12);
      d.ft += dt; if (d.ft > 0.07) { d.ft = 0; d.f = ri(0, this.n); }
      if (Math.hypot(d.vx, d.vy) < 28) { d.st = 0; d.z = 0; d.f = ri(0, this.n); }
    }
    // 火の玉
    for (const f of this.fb) { f.x += f.vx * dt; f.y += f.vy * dt; if (f.y > YB + 60 || f.x < XA - 80 || f.x > XB + 80) f.out = 1; }
    this.fb = this.fb.filter((f) => !f.out);
    // スポーン待ち
    for (const q of this.spawnQ) { q.t -= dt; if (q.t <= 0) { q.dn = 1; this.spit(q); } }
    this.spawnQ = this.spawnQ.filter((q) => !q.dn);
    // ハザード
    this.dz = [];
    if (this.hz) this.updHazard(dt);
    // フェーズ
    switch (this.ph) {
      case 'intro': if (P > 1.0) this.toss(); break;
      case 'toss': if (P > 1.3) { this.dc.forEach((d) => { if (d.st === 3) { d.st = 0; d.x = d.tx; d.y = d.ty; d.z = 0; } }); this.go('play'); } break;
      case 'play':
        if (P > 10) { this.ps.forEach((p) => { if (p.hold >= 0) this.throwDie(p); }); this.go('settle'); }
        break;
      case 'settle': if (this.dc.every((d) => d.st === 0) || P > 2.2) { this.dc.forEach((d) => { if (d.st !== 0) { d.st = 0; d.vx = d.vy = 0; d.z = 0; } }); this.tally(); } break;
      case 'tally': {
        const per = 0.8;
        while (this.ai < this.groups.length && P > 1.0 + this.ai * per) {
          const gp = this.groups[this.ai];
          let tot = 0; gp.forEach((i) => { tot += this.cnt[i]; });
          if (this.hit(tot, gp, 480, 120)) gp.forEach((i) => { const [x, y] = proj(this.ps[i].x, this.ps[i].y, 60); this.add(i, this.cnt[i], x, y); });
          this.ai++;
        }
        if (P > 1.2 + this.groups.length * per) {
          if (this.done) { this.go('end'); break; }
          if (this.em > 0) { this.queueFire(this.em); this.go('fire'); } else this.go('groan');
        }
        break;
      }
      case 'fire': if (P > 1.0 && !this.spawnQ.length && !this.fb.length) this.afterAttack(); break;
      case 'groan': if (P > 1.5) this.afterAttack(); break;
      case 'roul': if (P > 2.0) { this.startHazard(this.hzType); this.go('haz'); } break;
      case 'haz': if (!this.hz && !this.fb.length && !this.spawnQ.length) this.toss(); break;
    }
  }
  hurt(p) { const [x, y] = proj(p.x, p.y, 50); this.add(p.s, -1, x, y); p.inv = 1.3; p.st = 0.25; }
  throwDie(p) {
    const d = this.dc[p.hold]; p.hold = -1; if (!d) return;
    let fx = p.fx, fy = p.fy; if (!fx && !fy) fy = -1;
    d.st = 2; d.h = -1; d.vx = fx * 430 + rnd(-30, 30); d.vy = fy * 430 + rnd(-30, 30); d.x = p.x + fx * 20; d.y = p.y + fy * 20;
  }
  tally() {
    this.cnt = Array(this.n).fill(0); this.em = 0;
    this.dc.forEach((d) => { if (d.f >= this.n) this.em++; else this.cnt[d.f]++; });
    const vals = [...new Set(this.cnt.filter((c) => c > 0))].sort((a, b) => b - a);
    this.groups = vals.map((c) => this.cnt.map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0));
    this.ai = 0;
    this.go('tally');
  }
  queueFire(e) {
    for (let k = 0; k < e * 3; k++) this.spawnQ.push({ t: k * (this.angry ? 0.45 : 0.55), tri: this.angry });
  }
  spit(q) {
    if (q.fx != null) { this.fb.push({ id: ++this.id, x: q.fx, y: YA - 70, vx: 0, vy: 290, r: 24 }); return; }
    const tg = pick(this.ps);
    const sx = rnd(-60, 60), sy = YA - 70;
    const sp = this.angry ? 330 : 250, r = this.angry ? 26 : 19;
    const base = Math.atan2(tg.y + rnd(-30, 30) - sy, tg.x + rnd(-40, 40) - sx);
    const angs = q.tri ? [-0.22, 0, 0.22] : [0];
    for (const a of angs) this.fb.push({ id: ++this.id, x: sx, y: sy, vx: Math.cos(base + a) * sp, vy: Math.sin(base + a) * sp, r });
  }
  afterAttack() {
    if (this.angry && !this.done) { this.hzType = ri(0, 5); this.go('roul'); }
    else this.toss();
  }
  startHazard(t) {
    const h = { t, T: 0, it: [] };
    if (t === 1) for (let k = 0; k < 14; k++) h.it.push({ x: rnd(XA + 30, XB - 30), y: rnd(YA + 20, YB - 20), t0: k * 0.36 });
    if (t === 3) for (let k = 0; k < 10; k++) h.it.push({ t0: k * 0.42, x: 0, y: 0, set: 0 });
    if (t === 4) { h.x = XA + 40; h.y = 0; h.vx = 360; h.vy = 250; }
    if (t === 5) for (let k = 0; k < 5; k++) { const c = k % 2 ? 4 : 3; for (let j = 0; j < c; j++) this.spawnFixed(k * 0.95, XA + ((j + 0.5) * (XB - XA)) / c); }
    this.hz = h;
  }
  spawnFixed(t, x) { this.spawnQ.push({ t, fx: x }); }
  updHazard(dt) {
    const h = this.hz; h.T += dt; const T = h.T;
    let dur = 6.5;
    if (h.t === 0) { // 行ったり来たりする節の行列
      dur = 7.9;
      for (let k = 0; k < 9; k++) {
        const tt = T - k * 0.1; if (tt < 0) continue;
        const pass = Math.floor(tt / 2.6), u = (tt % 2.6) / 2.6; if (pass > 2) continue;
        const dir = pass % 2 ? -1 : 1;
        const x = dir * (-460 + 920 * u), y = -110 + pass * 120 + Math.sin(u * 8) * 30;
        this.dz.push([x, y, 26, 0, 1, k]);
      }
    } else if (h.t === 1) {
      dur = 14 * 0.36 + 1.5;
      for (const b of h.it) { const k = T - b.t0; if (k < 0 || k > 1.35) continue; this.dz.push([b.x, b.y, 48, 1, k > 1.0 ? 1 : 0, k]); }
    } else if (h.t === 2) {
      dur = 6.5;
      for (let gq = 0; gq < 2; gq++) for (let k = 0; k < 6; k++) {
        const dir = gq ? -1 : 1, a = (k * Math.PI * 2) / 6 + dir * T * 1.3 + gq * 0.5, rad = 20 + T * 70;
        this.dz.push([Math.cos(a) * rad, Math.sin(a) * rad * 0.62, 22, 2, 1, 0]);
      }
    } else if (h.t === 3) {
      dur = 10 * 0.42 + 1.6;
      for (const u of h.it) {
        const k = T - u.t0; if (k < 0) continue;
        if (!u.set) { u.set = 1; const p = pick(this.ps); u.x = clamp(p.x + rnd(-20, 20), XA, XB); u.y = clamp(p.y + rnd(-15, 15), YA, YB); }
        if (k > 1.45) continue;
        this.dz.push([u.x, u.y, 32, 3, k > 1.0 ? 1 : 0, k]);
      }
    } else if (h.t === 4) {
      dur = 5.2;
      h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.x < XA || h.x > XB) { h.vx *= -1; h.x = clamp(h.x, XA, XB); }
      if (h.y < YA || h.y > YB) { h.vy *= -1; h.y = clamp(h.y, YA, YB); }
      this.dz.push([h.x, h.y, 46, 4, T > 0.6 ? 1 : 0, T]);
    } else if (h.t === 5) { dur = 0.1; }
    if (T > dur) this.hz = null;
  }
  cpuInput(i) {
    const p = this.ps[i], inp = emptyIn(), lv = this.lv(i), k = LV(lv);
    let tx = p.x, ty = p.y;
    if (this.ph === 'play') {
      if (p.hold >= 0) {
        if (p.cdir == null) { p.cdir = Math.random() * Math.PI * 2; p.ct = 0; }
        p.ct += 1 / 60;
        tx = p.x + Math.cos(p.cdir) * 120; ty = p.y + Math.sin(p.cdir) * 120;
        if (Math.abs(tx) > XB - 20 || ty < YA + 20 || ty > YB - 20) p.cdir += 0.2;
        if (p.ct > 0.3 - k * 0.15) { inp.A = 1; p.cdir = null; }
      }
      else {
        let best = null, bs = -1e9;
        this.dc.forEach((d) => {
          if (d.st !== 0) return;
          const d0 = dist(p.x, p.y, d.x, d.y);
          let v = -d0;
          if (d.f === i) v -= 600 * k + 50;
          if (d.f === this.n) v += 120 * k;
          this.ps.forEach((q) => { if (q !== p && dist(q.x, q.y, d.x, d.y) < d0 - 20) v -= 80; });
          if (v > bs) { bs = v; best = d; }
        });
        if (best && best.f !== i) { tx = best.x; ty = best.y; if (dist(p.x, p.y, best.x, best.y) < 32) inp.A = 1; }
        else { tx = 0; ty = 40; }
      }
    } else { tx = 0; ty = 60; }
    // 回避
    let danger = null, dd = 1e9;
    const consider = (x, y, r) => { const d = dist(p.x, p.y, x, y) - r; if (d < dd) { dd = d; danger = [x, y]; } };
    this.fb.forEach((f) => consider(f.x + f.vx * 0.25, f.y + f.vy * 0.25, f.r));
    this.dz.forEach((z) => consider(z[0], z[1], z[2]));
    if (danger && dd < 70 + 50 * k && Math.random() < 0.35 + k * 0.6) { const a = Math.atan2(p.y - danger[1], p.x - danger[0]); tx = p.x + Math.cos(a) * 200; ty = p.y + Math.sin(a) * 200; if (Math.abs(p.x) > XB - 40) tx = 0; if (p.y > YB - 30 || p.y < YA + 30) ty = 0; }
    steer(inp, tx - p.x, ty - p.y, 8);
    return inp;
  }
  state() {
    const hz = this.hz;
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100, tl: Math.round(this.tilt || 0),
      ps: this.ps.map((p) => [r0(p.x), r0(p.y), p.inv > 0 ? 1 : 0, p.hold >= 0 ? 1 : 0, p.st > 0 ? 1 : 0]),
      dc: this.dc.map((d) => [d.id, r0(d.x), r0(d.y), r0(d.z), d.f, d.st]),
      fb: this.fb.map((f) => [f.id, r0(f.x), r0(f.y), f.r]),
      dz: this.dz.map((z) => [r0(z[0]), r0(z[1]), z[2], z[3], z[4], Math.round(z[5] * 100) / 100]),
      cn: (this.cnt || []).slice(), em: this.em || 0, gr: (this.groups || []).map((gq) => gq.join('')), ai: this.ai || 0,
      hz: this.ph === 'roul' || this.ph === 'haz' ? this.hzType : -1,
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#07001a', '#2a0a3a');
    for (let i = 0; i < 70; i++) circle(g, (i * 139) % 960, (i * 83) % 540, (i % 3) * 0.6 + 0.5, 'rgba(255,255,255,.6)');
    // ブラックホール
    g.save(); g.translate(480, 90); for (let k = 0; k < 6; k++) { g.rotate(v.t * 0.3); ellipse(g, 0, 0, 200 - k * 25, 60 - k * 8, null, `rgba(180,80,255,${0.15 + k * 0.05})`, 6); } circle(g, 0, 0, 30, '#000'); g.restore();
    const n = L(s.sc).length, ph = s.ph, P = s.pt + (v.since || 0);
    const tilt = s.tl || 0;
    // 足場
    g.save(); g.translate(480, 300); g.rotate(tilt / 2000); g.translate(-480, -300);
    const [ax, ay] = proj(XA - 40, YA - 30), [bx2, by2] = proj(XB + 40, YB + 40);
    g.fillStyle = '#3a3346'; g.beginPath(); g.moveTo(ax + 20, ay); g.lineTo(bx2 - 20, ay); g.lineTo(bx2 + 20, by2); g.lineTo(ax - 20, by2); g.closePath(); g.fill();
    g.fillStyle = '#26202f'; g.fillRect(ax - 20, by2, bx2 - ax + 40, 26);
    for (let k = 0; k < 8; k++) { g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax + (k * (bx2 - ax)) / 7, ay); g.lineTo(ax - 20 + (k * (bx2 - ax + 40)) / 7, by2); g.stroke(); }
    g.restore();
    // ボス
    const dead = s.done ? v.t - s.dT : -1;
    const big = s.ang ? 1.2 : 1;
    if (dead < 1.2) {
      const bxx = 480, byy = 140 + Math.sin(v.t * 1.5) * 5 - (dead > 0 ? dead * 120 : 0);
      g.save(); g.translate(bxx, byy); g.scale(big * (dead > 0 ? 1 - dead * 0.7 : 1), big * (dead > 0 ? 1 - dead * 0.7 : 1));
      for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * 26 - 12, -60); g.lineTo(k * 26, -98 + Math.abs(k) * 6); g.lineTo(k * 26 + 12, -60); g.fillStyle = '#f2f2e0'; g.fill(); g.strokeStyle = '#333'; g.lineWidth = 2; g.stroke(); }
      ellipse(g, 0, 0, 120, 72, s.ang ? '#3d6a1a' : '#4f8a24', '#1a2a0a', 5);
      ellipse(g, 0, 22, 80, 40, '#f0d890');
      circle(g, -38, -18, 12, '#fff', '#222', 2); circle(g, 38, -18, 12, '#fff', '#222', 2);
      circle(g, -38, -18, 5, s.ang ? '#e00' : '#222'); circle(g, 38, -18, 5, s.ang ? '#e00' : '#222');
      g.restore();
      bossLabel(g, bxx + 190, byy - 20, 'トッレ', s.ang);
    }
    if (dead > 0) boom(g, 480, 90, dead * 0.8, 200);
    // 危険地帯（予告）
    L(s.dz).forEach((z) => {
      const [x, y] = proj(z[0], z[1]);
      if (!z[4]) { ellipse(g, x, y, z[2], z[2] * 0.55, 'rgba(255,40,40,.25)', '#ff3a3a', 2); return; }
    });
    // 描画リスト
    const items = [];
    L(s.dc).forEach((d) => items.push({ y: d[2], f: () => {
      const x0 = sm('bw_dx' + d[0], d[1]), y0 = sm('bw_dy' + d[0], d[2]);
      const [x, y] = proj(x0, y0, d[3]);
      shadow(g, x, proj(x0, y0)[1], 18, 0.35);
      const S = 36;
      rr(g, x - S / 2, y - S - 4, S, S, 7);
      const f = d[4];
      if (f >= n) { g.fillStyle = '#c62828'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#300'; g.stroke(); txt(g, '✖', x, y - S / 2 - 4, { size: 22, col: '#ffe14d', stroke: '#300' }); }
      else { g.fillStyle = PCOL[f]; g.fill(); g.lineWidth = 3; g.strokeStyle = '#111'; g.stroke(); txt(g, CHARS[v.slots[f].ci].m, x, y - S / 2 - 5, { size: 20 }); txt(g, `${f + 1}`, x + 12, y - 10, { size: 10, lw: 2 }); }
    } }));
    L(s.ps).forEach((p, i) => items.push({ y: p[1], f: () => {
      const x0 = sm('bw_px' + i, p[0]), y0 = sm('bw_py' + i, p[1]);
      const [x, y] = proj(x0, y0);
      shadow(g, x, y, 18);
      drawChar(g, x, y - 18, i, v.slots[i].ci, { blink: p[2], stun: p[4] });
    } }));
    L(s.dz).forEach((z) => { if (!z[4]) return; items.push({ y: z[1], f: () => {
      const [x, y] = proj(z[0], z[1]);
      const k = z[3];
      if (k === 0) { circle(g, x, y - 24, 26, z[5] === 0 ? '#ff4a4a' : '#d83a5a', '#2a1640', 3); if (z[5] === 0) circle(g, x, y - 30, 16, '#ffe14d'); }
      else if (k === 1) boom(g, x, y - 20, (z[5] - 1.0) / 0.35, 60);
      else if (k === 2) { g.save(); g.globalAlpha = 0.85; circle(g, x, y - 26, 20, '#fff', '#666', 2); g.restore(); }
      else if (k === 3) spiky(g, x, y - 16, 22, '#3a2a5a', '#e9e3ff', 9);
      else if (k === 4) { circle(g, x, y - 40, 46, '#151515', '#000', 3); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(x - 14, y - 58, 12, 0, 7); g.fill(); }
    } }); });
    // 空中の危険物（落下中のノレ兵・ノニラ）
    L(s.dz).forEach((z) => {
      if (z[4]) return;
      const [x, y] = proj(z[0], z[1]);
      const k = z[5];
      if (z[3] === 1) circle(g, x, y - (1 - k) * 400 - 20, 16, '#202028', '#000', 2);
      if (z[3] === 3) spiky(g, x, y - (1 - k) * 380 - 16, 18, '#3a2a5a', '#e9e3ff', 9);
    });
    items.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    // 持っているブロックは頭上
    L(s.fb).forEach((f) => { const [x, y] = proj(f[1], f[2]); circle(g, x, y - 20, f[3] + 6, 'rgba(255,120,0,.4)'); circle(g, x, y - 20, f[3], '#ff7a1a', '#ffdf5a', 3); });
    // フェーズ表示
    if (ph === 'play') { const left = Math.max(0, 10 - P); rr(g, 430, 196, 100, 34, 12); g.fillStyle = 'rgba(0,0,0,.6)'; g.fill(); txt(g, left.toFixed(1), 480, 214, { size: 24, col: left < 3 ? '#ff6a6a' : '#fff' }); }
    if (ph === 'tally') {
      const cn = L(s.cn);
      rr(g, 300, 190, 360, 50, 14); g.fillStyle = 'rgba(0,0,0,.65)'; g.fill();
      cn.forEach((c, i) => { const x = 480 - (n - 1) * 45 + i * 90; circle(g, x - 18, 215, 12, PCOL[i]); txt(g, `×${c}`, x + 10, 215, { size: 20 }); });
      if (s.em) txt(g, `✖×${s.em}`, 480, 256, { size: 22, col: '#ff6a6a' });
    }
    if (ph === 'groan') txt(g, 'トッレ「ぐぬぬ…！」 もう一度！', 480, 230, { size: 26, col: '#ffe14d' });
    if (ph === 'roul') {
      const idx = P < 1.6 ? Math.floor(P * 14) % 6 : s.hz;
      rr(g, 330, 190, 300, 70, 16); g.fillStyle = 'rgba(40,0,0,.85)'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#ffd54a'; g.stroke();
      txt(g, 'ボスルーレット！', 480, 208, { size: 16, col: '#ffd54a' });
      txt(g, HZ[idx >= 0 ? idx : 0], 480, 236, { size: 28 });
    }
  }
}
