// 9. ノトン（ガボン）: ハンマーで鉄球をうちかえす
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, LV, dist, hitRect, spiky, PCOL, shuffle, pick, ease } from '../engine.js';

const IW = 78, IH = 78;

export function drawTool(g, t, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (t === 2) { // えだ
    g.strokeStyle = '#7a4a1e'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-22, 24); g.lineTo(18, -22); g.moveTo(0, 0); g.lineTo(20, 6); g.moveTo(-8, 10); g.lineTo(-24, -6); g.stroke();
    ellipse(g, 22, 8, 7, 4, '#4caf50'); ellipse(g, -26, -8, 7, 4, '#4caf50');
  } else {
    g.rotate(-0.5);
    rr(g, -5, -4, 10, 38, 4); g.fillStyle = '#9a6a3a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#3a2410'; g.stroke();
    rr(g, -24, -24, 48, 24, 6); g.fillStyle = t === 1 ? '#ffd23c' : '#9aa4ad'; g.fill(); g.lineWidth = 3; g.strokeStyle = t === 1 ? '#8a6a00' : '#33393f'; g.stroke();
    if (t === 1) { g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(-18, -20, 12, 6); }
  }
  g.restore();
}

export default class Spike extends BossBase {
  static meta = {
    id: 'spike', boss: 'ノトン', title: 'ノトン・ストライク', jp: 'ノトンの鉄球うちかえし', stage: 'ノレートマグマ 中ボス', bg: '#b8401a',
    rules: ['鉄球がころがってきたら、画面の中からハンマーをえらぼう', 'ハンマー：うちかえして +1点 / 金のハンマー：+3点＆大ダメージ', 'えだをえらぶ or えらべないと鉄球につぶされて -1点', 'ハンマーは早いもの勝ち！ ダメージを与えるほど数がへる', 'いかり時は足場がしずんで、えらぶ時間が短くなる', 'とどめをさすと +3点ボーナス'],
    controls: [['クリック / タップ', 'アイテムをえらぶ'], ['← → ＋ Z', 'カーソルでえらぶ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(6 * this.n + 4);
    this.ph = 'intro'; this.pt = 0; this.round = 0;
    this.it = []; this.cl = Array(this.n).fill(-1); this.cur = Array(this.n).fill(0);
    this.cpuT = [];
  }
  go(p) { this.ph = p; this.pt = 0; }
  hammers() {
    const n = this.n, f = this.hp / this.mhp;
    if (!this.angry) return this.round === 1 || n === 2 ? n : n - 1;
    if (n === 2) return 1; if (n === 4) return 2; return f < 0.25 ? 1 : 2;
  }
  newRound() {
    this.round++;
    const h = this.hammers();
    const types = []; for (let k = 0; k < 5; k++) types.push(k < h ? (k === 0 ? 1 : 0) : 2);
    shuffle(types);
    const pos = [];
    this.it = types.map((t) => {
      let x, y, tries = 0;
      do { x = rnd(110, 850 - IW); y = rnd(176, 330); tries++; } while (pos.some((p) => Math.abs(p[0] - x) < IW + 14 && Math.abs(p[1] - y) < IH + 10) && tries < 200);
      pos.push([x, y]);
      return { t, x, y, by: -1 };
    });
    this.it.sort((a, b) => a.x - b.x);
    this.cl.fill(-1);
    const lv = (i) => this.lv(i);
    this.cpuT = this.slots.map((_, i) => [rnd(1.0, 2.2), rnd(0.65, 1.5), rnd(0.4, 0.95)][lv(i)] * (this.angry ? 0.75 : 1));
    this.go('roll');
  }
  limit() { return this.angry ? 2.1 : 3.2; }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt;
    switch (this.ph) {
      case 'intro': if (P > 1.0) this.newRound(); break;
      case 'roll': if (P > 0.9) this.go('choose'); break;
      case 'choose':
        ins.forEach((inp, i) => {
          if (this.cl[i] >= 0) return;
          if (inp.Lp) this.cur[i] = (this.cur[i] + 4) % 5;
          if (inp.Rp) this.cur[i] = (this.cur[i] + 1) % 5;
          let want = -1;
          if (inp.A) want = this.cur[i];
          if (inp.P) this.it.forEach((o, k) => { if (hitRect(inp.px, inp.py, o.x - 6, o.y - 6, IW + 12, IH + 12)) want = k; });
          if (want >= 0 && this.it[want].by < 0) { this.it[want].by = i; this.cl[i] = want; }
        });
        if (P > this.limit() || this.cl.every((c) => c >= 0)) this.resolve();
        break;
      case 'swing': if (P > 2.0 && !this.done) this.newRound(); break;
    }
  }
  resolve() {
    const hitters = [];
    let dmg = 0;
    this.res = this.cl.map((k, i) => {
      const x = 480 - (this.n - 1) * 140 + i * 280;
      if (k < 0 || this.it[k].t === 2) { this.add(i, -1, x, 380); return 0; }
      const gold = this.it[k].t === 1;
      this.add(i, gold ? 3 : 1, x, 380); hitters.push(i); dmg += gold ? 3 : 1; return gold ? 2 : 1;
    });
    if (dmg) this.hit(dmg, hitters, 480, 120);
    this.go('swing');
  }
  cpuInput(i) {
    const inp = emptyIn();
    if (this.ph !== 'choose' || this.cl[i] >= 0 || this.pt < this.cpuT[i]) return inp;
    const lv = this.lv(i);
    const free = this.it.map((o, k) => (o.by < 0 ? k : -1)).filter((k) => k >= 0);
    let opts = free.filter((k) => this.it[k].t !== 2);
    if (lv === 2) { const gd = opts.filter((k) => this.it[k].t === 1); if (gd.length) opts = gd; }
    if (lv === 0 && Math.random() < 0.2) opts = free;
    if (!opts.length) opts = free;
    if (!opts.length) return inp;
    const k = pick(opts), o = this.it[k];
    inp.P = 1; inp.px = o.x + IW / 2; inp.py = o.y + IH / 2;
    return inp;
  }
  state() {
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100, lim: this.limit(),
      it: this.it.map((o) => [o.t, r0(o.x), r0(o.y), o.by]), cl: this.cl.slice(), cur: this.cur.slice(), rs: (this.res || []).slice(),
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#3a0d05', '#ff5a1a');
    const n = L(s.sc).length, ph = s.ph, P = s.pt + (v.since || 0);
    const sink = s.ang ? 40 : 0;
    // 足場
    g.fillStyle = '#5a4a46';
    g.beginPath(); g.moveTo(380, 110 + sink); g.lineTo(580, 110 + sink); g.lineTo(900, 420); g.lineTo(60, 420); g.closePath(); g.fill();
    g.strokeStyle = '#2a2220'; g.lineWidth = 4; g.stroke();
    ellipse(g, 480, 110 + sink, 110, 26, '#6e5d58', '#2a2220', 4);
    // 坂のライン
    const px = (i) => 480 - (n - 1) * 140 + i * 280;
    for (let i = 0; i < n; i++) { g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 50; g.beginPath(); g.moveTo(480 + (i - (n - 1) / 2) * 50, 125 + sink); g.lineTo(px(i), 400); g.stroke(); }
    // マグマ
    grad(g, 420, 540, '#ff7a1a', '#c8200a');
    for (let k = 0; k < 8; k++) circle(g, (k * 131 + v.t * 20) % 960, 450 + (k % 3) * 20, 10, 'rgba(255,230,120,.5)');
    // ノトン
    const dead = s.done ? v.t - s.dT : -1;
    if (dead < 0.8) {
      const by = 84 + sink - (ph === 'roll' ? Math.abs(Math.sin(P * 6)) * 10 : 0);
      ellipse(g, 480, by, 64, 48, s.ang ? '#3fa34a' : '#5fcf5a', '#1d4a1d', 4);
      for (let k = -1; k <= 1; k++) circle(g, 480 + k * 26, by - 40, 9, '#fff', '#1d4a1d', 2);
      bossLabel(g, 600, by, 'ノトン', s.ang);
    }
    if (dead > 0) boom(g, 480, 84, dead, 120);
    // 鉄球
    const rs = L(s.rs);
    for (let i = 0; i < n; i++) {
      const x0 = 480 + (i - (n - 1) / 2) * 50, y0 = 125 + sink, x1 = px(i), y1 = 370;
      let t = 0;
      if (ph === 'roll') t = ease(P / 0.9) * 0.4;
      else if (ph === 'choose') t = 0.4 + (P / (s.lim || 3)) * 0.45;
      else if (ph === 'swing') { const r = rs[i]; t = r ? Math.max(0, 0.85 - P * 1.2) : Math.min(1, 0.85 + P); }
      if (ph === 'swing' && rs[i] && P > 0.7) continue;
      const r = 20 + t * 26;
      spiky(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - r * 0.4, r, '#4a4a55', '#d8d8e0', 12);
    }
    // プレイヤー
    for (let i = 0; i < n; i++) {
      const x = px(i), y = 410;
      const sq = ph === 'swing' && rs[i] === 0 && P > 0.15;
      if (sq) { g.save(); g.translate(x, y); g.scale(1.5, 0.35); drawChar(g, 0, 0, i, v.slots[i].ci, { tag: false }); g.restore(); }
      else drawChar(g, x, y - 18, i, v.slots[i].ci, { r: 20 });
      if (ph === 'swing' && rs[i]) drawTool(g, rs[i] === 2 ? 1 : 0, x + 28, y - 30, 0.7);
    }
    // アイテム
    if (ph === 'choose' || ph === 'swing') {
      L(s.it).forEach((o, k) => {
        if (ph === 'swing' && o[3] < 0) return;
        const x = o[1], y = o[2];
        if (ph === 'swing') return;
        rr(g, x, y, IW, IH, 14); g.fillStyle = o[3] >= 0 ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.88)'; g.fill();
        g.lineWidth = 4; g.strokeStyle = o[3] >= 0 ? PCOL[o[3]] : '#333'; g.stroke();
        drawTool(g, o[0], x + IW / 2, y + IH / 2, o[3] >= 0 ? 0.8 : 1);
        if (o[3] >= 0) txt(g, `${o[3] + 1}P`, x + IW / 2, y + IH - 10, { size: 15, stroke: PCOL[o[3]] });
        if (v.me >= 0 && L(s.cl)[v.me] < 0 && L(s.cur)[v.me] === k) { rr(g, x - 6, y - 6, IW + 12, IH + 12, 16); g.lineWidth = 4; g.strokeStyle = PCOL[v.me]; g.stroke(); }
      });
      if (ph === 'choose') {
        const left = Math.max(0, (s.lim || 3) - P);
        rr(g, 330, 150, 300, 16, 8); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill();
        rr(g, 330, 150, 300 * (left / (s.lim || 3)), 16, 8); g.fillStyle = '#ffe14d'; g.fill();
      }
    }
    if (ph === 'roll') txt(g, 'くるぞ！', 480, 250, { size: 40, col: '#ffe14d' });
  }
}
