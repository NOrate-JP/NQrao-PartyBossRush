// 3. ノッレン（バッタン）: 01カウントバトル
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, LV, hitRect, ease, PCOL } from '../engine.js';

const CX = 480, CY = 345, RX = 190, RY = 92;
const BTN = [[372, 432, 96, 64], [492, 432, 96, 64]];

export default class Whomp extends BossBase {
  static meta = {
    id: 'whomp', boss: 'ノッレン', title: 'ノッレン・ストンプ', jp: 'ノッレンの01カウントバトル', stage: 'ノレ兵ファクトリー 中ボス', bg: '#7d7d86',
    rules: ['毎ラウンド「0」か「1」をえらぼう（10秒）', '全員の数の合計だけ足場が回転する', 'ノッレンの正面に止まった人はつぶされて -1点', 'ほかの人はノッレンの背中でヒップドロップ連打！ 1回 +3点', 'いかり時はノッレンが回転数を1〜2増やしてくる', 'とどめをさすと +3点ボーナス'],
    controls: [['← / →  ・ 0 / 1キー', '数をえらぶ'], ['Z / クリック', 'けってい'], ['Z 連打', 'ジャンプ→ヒップドロップ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(22 * (this.n - 1));
    this.N = this.n;
    this.pos = this.slots.map((_, i) => i);
    this.ph = 'intro'; this.pt = 0; this.round = 0;
    this.cur = Array(this.n).fill(0); this.lock = Array(this.n).fill(0);
    this.ex = 0; this.tot = 0; this.step = 0; this.rot = 0; this.front = -1;
    this.mash = this.slots.map(() => ({ air: 0, can: 0, z: 0, cpuT: 0 }));
    this.cpuPick = this.slots.map(() => 0);
  }
  go(ph) { this.ph = ph; this.pt = 0; }
  frontSlot() { return this.pos.indexOf(0); }
  update(dt, ins) {
    this.tick(dt); this.pt += dt;
    const P = this.pt;
    switch (this.ph) {
      case 'intro': if (P > 1.2) this.startRound(); break;
      case 'choose': {
        ins.forEach((inp, i) => {
          if (this.lock[i]) return;
          if (inp.Lp) this.cur[i] = 0;
          if (inp.Rp) this.cur[i] = 1;
          if (inp.k === 0 || inp.k === 1) { this.cur[i] = inp.k; this.lock[i] = 1; }
          if (inp.A) this.lock[i] = 1;
          if (inp.P) BTN.forEach((b, v) => { if (hitRect(inp.px, inp.py, ...b)) { this.cur[i] = v; this.lock[i] = 1; } });
        });
        if (P > 10 || this.lock.every((x) => x)) { this.lock.fill(1); this.go('reveal'); }
        break;
      }
      case 'reveal':
        if (P > 1.6) {
          this.tot = this.cur.reduce((a, b) => a + b, 0);
          if (this.angry) { this.ex = ri(1, 2); this.go('stomp'); }
          else { this.ex = 0; this.go('rotate'); this.step = 0; }
        }
        break;
      case 'stomp': if (P > 1.3) { this.tot += this.ex; this.go('rotate'); this.step = 0; } break;
      case 'rotate': {
        const per = 0.5;
        this.rot = Math.min(1, (P - this.step * per) / per);
        if (this.step >= this.tot) { this.rot = 0; this.go('crush'); this.front = this.frontSlot(); break; }
        if (P >= (this.step + 1) * per) { this.pos = this.pos.map((p) => (p + 1) % this.N); this.step++; this.rot = 0; }
        break;
      }
      case 'crush':
        if (P > 0.55 && !this.crushed) { this.crushed = 1; this.add(this.front, -1, this.slotXY(this.front)[0], 250); }
        if (P > 1.4) { this.go('attack'); this.mash.forEach((m) => { m.air = 0; m.can = 0; }); }
        break;
      case 'attack': {
        ins.forEach((inp, i) => {
          const m = this.mash[i];
          if (m.air > 0) m.air -= dt;
          if (i === this.front || this.done) return;
          if (inp.A) {
            if (m.air <= 0) { m.air = 0.3; m.can = 1; }
            else if (m.can) {
              m.can = 0; m.air = Math.min(m.air, 0.08);
              const x = this.attackX(i);
              if (this.hit(1, [i], x, 200)) this.add(i, 3, x, 196);
            }
          }
        });
        if (P > 4.2 || this.done) this.go('rise');
        break;
      }
      case 'rise': if (P > 1.3 && !this.done) this.startRound(); break;
    }
  }
  startRound() { this.round++; this.cur.fill(0); this.lock.fill(0); this.crushed = 0; this.front = -1; this.ex = 0; this.tot = 0; this.go('choose'); this.cpuPick = this.slots.map(() => rnd(1.0, 4.5)); }
  attackX(i) { const others = this.slots.map((_, k) => k).filter((k) => k !== this.front); const j = others.indexOf(i); return CX - (others.length - 1) * 55 + j * 110; }
  slotXY(i, rot = 0) {
    const a = -Math.PI / 2 + ((this.pos[i] + rot) * Math.PI * 2) / this.N;
    return [CX + Math.cos(a) * RX * 0.78, CY + Math.sin(a) * RY * 0.78];
  }
  cpuInput(i) {
    const inp = emptyIn(), m = this.mash[i];
    if (this.ph === 'choose' && !this.lock[i] && this.pt > this.cpuPick[i]) inp.k = Math.random() < 0.5 ? 0 : 1;
    if (this.ph === 'attack') {
      m.cpuT -= 1 / 60;
      if (m.cpuT <= 0) { inp.A = 1; m.cpuT = [0.3, 0.22, 0.17][this.lv(i)] * rnd(0.8, 1.25); }
    }
    return inp;
  }
  state() {
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100, N: this.N, rd: this.round,
      pos: this.pos.slice(), cur: this.cur.slice(), lk: this.lock.slice(), ex: this.ex, tot: this.tot, st: this.step, rot: Math.round(this.rot * 100) / 100,
      fr: this.front, mz: this.mash.map((m) => (m.air > 0 ? 1 : 0) + (m.can ? 0 : 2)),
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#3c3f4a', '#8a8d96');
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#4a4e5a' : '#52566a'; g.fillRect(i * 100, 40, 60, 180); }
    g.fillStyle = '#2b2d33'; g.fillRect(0, 210, 960, 20);
    const N = s.N || 2, ph = s.ph, P = s.pt + (v.since || 0);
    // 足場
    ellipse(g, CX, CY + 22, RX + 8, RY + 10, '#3b3b3b');
    ellipse(g, CX, CY, RX, RY, '#c9b27a', '#6b5a33', 5);
    const rotA = ph === 'rotate' ? ease(s.rot) : 0;
    for (let j = 0; j < N; j++) {
      const a = -Math.PI / 2 + ((j + rotA) * Math.PI * 2) / N;
      g.beginPath(); g.moveTo(CX, CY); g.lineTo(CX + Math.cos(a + Math.PI / N) * RX, CY + Math.sin(a + Math.PI / N) * RY); g.strokeStyle = '#8a7444'; g.lineWidth = 3; g.stroke();
    }
    // 中央のカウンター
    circle(g, CX, CY, 34, '#222', '#ffd54a', 4);
    let shown = '?';
    if (ph === 'rotate') shown = String(Math.max(0, s.tot - s.st));
    else if (ph === 'stomp') shown = String(s.tot) + (P > 0.6 ? `+${s.ex}` : '');
    else if (ph === 'reveal') shown = P > 0.8 ? String(L(s.cur).reduce((a, b) => a + b, 0)) : '?';
    else if (ph === 'crush' || ph === 'attack' || ph === 'rise') shown = '0';
    txt(g, shown, CX, CY + 1, { size: 30, col: '#ffd54a' });
    // ノッレン
    const dead = s.done ? v.t - s.dT : -1;
    const fx = CX, fy = CY - RY * 0.78;
    let lying = 0;
    if (ph === 'crush') lying = ease((P - 0.1) / 0.45);
    else if (ph === 'attack') lying = 1;
    else if (ph === 'rise') lying = s.done ? 1 : 1 - ease(P / 0.9);
    const stompJ = ph === 'stomp' ? Math.abs(Math.sin(P * 8)) * 30 : 0;
    const drawWhomp = () => {
      if (dead > 0.8) return;
      g.save();
      const bx = CX, by = 222 - stompJ;
      if (lying > 0) {
        const w = 150 + 170 * lying, h = 160 - 100 * lying;
        const y = lerp(by - 160, fy - 40, lying);
        rr(g, bx - w / 2, y, w, h, 14); g.fillStyle = s.ang ? '#a87272' : '#9aa0a8'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#3d3f44'; g.stroke();
        for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(bx - w / 2 + (w * k) / 4, y + 6); g.lineTo(bx - w / 2 + (w * k) / 4, y + h - 6); g.strokeStyle = 'rgba(0,0,0,.2)'; g.stroke(); }
      } else {
        rr(g, bx - 75, by - 160, 150, 160, 14); g.fillStyle = s.ang ? '#a87272' : '#9aa0a8'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#3d3f44'; g.stroke();
        rr(g, bx - 40, by - 125, 80, 36, 10); g.fillStyle = s.ang ? '#ff5a5a' : '#e8e8e8'; g.fill();
      }
      g.restore();
      bossLabel(g, CX + 150, lying > 0.5 ? 200 : 150 - stompJ, 'ノッレン', s.ang);
    };
    function lerp(a, b, t) { return a + (b - a) * t; }
    if (lying < 0.5) drawWhomp();
    // プレイヤー
    L(s.pos).forEach((pp, i) => {
      let ap = pp;
      if (ph === 'rotate') ap = pp + ease(s.rot);
      const a = -Math.PI / 2 + (ap * Math.PI * 2) / N;
      let x = CX + Math.cos(a) * RX * 0.78, y = CY + Math.sin(a) * RY * 0.78;
      const isFront = s.fr === i;
      if ((ph === 'attack' || (ph === 'rise' && P < 0.6)) && !isFront) {
        const others = L(s.pos).map((_, k) => k).filter((k) => k !== s.fr), j = others.indexOf(i);
        x = CX - (others.length - 1) * 55 + j * 110; y = 230;
        const mz = L(s.mz)[i] || 0;
        y -= mz & 1 ? 34 : 0;
      }
      if (ph === 'reveal' && L(s.cur)[i] === 1) { const k = Math.min(1, P / 0.5); y -= 0; x += (CX - x) * 0.25 * k; }
      if (isFront && (ph === 'attack' || ph === 'crush' && P > 0.55)) {
        g.save(); g.translate(x, y); g.scale(1.4, 0.35); drawChar(g, 0, 0, i, v.slots[i].ci, { tag: false }); g.restore();
        return;
      }
      ellipse(g, x, y + 18, 18, 7, 'rgba(0,0,0,.3)');
      drawChar(g, x, y - 4, i, v.slots[i].ci, {});
      // 吹き出し（えらんだ数）
      if (ph === 'choose' || ph === 'reveal') {
        const lk = L(s.lk)[i];
        let t = '…';
        if (ph === 'reveal') t = String(L(s.cur)[i]);
        else if (i === v.me) t = String(L(s.cur)[i]) + (lk ? '' : '?');
        else if (lk) t = 'OK';
        rr(g, x - 24, y - 78, 48, 32, 10); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = PCOL[i]; g.lineWidth = 3; g.stroke();
        txt(g, t, x, y - 62, { size: 20, col: '#222', stroke: null });
      }
    });
    if (lying >= 0.5) drawWhomp();
    if (dead > 0) boom(g, CX, 220, dead, 160);
    // 入力ボタン
    if (ph === 'choose' && v.me >= 0 && !L(s.lk)[v.me]) {
      BTN.forEach((b, k) => {
        const sel = L(s.cur)[v.me] === k;
        rr(g, ...b, 14); g.fillStyle = sel ? '#ffd54a' : '#fff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#333'; g.stroke();
        txt(g, String(k), b[0] + b[2] / 2, b[1] + b[3] / 2 + 2, { size: 40, col: '#333', stroke: null });
      });
      txt(g, `のこり ${Math.max(0, Math.ceil(10 - P))}`, CX, 412, { size: 20 });
    }
    if (ph === 'attack') txt(g, 'Zボタン連打でヒップドロップ！', CX, 412, { size: 24, col: '#ffe14d' });
    if (ph === 'stomp' && P > 0.6) txt(g, `ノッレンが回転を +${s.ex}！`, CX, 412, { size: 26, col: '#ff6a6a' });
  }
}
