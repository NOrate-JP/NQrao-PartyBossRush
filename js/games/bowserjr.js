// 11. トッレJr.（クッパJr.）: サイコロでゲージをためる
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, PCOL, pick, shuffle, ease } from '../engine.js';

const GX = 190, GY = 80, GW = 38;

export function drawDie(g, x, y, n, s = 44, col = '#fff') {
  rr(g, x - s / 2, y - s / 2, s, s, s * 0.18); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = '#333'; g.stroke();
  const d = s * 0.25, P = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n] || [];
  P.forEach(([a, b]) => circle(g, x + a * d, y + b * d, s * 0.09, n === 1 ? '#e33' : '#222'));
}

export default class BowserJr extends BossBase {
  static meta = {
    id: 'bowserjr', boss: 'トッレJr.', title: 'トッレJr.ブレイクダウン', jp: 'トッレJr.のゲージバトル', stage: 'トッレステーション 中ボス', bg: '#1a1a4a',
    rules: ['順番にサイコロ（1〜6）をたたいて、出た目だけゲージをすすめる', 'ゲージが3の倍数でとまると、その数だけ攻撃！（点数も同じだけ）', 'ゲージは15でストップ。15ちょうどで最大攻撃', 'Jr.マークでとまると、ハンマーで1〜2回たたかれ1回 -1点', 'いかり時はJr.マークが2つふえ、そこではハンマーが2個のサイコロに！', 'とどめをさすと +3点ボーナス'],
    controls: [['Z / スペース / クリック', 'サイコロをたたく']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(15 * this.n + 15);
    this.ph = 'intro'; this.pt = 0;
    this.g = 0; this.jr = [14]; this.turn = ri(0, this.n - 1); this.roll = 1; this.dice = []; this.stepTo = 0; this.cpuT = 1;
  }
  go(p) { this.ph = p; this.pt = 0; }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt;
    if (this.angry && this.jr.length === 1 && !this.done) {
      const cand = shuffle([7, 8, 10, 11, 13]);
      this.jr.push(cand[0], cand[1]); this.addJr = this.T;
    }
    switch (this.ph) {
      case 'intro': if (P > 2.0) this.startTurn(); break;
      case 'roll': {
        this.face = Math.floor(this.T * 18) % 6 + 1;
        const inp = ins[this.turn];
        if (inp.A || inp.P || P > 10) { this.roll = ri(1, 6); this.go('rolled'); }
        break;
      }
      case 'rolled': if (P > 0.7) { this.stepTo = Math.min(15, this.g + this.roll); this.from = this.g; this.go('move'); } break;
      case 'move': {
        const k = Math.floor(P / 0.14);
        this.g = Math.min(this.stepTo, this.from + k);
        if (this.g >= this.stepTo && P > (this.stepTo - this.from) * 0.14 + 0.3) this.evaluate();
        break;
      }
      case 'attack':
        if (P > 0.9 && !this.dealt) {
          this.dealt = 1;
          const d = this.atk;
          const x = this.px(this.turn);
          if (this.hit(d, [this.turn], 480, 230)) this.add(this.turn, d, x, 390);
        }
        if (P > 1.8) { this.g = 0; this.next(); }
        break;
      case 'hammer':
        if (P > 1.0 && this.hits < this.nh) {
          const k = Math.floor((P - 1.0) / 0.45);
          while (this.hits <= k && this.hits < this.nh) { this.add(this.turn, -1, this.px(this.turn), 390); this.hits++; }
        }
        if (P > 1.2 + this.nh * 0.45 + 0.5) this.next();
        break;
      case 'none': if (P > 0.8) this.next(); break;
    }
  }
  px(i) { return 480 - (this.n - 1) * 130 + i * 260; }
  startTurn() { this.go('roll'); this.cpuT = rnd(0.8, 2.6); this.dealt = 0; }
  next() { if (this.done) { this.go('end'); return; } this.turn = (this.turn + 1) % this.n; this.startTurn(); }
  evaluate() {
    if (this.g % 3 === 0) { this.atk = this.g; this.go('attack'); return; }
    if (this.jr.includes(this.g)) {
      const two = this.g !== 14;
      this.dice = two ? [ri(1, 2), ri(1, 2)] : [ri(1, 2)];
      this.nh = this.dice.reduce((a, b) => a + b, 0); this.hits = 0;
      this.go('hammer'); return;
    }
    this.go('none');
  }
  cpuInput(i) {
    const inp = emptyIn();
    if (this.ph === 'roll' && this.turn === i && this.pt > this.cpuT) inp.A = 1;
    return inp;
  }
  state() {
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100,
      g: this.g, jr: this.jr.slice(), tu: this.turn, ro: this.roll, fc: this.face || 1, dc: this.dice.slice(), at: this.atk || 0, nh: this.nh || 0, ht: this.hits || 0,
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#05051a', '#22225a');
    for (let i = 0; i < 60; i++) circle(g, (i * 157) % 960, (i * 89) % 540, (i % 3) * 0.7 + 0.6, 'rgba(255,255,255,.7)');
    ellipse(g, 820, 120, 70, 70, '#d8a860'); g.save(); g.translate(820, 120); g.rotate(-0.3); ellipse(g, 0, 0, 120, 22, null, '#e8d0a0', 6); g.restore();
    const n = L(s.sc).length, ph = s.ph, P = s.pt + (v.since || 0), jr = L(s.jr);
    // ゲージ
    rr(g, GX - 14, GY - 26, GW * 15 + 28, 52, 14); g.fillStyle = 'rgba(0,0,0,.65)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#ffd54a'; g.stroke();
    for (let k = 1; k <= 15; k++) {
      const x = GX + (k - 1) * GW;
      const on = k <= s.g;
      const m3 = k % 3 === 0, isJ = jr.includes(k);
      rr(g, x + 2, GY - 18, GW - 4, 36, 6);
      g.fillStyle = on ? (isJ ? '#e33' : m3 ? '#ffb300' : '#4fc3ff') : isJ ? '#5a1a1a' : m3 ? '#5a4a10' : '#1a2a3a'; g.fill();
      txt(g, isJ ? 'Jr' : String(k), x + GW / 2, GY, { size: isJ ? 15 : 16, col: on ? '#fff' : isJ ? '#ff8a8a' : m3 ? '#ffd54a' : '#9ab' });
    }
    // メカ
    const dead = s.done ? v.t - s.dT : -1;
    const shake = ph === 'attack' && P > 0.8 && P < 1.3 ? Math.sin(P * 80) * 8 : 0;
    if (dead < 1) {
      const mx = 480 + shake, my = 238 + Math.sin(v.t * 2) * 6 - (dead > 0 ? dead * 200 : 0);
      rr(g, mx - 150, my - 80, 300, 150, 60); g.fillStyle = '#c9d0d8'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#3a3f48'; g.stroke();
      rr(g, mx - 150, my + 10, 300, 50, 30); g.fillStyle = '#9aa2ac'; g.fill();
      const ec = s.ang ? '#ff2a2a' : '#ffe14d';
      circle(g, mx - 50, my - 20, 22, ec, '#222', 4); circle(g, mx + 50, my - 20, 22, ec, '#222', 4);
      for (const sd of [-1, 1]) {
        const ax = mx + sd * 185, ay = my + 30 + (ph === 'hammer' ? Math.sin(P * 14) * 20 : 0);
        g.strokeStyle = '#555'; g.lineWidth = 12; g.beginPath(); g.moveTo(mx + sd * 140, my + 20); g.lineTo(ax, ay); g.stroke();
        for (let c = -1; c <= 1; c++) { g.lineWidth = 7; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + sd * 18, ay + c * 16 + 18); g.stroke(); }
      }
      circle(g, mx, my - 105, 24, '#ffb36a', '#222', 3);
      bossLabel(g, mx, my + 92, 'トッレJr.', s.ang);
    }
    if (dead > 0) boom(g, 480, 238 - dead * 200, dead * 0.8, 200);
    // プレイヤー
    for (let i = 0; i < n; i++) {
      const x = 480 - (n - 1) * 130 + i * 260, y = 420;
      const my = s.tu === i;
      const jumpY = my && ph === 'rolled' && P < 0.35 ? -Math.sin((P / 0.35) * Math.PI) * 30 : 0;
      drawChar(g, x, y - 20 + jumpY, i, v.slots[i].ci, { r: 22 });
      if (my) {
        txt(g, '▼', x, y - 100, { size: 22, col: PCOL[i] });
        if (ph === 'roll') { drawDie(g, x, y - 70, s.fc, 46, '#fff7d0'); if (i === v.me) txt(g, 'Zでたたけ！', x, y - 120, { size: 18, col: '#ffe14d' }); txt(g, String(Math.max(0, Math.ceil(10 - P))), x + 40, y - 92, { size: 14 }); }
        if (ph === 'rolled' || ph === 'move') drawDie(g, x, y - 70 - (ph === 'rolled' ? Math.min(1, P / 0.3) * 20 : 20), s.ro, 46);
        if (ph === 'attack') {
          const t = (P - 0.2) / 0.7;
          if (t > 0 && t < 1) circle(g, x + (480 - x) * t, y - 40 + (238 - y + 40) * t, 14 + s.at, '#ffe14d', '#ff7b00', 4);
          txt(g, `${s.at}ダメージ！`, x, y - 120, { size: 22, col: '#ffe14d' });
        }
        if (ph === 'hammer') {
          L(s.dc).forEach((d, j) => drawDie(g, 480 + (j - (L(s.dc).length - 1) / 2) * 60, 345, P < 0.8 ? ri(1, 2) : d, 44, '#ffb0b0'));
          if (P > 1.0) { const k = Math.floor((P - 1.0) / 0.45); if (k < s.nh) { const f = ((P - 1.0) % 0.45) / 0.45; g.save(); g.translate(x, y - 90); g.rotate(-1 + f * 1.4); rr(g, -6, -50, 12, 50, 4); g.fillStyle = '#6a4a2a'; g.fill(); rr(g, -24, -70, 48, 26, 6); g.fillStyle = '#888'; g.fill(); g.restore(); } }
        }
      }
    }
    if (ph === 'none') txt(g, 'セーフ…', 480, 345, { size: 26 });
    if (ph === 'intro') txt(g, 'じゅんばんをきめるよ！', 480, 345, { size: 26, col: '#ffe14d' });
  }
}
