// ===== 進行管理（ホストだけが動かす） =====
import { GAMES } from './games/index.js';
import { emptyIn, rnd } from './engine.js';

export const RP = [5, 3, 2, 1];
export const OK_BTN = [380, 452, 200, 46];

export class Director {
  constructor(slots, list) {
    this.slots = slots; // [{name, ci, cpu, lv, uid}]
    this.n = slots.length;
    this.list = list;
    this.bi = 0;
    this.tot = Array(this.n).fill(0);
    this.raw = Array(this.n).fill(0); // ミニゲーム得点の合計
    this.last = slots.map(() => ({}));
    this.ph = 'intro'; this.pt = 0;
    this.ready = Array(this.n).fill(0);
    this.cpuReady = slots.map(() => rnd(1.2, 3));
    this.game = null; this.rk = [];
    this.makeGame();
  }
  makeGame() {
    const G = GAMES[this.list[this.bi]];
    this.game = new G({ slots: this.slots });
    this.ready.fill(0);
    this.cpuReady = this.slots.map(() => rnd(1.2, 3));
  }
  go(p) { this.ph = p; this.pt = 0; }
  // 生入力（カウンタ付き）→ このフレームの入力
  edge(i, raw) {
    const o = emptyIn(); if (!raw) return o;
    const l = this.last[i];
    o.l = raw.l ? 1 : 0; o.r = raw.r ? 1 : 0; o.u = raw.u ? 1 : 0; o.d = raw.d ? 1 : 0; o.a = raw.a ? 1 : 0; o.b = raw.b ? 1 : 0;
    const c = (k) => { const v = raw[k] || 0, pv = l[k] ?? v; l[k] = v; return v > pv ? 1 : 0; };
    o.A = c('Ac'); o.B = c('Bc'); o.Lp = c('Lc'); o.Rp = c('Rc'); o.Up = c('Uc'); o.Dp = c('Dc'); o.P = c('Pc');
    if (c('kc')) o.k = raw.k ?? -1;
    o.px = raw.px ?? -1; o.py = raw.py ?? -1;
    return o;
  }
  update(dt, raws) {
    this.pt += dt;
    const ins = this.slots.map((s, i) => (s.cpu ? null : this.edge(i, raws[i])));
    const humans = this.slots.map((s, i) => i).filter((i) => !this.slots[i].cpu);
    const allReady = () => humans.every((i) => this.ready[i]);
    const markReady = (minT = 0) => {
      this.slots.forEach((s, i) => {
        if (s.cpu) { if (this.pt > this.cpuReady[i]) this.ready[i] = 1; return; }
        const inp = ins[i];
        if (this.pt > minT && inp && (inp.A || (inp.P && inp.px >= OK_BTN[0] && inp.px <= OK_BTN[0] + OK_BTN[2] && inp.py >= OK_BTN[1] && inp.py <= OK_BTN[1] + OK_BTN[3]))) this.ready[i] = 1;
      });
    };
    switch (this.ph) {
      case 'intro':
        markReady(0.6);
        if ((this.ready.every((x) => x) && this.pt > 1.5) || this.pt > 30) this.go('start');
        break;
      case 'start': if (this.pt > 2.2) this.go('play'); break;
      case 'play': {
        const g = this.game;
        const gi = this.slots.map((s, i) => (s.cpu ? g.cpuInput(i, dt) : ins[i]));
        g.update(dt, gi);
        if (g.done) this.go('finish');
        else if (this.pt > 300) { g.done = true; g.doneT = g.T; g.timeout = 1; this.go('finish'); }
        break;
      }
      case 'finish': {
        const g = this.game; const e = this.slots.map(() => emptyIn());
        g.update(dt, e);
        if (this.pt > 3.4) this.finishGame();
        break;
      }
      case 'result':
        markReady(1.5);
        if ((this.ready.every((x) => x) && this.pt > 2.5) || this.pt > 15) this.next();
        break;
      case 'final': break;
    }
  }
  finishGame() {
    const sc = this.game.sc;
    this.rk = sc.map((v, i) => {
      const rank = 1 + sc.filter((w) => w > v).length;
      return { s: i, sc: v, rank, rp: RP[rank - 1] ?? 0 };
    });
    this.rk.forEach((r) => { this.tot[r.s] += r.rp; this.raw[r.s] += r.sc; });
    this.ready.fill(0); this.cpuReady = this.slots.map(() => rnd(1.6, 3));
    this.go('result');
  }
  next() {
    this.bi++;
    if (this.bi >= this.list.length) { this.go('final'); return; }
    this.makeGame();
    this.go('intro');
  }
  snap() {
    const p = this.ph;
    const withGame = p === 'start' || p === 'play' || p === 'finish' || p === 'intro';
    return {
      ph: p, pt: Math.round(this.pt * 100) / 100, bi: this.bi, list: this.list, gid: this.list[Math.min(this.bi, this.list.length - 1)],
      tot: this.tot.slice(), raw: this.raw.slice(), rd: this.ready.slice(),
      rk: this.rk.map((r) => [r.s, r.sc, r.rank, r.rp]),
      gs: withGame && this.game ? this.game.state() : 0,
      to: this.game && this.game.timeout ? 1 : 0,
    };
  }
}
