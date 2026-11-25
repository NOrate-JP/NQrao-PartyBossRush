// 8. レットー（ゲッソー）: 大砲でうつ
import { BossBase, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, sm, LV, dist, clamp, spiky, PCOL, pick } from '../engine.js';


export default class Blooper extends BossBase {
  static meta = {
    id: 'blooper', boss: 'レットー', title: 'レットー・バラージ', jp: 'レットーをうちおとせ！', stage: 'レットービーチ ボス', bg: '#2a7fc0',
    rules: ['ねらいを合わせて大砲をうとう。当たるたびに +1点', 'レットーは海にもぐったり出てきたりする', 'レットーが投げるノニラに当たると -1点', 'ノニラはうち落とせる！ 落とすと別の人のほうへ飛んでいく', 'いかり時はスミをはいて画面が見えにくくなる', 'とどめをさすと +3点ボーナス'],
    controls: [['マウス / タップ', 'ねらう＆うつ'], ['←↑↓→', 'ねらいを動かす'], ['Z / スペース', 'うつ']],
  };
  static canX(i, n) { return 480 - ((n - 1) * 230) / 2 + i * 230; }
  constructor(cfg) {
    super(cfg);
    this.setHP(18 * this.n + 10);
    this.rt = this.slots.map((_, i) => ({ x: Blooper.canX(i, this.n), y: 220, cd: 0, lpx: -1, lpy: -1, cpuJ: 0 }));
    this.bo = { x: 480, y: 220, vis: 0, t: 0, vx: 120, vy: 30, up: 0 };
    this.bo.t = 1.2; // 最初に出てくるまで
    this.ur = []; this.shot = []; this.ink = []; this.id = 0; this.urT = 1.5; this.inkT = 3;
  }
  update(dt, ins) {
    this.tick(dt);
    const ang = this.angry, b = this.bo;
    // 出現・潜水
    b.t -= dt;
    if (b.t <= 0 && !this.done) {
      if (b.vis) { b.vis = 0; b.t = ang ? 1.0 : 1.5; }
      else { b.vis = 1; b.t = ang ? rnd(3.5, 4.5) : rnd(4.5, 5.5); b.x = rnd(200, 760); b.y = rnd(170, 250); const sp = ang ? 220 : 120; b.vx = pick([-1, 1]) * sp; b.vy = rnd(-1, 1) * sp * 0.4; b.up = this.T; }
    }
    if (b.vis) {
      b.x += b.vx * dt; b.y += b.vy * dt + Math.sin(this.T * 4) * 20 * dt;
      if (b.x < 150 || b.x > 810) b.vx *= -1;
      if (b.y < 140 || b.y > 270) b.vy *= -1;
      b.x = clamp(b.x, 150, 810); b.y = clamp(b.y, 140, 270);
      this.urT -= dt;
      if (this.urT <= 0 && !this.done) {
        this.urT = ang ? rnd(1.0, 1.6) : rnd(1.8, 2.6);
        const cnt = ang ? 2 : 1;
        for (let k = 0; k < cnt; k++) this.ur.push({ id: ++this.id, x0: b.x, y0: b.y, tg: ri(0, this.n - 1), t: 0, dur: ang ? 1.9 : 2.3, rt: 0 });
      }
    }
    // スミ
    if (ang && !this.done) { this.inkT -= dt; if (this.inkT <= 0) { this.inkT = rnd(4, 6); this.ink.push({ id: ++this.id, x: rnd(200, 760), y: rnd(150, 380), r: rnd(110, 150), b: this.T }); } }
    this.ink = this.ink.filter((k) => this.T - k.b < 3.2);
    // ねらい
    this.rt.forEach((r, i) => {
      const inp = this.done ? emptyIn() : ins[i];
      if (r.cd > 0) r.cd -= dt;
      if (inp.px >= 0 && (inp.px !== r.lpx || inp.py !== r.lpy)) { r.x = inp.px; r.y = inp.py; r.lpx = inp.px; r.lpy = inp.py; }
      const mx = (inp.r ? 1 : 0) - (inp.l ? 1 : 0), my = (inp.d ? 1 : 0) - (inp.u ? 1 : 0);
      r.x = clamp(r.x + mx * 430 * dt, 20, 940); r.y = clamp(r.y + my * 430 * dt, 60, 420);
      if ((inp.A || inp.P) && r.cd <= 0) {
        if (inp.P && inp.px >= 0) { r.x = inp.px; r.y = inp.py; }
        r.cd = 0.45;
        this.shot.push({ id: ++this.id, s: i, x: r.x, y: r.y, t: 0 });
      }
    });
    // 弾
    for (const sh of this.shot) {
      sh.t += dt / 0.22;
      if (sh.t >= 1 && !sh.dn) {
        sh.dn = 1;
        let used = 0;
        for (const u of this.ur) {
          if (u.dn) continue;
          const [ux, uy, us] = this.urPos(u);
          if (dist(sh.x, sh.y, ux, uy) < 22 + us * 18) {
            used = 1;
            if (u.t / u.dur > 0.72 || this.n < 2) { u.dn = 1; this.pop(ux, uy, 'ドカン', '#fff'); }
            else {
              const others = [...Array(this.n).keys()].filter((k) => k !== sh.s && k !== u.tg);
              const nt = others.length ? pick(others) : u.tg === sh.s ? (sh.s + 1) % this.n : u.tg;
              u.x0 = ux; u.y0 = uy; u.tg = nt; u.t = u.dur * 0.35; u.rt++;
              this.pop(ux, uy - 20, 'はねかえし！', '#9ff');
            }
            break;
          }
        }
        if (!used && b.vis && Math.abs(sh.x - b.x) < 50 && Math.abs(sh.y - b.y) < 70) {
          if (this.hit(1, [sh.s], b.x, b.y)) this.add(sh.s, 1, b.x + rnd(-30, 30), b.y - 70);
          this.flash = this.T;
        }
      }
    }
    this.shot = this.shot.filter((s) => !s.dn);
    // ノニラ
    for (const u of this.ur) {
      if (u.dn) continue;
      u.t += dt;
      if (u.t >= u.dur) {
        u.dn = 1;
        if (!this.done) this.add(u.tg, -1, Blooper.canX(u.tg, this.n), 450);
      }
    }
    this.ur = this.ur.filter((u) => !u.dn);
  }
  urPos(u) {
    const k = u.t / u.dur, tx = Blooper.canX(u.tg, this.n), ty = 470;
    const x = u.x0 + (tx - u.x0) * k, y = u.y0 + (ty - u.y0) * k - Math.sin(k * Math.PI) * 90;
    return [x, y, 0.35 + k * 1.1];
  }
  cpuInput(i) {
    const inp = emptyIn(), r = this.rt[i], lv = this.lv(i), k = LV(lv);
    let tx = null, ty = null;
    const mine = this.ur.filter((u) => u.tg === i && u.t / u.dur > 0.25 && u.t / u.dur < 0.85);
    if (mine.length && Math.random() < 0.5 + k * 0.5) { const [x, y] = this.urPos(mine[0]); tx = x; ty = y; }
    else if (this.bo.vis) { tx = this.bo.x + this.bo.vx * 0.25 * k; ty = this.bo.y; }
    if (tx == null) { tx = 480; ty = 240; }
    r.cpuJ += (Math.random() - 0.5) * 6;
    r.cpuJ *= 0.96;
    const ex = tx + r.cpuJ * (1.2 - k), ey = ty + r.cpuJ * 0.5 * (1.2 - k);
    const dx = ex - r.x, dy = ey - r.y;
    const sp = [0.45, 0.75, 1][lv];
    if (Math.abs(dx) > 10 && Math.random() < sp) { if (dx < 0) inp.l = 1; else inp.r = 1; }
    if (Math.abs(dy) > 10 && Math.random() < sp) { if (dy < 0) inp.u = 1; else inp.d = 1; }
    if (Math.hypot(dx, dy) < 40 && r.cd <= 0 && Math.random() < 0.12 + k * 0.2) inp.A = 1;
    return inp;
  }
  state() {
    const b = this.bo;
    return {
      ...this.head(),
      bo: [r0(b.x), r0(b.y), b.vis, Math.round((this.T - b.up) * 10) / 10, Math.round(b.t * 10) / 10],
      rt: this.rt.map((r) => [r0(r.x), r0(r.y), r.cd > 0.3 ? 1 : 0]),
      ur: this.ur.map((u) => { const [x, y, s2] = this.urPos(u); return [u.id, r0(x), r0(y), Math.round(s2 * 100) / 100, u.tg]; }),
      sh: this.shot.map((s2) => [s2.id, r0(s2.x), r0(s2.y), Math.round(s2.t * 100) / 100, s2.s]),
      ink: this.ink.map((k) => [k.id, r0(k.x), r0(k.y), r0(k.r), Math.round((this.T - k.b) * 10) / 10]),
      fl: this.flash ? Math.round(this.flash * 10) / 10 : -9,
    };
  }
  static render(g, s, v) {
    grad(g, 0, 300, '#7cc8ff', '#d9f1ff');
    for (let i = 0; i < 3; i++) { ellipse(g, 120 + i * 360, 255, 90, 26, '#6a9a4a'); }
    grad(g, 260, 540, '#1f6fb5', '#0b3768');
    for (let i = 0; i < 12; i++) { const y = 285 + i * 22; g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 960; x += 30) g.lineTo(x, y + Math.sin(x / 50 + v.t * 2 + i) * 3); g.stroke(); }
    // うず
    g.save(); g.globalAlpha = 0.35; for (let k = 0; k < 5; k++) ellipse(g, 480, 320, 220 - k * 40, 40 - k * 7, null, '#fff', 3); g.restore();
    const bo = L(s.bo), n = L(s.sc).length, dead = s.done ? v.t - s.dT : -1;
    // レットー
    if (bo.length && (bo[2] || dead > 0)) {
      const bx = sm('bl_x', bo[0]), byy = sm('bl_y', bo[1]);
      const rise = Math.min(1, bo[3] / 0.4), sink = bo[2] && bo[4] < 0.35 ? 1 - bo[4] / 0.35 : 0;
      const by = byy + (1 - rise) * 120 + sink * 120 + (dead > 0 ? dead * 60 : 0);
      if (dead < 0.9) {
        g.save(); g.beginPath(); g.rect(0, 0, 960, 330); g.clip();
        for (let k = -2; k <= 2; k++) { g.strokeStyle = '#f0f0f0'; g.lineWidth = 10; g.beginPath(); g.moveTo(bx + k * 14, by + 30); g.quadraticCurveTo(bx + k * 24 + Math.sin(v.t * 6 + k) * 12, by + 70, bx + k * 18, by + 100); g.stroke(); }
        g.beginPath(); g.moveTo(bx, by - 80); g.lineTo(bx + 46, by - 20); g.lineTo(bx + 40, by + 34); g.lineTo(bx - 40, by + 34); g.lineTo(bx - 46, by - 20); g.closePath();
        g.fillStyle = s.ang ? '#ffd0d0' : '#ffffff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#555'; g.stroke();
        rr(g, bx - 30, by - 6, 60, 22, 10); g.fillStyle = '#333'; g.fill();
        if (s.T - s.fl < 0.12) { g.globalAlpha = 0.6; circle(g, bx, by - 10, 60, '#fff'); g.globalAlpha = 1; }
        g.restore();
        bossLabel(g, bx, by - 100, 'レットー', s.ang);
      }
      if (dead > 0) boom(g, bx, by - 20, dead, 120);
    }
    // ノニラ
    L(s.ur).forEach((u) => { spiky(g, u[1], u[2], 14 * u[3], '#3a2a5a', '#e9e3ff', 9); circle(g, u[1], u[2] - 18 * u[3], 5 * u[3], PCOL[u[4]]); });
    // 船と大砲
    g.fillStyle = '#7a4a22'; g.beginPath(); g.moveTo(0, 450); g.lineTo(960, 450); g.lineTo(960, 540); g.lineTo(0, 540); g.fill();
    g.fillStyle = '#5a3416'; g.fillRect(0, 440, 960, 14);
    for (let i = 0; i < n; i++) {
      const x = Blooper.canX(i, n);
      ellipse(g, x, 470, 46, 20, '#333');
      rr(g, x - 18, 420, 36, 52, 10); g.fillStyle = PCOL[i]; g.fill(); g.lineWidth = 3; g.strokeStyle = '#111'; g.stroke();
      txt(g, `${i + 1}P`, x, 448, { size: 15 });
    }
    // 弾
    L(s.sh).forEach((sh) => {
      const x0 = Blooper.canX(sh[4], n), y0 = 420, t = sh[3];
      circle(g, x0 + (sh[1] - x0) * t, y0 + (sh[2] - y0) * t, 9 - t * 4, '#222', '#ffd54a', 2);
    });
    // スミ
    L(s.ink).forEach((k) => { const a = k[4] < 0.2 ? k[4] / 0.2 : k[4] > 2.6 ? Math.max(0, (3.2 - k[4]) / 0.6) : 1; g.save(); g.globalAlpha = a * 0.93; for (let j = 0; j < 5; j++) circle(g, k[1] + Math.cos(j * 1.3) * k[3] * 0.4, k[2] + Math.sin(j * 1.9) * k[3] * 0.3, k[3] * (0.6 + (j % 2) * 0.2), '#101018'); g.restore(); });
    // ねらい
    L(s.rt).forEach((r, i) => {
      const x = i === v.me ? r[0] : sm('bl_rx' + i, r[0]), y = i === v.me ? r[1] : sm('bl_ry' + i, r[1]);
      const big = i === v.me ? 1.2 : 0.9;
      circle(g, x, y, 22 * big, null, PCOL[i], 4); circle(g, x, y, 22 * big, null, '#fff', 1);
      g.strokeStyle = PCOL[i]; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 30 * big, y); g.lineTo(x - 10, y); g.moveTo(x + 10, y); g.lineTo(x + 30 * big, y); g.moveTo(x, y - 30 * big); g.lineTo(x, y - 10); g.moveTo(x, y + 10); g.lineTo(x, y + 30 * big); g.stroke();
      txt(g, `${i + 1}P`, x + 26, y - 24, { size: 12 });
    });
  }
}
