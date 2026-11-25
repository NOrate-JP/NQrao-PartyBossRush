// 5. トレン（カロン）: 神経衰弱カード
import { BossBase, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, hitRect, ease, PCOL, shuffle, star, drawChar, LV, pick } from '../engine.js';

const SHAPES = ['○', '△', '□', '☆'];
const COLS = ['#ff4a4a', '#3d8bff', '#2ec24a', '#ffc21a'];
const DIM = (R) => (R >= 3 ? [72, 88] : [84, 104]);
const GCY = 312;
export const PXY = (i) => [i < 2 ? 92 : 868, 250 + (i % 2) * 120];

export function drawShape(g, sh, x, y, r, col) {
  g.save(); g.fillStyle = col; g.strokeStyle = '#222'; g.lineWidth = 3;
  g.beginPath();
  if (sh === 0) g.arc(x, y, r, 0, Math.PI * 2);
  else if (sh === 1) { g.moveTo(x, y - r); g.lineTo(x + r * 1.05, y + r * 0.8); g.lineTo(x - r * 1.05, y + r * 0.8); g.closePath(); }
  else if (sh === 2) g.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else { g.restore(); star(g, x, y, r * 1.15, col, '#222'); return; }
  g.fill(); g.stroke(); g.restore();
}

export default class DryBones extends BossBase {
  static meta = {
    id: 'drybones', boss: 'トレン', title: 'デッキ・トレン', jp: 'トレンのカードめくり', stage: 'ノレサのホラーキャッスル 中ボス', bg: '#4b3a6b',
    rules: ['カードの絵柄をおぼえよう！ すぐにうら返しになる', 'トレンが乗った足場と「同じ形」のカードをえらぼう（5秒）', 'あたり：+3点＆ダメージ / ちがう形：なにもなし', 'トレンのカード or えらばない：ホネを投げられて -1点', 'ダメージを与えるほどカード・形が増える。いかり時はカードがシャッフル！', 'とどめをさすと +3点ボーナス（全員同点もありえる）'],
    controls: [['クリック / タップ', 'カードをえらぶ'], ['←↑↓→ ＋ Z', 'カーソルでえらぶ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(3 * this.n + 3);
    this.ph = 'intro'; this.pt = 0;
    this.cards = []; this.cols = 3; this.rows = 2; this.ns = 2;
    this.cur = Array(this.n).fill(0); this.sel = Array(this.n).fill(-1);
    this.tg = 0; this.plat = 0; this.shufCol = -1; this.perm = [];
    this.cpuT = []; this.res = [];
  }
  go(p) { this.ph = p; this.pt = 0; }
  stage() { const f = this.hp / this.mhp; return f > 0.75 ? 0 : f > 0.5 ? 1 : 2; }
  deal() {
    const st = this.stage();
    [this.cols, this.rows, this.ns] = [[3, 2, 2], [4, 2, 3], [4, 3, 4]][st];
    const total = this.cols * this.rows, nb = st + 1, nc = Math.min(4, this.ns + (st > 0 ? 1 : 0));
    this.tg = ri(0, this.ns - 1);
    const cards = [];
    for (let k = 0; k < nb; k++) cards.push({ b: 1 });
    const nt = st === 2 ? 2 : 1;
    for (let k = 0; k < nt; k++) cards.push({ sh: this.tg, c: ri(0, nc - 1) });
    while (cards.length < total) {
      let sh; do { sh = ri(0, this.ns - 1); } while (sh === this.tg && Math.random() < 0.7);
      cards.push({ sh, c: ri(0, nc - 1) });
    }
    this.cards = shuffle(cards);
    this.sel.fill(-1); this.shufCol = -1; this.res = [];
    this.cpuT = this.slots.map(() => rnd(1.0, 3.6));
    this.cpuMem = this.slots.map((_, i) => Math.random() < LV(this.lv(i)) + 0.05);
    this.plat = rnd(0, 1);
    this.go('show');
  }
  cardXY(k) {
    const [CW, CH] = DIM(this.rows);
    const c = k % this.cols, r = Math.floor(k / this.cols);
    const gw = this.cols * (CW + 16) - 16, gh = this.rows * (CH + 12) - 12;
    return [480 - gw / 2 + c * (CW + 16), GCY - gh / 2 + r * (CH + 12)];
  }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt;
    switch (this.ph) {
      case 'intro': if (P > 0.8) this.deal(); break;
      case 'show': if (P > (this.stage() === 2 ? 3.8 : 3.0)) this.go('flip'); break;
      case 'flip':
        if (P > 0.6) {
          if (this.angry) {
            this.shufCol = ri(0, this.cols - 1);
            const idx = []; for (let r = 0; r < this.rows; r++) idx.push(r * this.cols + this.shufCol);
            let p; do { p = shuffle(idx.slice()); } while (p.every((x, j) => x === idx[j]));
            const old = idx.map((x) => this.cards[x]);
            idx.forEach((x, j) => { this.cards[p[j]] = old[j]; });
            this.perm = idx.map((x, j) => [x, p[j]]);
            this.go('shuffle');
          } else this.go('jump');
        }
        break;
      case 'shuffle': if (P > 1.6) this.go('jump'); break;
      case 'jump': if (P > 1.1) this.go('choose'); break;
      case 'choose':
        ins.forEach((inp, i) => {
          if (this.sel[i] >= 0) return;
          const tot = this.cards.length, C = this.cols;
          if (inp.Lp) this.cur[i] = (this.cur[i] + tot - 1) % tot;
          if (inp.Rp) this.cur[i] = (this.cur[i] + 1) % tot;
          if (inp.Up) this.cur[i] = (this.cur[i] + tot - C) % tot;
          if (inp.Dp) this.cur[i] = (this.cur[i] + C) % tot;
          this.cur[i] = Math.min(this.cur[i], tot - 1);
          if (inp.A) this.sel[i] = this.cur[i];
          if (inp.P) { const [CW, CH] = DIM(this.rows); for (let k = 0; k < tot; k++) { const [x, y] = this.cardXY(k); if (hitRect(inp.px, inp.py, x, y, CW, CH)) this.sel[i] = k; } }
        });
        if (P > 5 || this.sel.every((x) => x >= 0)) { this.resolve(); }
        break;
      case 'reveal': if (P > 2.4 && !this.done) this.deal(); break;
    }
  }
  resolve() {
    const good = [];
    this.res = this.sel.map((k, i) => {
      if (k < 0) return 0;
      const c = this.cards[k];
      if (c.b) return 0;
      if (c.sh === this.tg) { good.push(i); return 1; }
      return 2;
    });
    // ダメージは全員分まとめて
    this.res.forEach((r, i) => { const [x, y] = PXY(i); if (r === 0) this.add(i, -1, x, y - 50); });
    good.forEach((i) => { const [x, y] = PXY(i); this.add(i, 3, x, y - 50); });
    if (good.length) this.hit(good.length, good, 480, 120);
    this.go('reveal');
  }
  cpuInput(i) {
    const inp = emptyIn();
    if (this.ph === 'choose' && this.sel[i] < 0 && this.pt > this.cpuT[i]) {
      const right = this.cards.map((c, k) => (!c.b && c.sh === this.tg ? k : -1)).filter((k) => k >= 0);
      const safe = this.cards.map((c, k) => (!c.b ? k : -1)).filter((k) => k >= 0);
      let k;
      if (this.cpuMem[i] && right.length) k = pick(right);
      else k = Math.random() < 0.6 ? pick(safe) : ri(0, this.cards.length - 1);
      const [x, y] = this.cardXY(k); inp.P = 1; inp.px = x + 10; inp.py = y + 10;
    }
    return inp;
  }
  state() {
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100, C: this.cols, R: this.rows, ns: this.ns,
      cd: this.cards.map((c) => (c.b ? 9 : c.sh * 4 + c.c)), tg: this.tg, sel: this.sel.slice(), cur: this.cur.slice(),
      sc2: this.shufCol, pm: this.perm.map((p) => p[0] * 100 + p[1]), rs: this.res.slice(), pl: Math.round(this.plat * 100) / 100,
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#1d1430', '#4a3768');
    for (let i = 0; i < 6; i++) { rr(g, 40 + i * 160, 30, 60, 120, 30); g.fillStyle = '#2c2045'; g.fill(); }
    const ph = s.ph, P = s.pt + (v.since || 0), ns = s.ns || 2, C = s.C || 3, R = s.R || 2;
    // 足場（形）
    const py = 100;
    const platX = (k) => 480 - (ns - 1) * 85 + k * 170;
    for (let k = 0; k < ns; k++) {
      ellipse(g, platX(k), py + 14, 60, 16, '#5b5068', '#2b2236', 3);
      drawShape(g, k, platX(k), py + 8, 12, '#ddd');
    }
    // トレン
    const dead = s.done ? v.t - s.dT : -1;
    let bx = 480, by = py - 26;
    if (ph === 'jump') { const t = ease(P / 1.0); bx = 480 + (platX(s.tg) - 480) * t; by = py - 26 - Math.sin(t * Math.PI) * 60; }
    else if (ph === 'choose' || ph === 'reveal') { bx = platX(s.tg); }
    else { by = py - 26 - Math.abs(Math.sin(P * 3)) * 40; }
    if (ph === 'shuffle') { bx = 480 + Math.sin(P * 6) * 160; }
    if (dead < 0.7) {
      g.save(); g.translate(bx, by);
      rr(g, -26, -34, 52, 46, 12); g.fillStyle = s.ang ? '#f0c8c8' : '#efe9d8'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#333'; g.stroke();
      g.fillStyle = '#333'; g.fillRect(-14, -22, 9, 9); g.fillRect(5, -22, 9, 9);
      for (let k = -1; k <= 1; k += 2) { rr(g, k * 20 - 6, 10, 12, 18, 4); g.fillStyle = '#efe9d8'; g.fill(); g.stroke(); }
      g.restore();
      bossLabel(g, bx + 80, by - 8, 'トレン', s.ang);
    } else if (dead > 0) boom(g, bx, by, dead, 60);
    // カード
    const [CW, CH] = DIM(R);
    const gw = C * (CW + 16) - 16, gh = R * (CH + 12) - 12;
    const xy = (k) => { const c = k % C, r = Math.floor(k / C); return [480 - gw / 2 + c * (CW + 16), GCY - gh / 2 + r * (CH + 12)]; };
    const cds = L(s.cd), sel = L(s.sel), rs = L(s.rs);
    const pm = L(s.pm);
    cds.forEach((cv, k) => {
      let [x, y] = xy(k);
      // シャッフル中の移動
      if (ph === 'shuffle') {
        const m = pm.find((p) => p % 100 === k);
        if (m != null) { const from = Math.floor(m / 100); const [fx, fy] = xy(from); const t = ease(P / 1.4); x = fx + (x - fx) * t; y = fy + (y - fy) * t + Math.sin(t * Math.PI) * 0; x += Math.sin(t * Math.PI) * 40; }
      }
      const up = ph === 'show' || (ph === 'flip' && P < 0.3) || (ph === 'reveal' && (sel.includes(k) || P > 1.4));
      rr(g, x, y, CW, CH, 10);
      if (up) {
        g.fillStyle = '#fffaf0'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#333'; g.stroke();
        if (cv === 9) { txt(g, '☠', x + CW / 2, y + CH / 2 - 6, { size: 40, col: '#333', stroke: null }); txt(g, 'トレン', x + CW / 2, y + CH - 16, { size: 14, col: '#333', stroke: null }); }
        else drawShape(g, Math.floor(cv / 4), x + CW / 2, y + CH / 2, 22, COLS[cv % 4]);
      } else {
        g.fillStyle = '#6b3fa0'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#e8d8ff'; g.stroke();
        txt(g, '?', x + CW / 2, y + CH / 2, { size: 34, col: '#d8c0ff', stroke: null });
      }
      // マーカー
      sel.forEach((sv, i) => {
        if (sv !== k) return;
        if (ph === 'choose' && i !== v.me) return;
        circle(g, x + 14 + i * 19, y + 12, 9, PCOL[i], '#fff', 2);
        txt(g, String(i + 1), x + 14 + i * 19, y + 12, { size: 11, stroke: null });
      });
      if (ph === 'choose' && v.me >= 0 && sel[v.me] < 0 && L(s.cur)[v.me] === k) { rr(g, x - 4, y - 4, CW + 8, CH + 8, 12); g.lineWidth = 4; g.strokeStyle = PCOL[v.me]; g.stroke(); }
    });
    // プレイヤー
    const n = L(s.sc).length;
    for (let i = 0; i < n; i++) {
      const [x, y] = PXY(i);
      drawChar(g, x, y, i, v.slots[i].ci, { r: 22 });
      if (ph === 'reveal') { const r = rs[i]; txt(g, r === 1 ? 'あたり！' : r === 2 ? 'はずれ' : 'ホネ！', x, y + 46, { size: 18, col: r === 1 ? '#7dff7d' : r === 2 ? '#ddd' : '#ff8080' }); }
      if (ph === 'choose') txt(g, sel[i] >= 0 ? 'OK!' : '…', x, y + 46, { size: 16, col: sel[i] >= 0 ? '#7dff7d' : '#ccc' });
    }
    if (ph === 'show') txt(g, 'おぼえよう！', 480, 146, { size: 28, col: '#ffe14d' });
    if (ph === 'choose') { txt(g, `同じ形をえらべ！ のこり ${Math.max(0, Math.ceil(5 - P))}`, 480, 146, { size: 24, col: '#ffe14d' }); drawShape(g, s.tg, 480 + 190, 146, 12, '#fff'); }
    if (ph === 'shuffle') txt(g, 'シャッフル！', 480, 146, { size: 28, col: '#ff8080' });
  }
}
