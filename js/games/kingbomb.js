// 4. キングノレ兵（キングボム兵）: ノレ兵えらび
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, hitRect, ease, PCOL, shuffle } from '../engine.js';

const BX = [300, 420, 540, 660], BY = 360;
const SZ = [0, 16, 22, 30];

export default class KingBomb extends BossBase {
  static meta = {
    id: 'kingbomb', boss: 'キングノレ兵', title: 'ボンバード・キングノレ兵', jp: 'キングノレ兵にノレ兵をなげろ！', stage: 'ノレ兵ファクトリー ボス', bg: '#7a5230',
    rules: ['ベルトコンベアで運ばれてくるノレ兵を1つえらぼう（10秒）', '小 +1点 / 中 +2点 / 大 +3点。大きいほど大ダメージ', '他の人と同じノレ兵をえらぶと、だれも投げられない！', 'いかり時は、投げられなかった人にノレ兵が飛んできて -1点', '2人プレイ時はキングノレ兵もノレ兵を1つ横取りする', 'とどめをさすと +3点ボーナス'],
    controls: [['1〜4キー / クリック', 'ノレ兵をえらぶ'], ['← → ＋ Z', 'カーソルでえらぶ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(4 * this.n + 3);
    this.ph = 'intro'; this.pt = 0;
    this.bombs = [1, 2, 3, 1];
    this.cur = Array(this.n).fill(0); this.sel = Array(this.n).fill(-1);
    this.king = -1; this.thr = []; this.ti = 0; this.miss = [];
    this.cpuT = [];
  }
  go(p) { this.ph = p; this.pt = 0; }
  newRound() {
    let b; do { b = [ri(1, 3), ri(1, 3), ri(1, 3), ri(1, 3)]; } while (new Set(b).size < 2);
    this.bombs = b; this.sel.fill(-1); this.king = -1; this.thr = []; this.ti = 0; this.miss = []; this.coll = 0;
    this.cpuT = this.slots.map(() => rnd(1.2, 6));
    this.go('conv');
  }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt;
    switch (this.ph) {
      case 'intro': if (P > 0.8) this.newRound(); break;
      case 'conv': if (P > 1.4) this.go('choose'); break;
      case 'choose':
        ins.forEach((inp, i) => {
          if (this.sel[i] >= 0) return;
          if (inp.Lp) this.cur[i] = (this.cur[i] + 3) % 4;
          if (inp.Rp) this.cur[i] = (this.cur[i] + 1) % 4;
          if (inp.k >= 1 && inp.k <= 4) this.sel[i] = inp.k - 1;
          else if (inp.A) this.sel[i] = this.cur[i];
          if (inp.P) for (let k = 0; k < 4; k++) if (hitRect(inp.px, inp.py, BX[k] - 50, BY - 70, 100, 120)) this.sel[i] = k;
        });
        if (P > 10 || this.sel.every((x) => x >= 0)) this.resolve();
        break;
      case 'throw': {
        // 左から順に投げる
        const per = 0.75;
        const idx = Math.floor(P / per);
        while (this.ti < this.thr.length && this.ti <= idx - 1) {
          const t = this.thr[this.ti];
          if (t.k) { /* キングが後ろに投げる */ }
          else {
            const sz = this.bombs[t.b];
            if (this.hit(sz, [t.s], 480, 140)) this.add(t.s, sz, 480 + (t.s - 1.5) * 30, 150);
          }
          this.ti++;
        }
        if (P > this.thr.length * per + 0.6 || this.done) {
          if (this.angry && !this.done && this.miss.length) this.go('react'); else this.go('wait');
        }
        break;
      }
      case 'react':
        if (P > 0.7 && !this.reacted) {
          this.reacted = 1;
          this.miss.forEach(([s, d]) => this.add(s, -d, this.px(s), 440));
        }
        if (P > 1.6) this.go('wait');
        break;
      case 'wait': if (P > 0.7 && !this.done) { this.reacted = 0; this.newRound(); } break;
    }
  }
  px(i) { return 480 - (this.n - 1) * 75 + i * 150; }
  resolve() {
    this.sel = this.sel.map((v, i) => (v < 0 ? -2 : v));
    const cnt = [0, 0, 0, 0];
    this.sel.forEach((v) => { if (v >= 0) cnt[v]++; });
    if (this.n === 2) {
      this.king = ri(0, 3);
      cnt[this.king]++;
    }
    this.coll = this.n > 1 && this.sel.every((v) => v >= 0 && v === this.sel[0]) ? 1 : 0;
    this.thr = []; this.miss = [];
    for (let k = 0; k < 4; k++) {
      if (cnt[k] === 1) {
        const s = this.sel.indexOf(k);
        if (s >= 0) this.thr.push({ b: k, s });
        else if (this.king === k) this.thr.push({ b: k, k: 1 });
      }
    }
    this.sel.forEach((v, s) => {
      if (v < 0 || cnt[v] > 1) {
        // 2人プレイ・いかり時：キングと同じのを選ぶとその大きさぶん減点
        const d = this.n === 2 && v === this.king ? this.bombs[v] : 1;
        this.miss.push([s, d]);
      }
    });
    this.go('throw');
  }
  cpuInput(i) {
    const inp = emptyIn();
    if (this.ph === 'choose' && this.sel[i] < 0 && this.pt > this.cpuT[i]) {
      const lv = this.lv(i);
      const w = this.bombs.map((b) => (lv === 0 ? 1 : b * b));
      let r = Math.random() * w.reduce((a, b) => a + b, 0), k = 0;
      while (r > w[k]) { r -= w[k]; k++; }
      inp.k = k + 1;
    }
    return inp;
  }
  state() {
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100,
      bb: this.bombs.slice(), cur: this.cur.slice(), sel: this.sel.slice(), kg: this.king, co: this.coll || 0,
      th: this.thr.map((t) => [t.b, t.k ? -1 : t.s]), ti: this.ti, ms: this.miss.map((m) => m[0]),
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#3b2a1c', '#7a5636');
    for (let i = 0; i < 8; i++) { g.fillStyle = '#2c1f14'; g.fillRect(i * 130 + 20, 60, 24, 200); }
    const n = L(s.sc).length, ph = s.ph, P = s.pt + (v.since || 0);
    // キング
    const dead = s.done ? v.t - s.dT : -1;
    const jump = s.co && ph === 'throw' ? Math.abs(Math.sin(P * 9)) * 30 : 0;
    ellipse(g, 480, 200, 150, 28, '#4a4a52', '#222', 4);
    if (dead < 0.8) {
      const ky = 128 - jump;
      circle(g, 480, ky, 70, s.ang ? '#3a1414' : '#1d1d24', '#000', 4);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(450, ky - 35, 20, 0, 7); g.fill();
      rr(g, 470, ky - 92, 20, 24, 6); g.fillStyle = '#d4b04a'; g.fill();
      if (s.ang) { txt(g, '💢', 540, ky - 60, { size: 30, stroke: null }); }
      bossLabel(g, 650, ky, 'キングノレ兵', s.ang);
    }
    if (dead > 0) boom(g, 480, 140, dead * 0.9, 180);
    // コンベア
    rr(g, 220, BY + 8, 520, 34, 12); g.fillStyle = '#2b2b2b'; g.fill();
    for (let k = 0; k < 13; k++) { const x = 230 + ((k * 40 + (ph === 'conv' ? P * 120 : 0)) % 500); g.fillStyle = '#555'; g.fillRect(x, BY + 14, 18, 22); }
    const thr = L(s.th), sel = L(s.sel);
    const flying = new Map();
    thr.forEach((t, j) => flying.set(t[0], { j, s: t[1] }));
    L(s.bb).forEach((b, k) => {
      let x = BX[k], y = BY - SZ[b];
      if (ph === 'conv') x += (1 - ease(P / 1.4)) * 600;
      const f = flying.get(k);
      if (ph === 'throw' && f) {
        const t = (P - f.j * 0.75) / 0.75;
        if (t >= 1) return;
        if (t > 0) {
          const tx = f.s < 0 ? 480 : 480, ty = f.s < 0 ? -80 : 140;
          x = x + (tx - x) * t; y = y + (ty - y) * t - Math.sin(t * Math.PI) * 150;
          if (t > 0.92 && f.s >= 0) boom(g, 480, 140, (t - 0.92) * 10, 40 + b * 15);
        }
      }
      circle(g, x, y, SZ[b], '#202028', '#000', 3);
      g.fillStyle = '#d8d8d8'; g.fillRect(x - 3, y - SZ[b] - 9, 6, 10);
      circle(g, x - SZ[b] * 0.3, y - SZ[b] * 0.2, SZ[b] * 0.22, '#fff');
      txt(g, ['', '小', '中', '大'][b], x, y + SZ[b] + 22, { size: 18 });
      if (ph === 'choose' || ph === 'conv') txt(g, String(k + 1), x, BY - 80, { size: 22, col: '#ffe14d' });
      // 選択マーカー
      sel.forEach((sv, i) => {
        if (sv !== k) return;
        if (ph === 'choose' && i !== v.me) return;
        circle(g, x - 30 + i * 20, y - SZ[b] - 30, 9, PCOL[i], '#fff', 2);
      });
      if (ph === 'choose' && v.me >= 0 && sel[v.me] < 0 && L(s.cur)[v.me] === k) txt(g, '▼', x, y - SZ[b] - 50, { size: 26, col: PCOL[v.me] });
    });
    if (s.kg >= 0 && ph !== 'choose') { txt(g, '👑', BX[s.kg], BY - 120, { size: 24, stroke: null }); }
    // プレイヤー
    for (let i = 0; i < n; i++) {
      const x = 480 - (n - 1) * 75 + i * 150, y = 462;
      const m = L(s.ms).includes(i) && ph === 'react';
      drawChar(g, x, y - 20, i, v.slots[i].ci, { r: 20 });
      if (m && P > 0.5) boom(g, x, y - 20, (P - 0.5) * 1.5, 40);
      if (ph === 'choose') txt(g, sel[i] >= 0 ? 'OK!' : '…', x + 34, y - 46, { size: 18, col: sel[i] >= 0 ? '#7dff7d' : '#ddd' });
    }
    if (s.co && ph === 'throw') txt(g, 'みんな同じのをえらんじゃった！', 480, 245, { size: 26, col: '#ff8080' });
    if (ph === 'choose') txt(g, `えらぼう！ のこり ${Math.max(0, Math.ceil(10 - P))}`, 480, 245, { size: 24, col: '#fff' });
  }
}
