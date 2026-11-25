// 10. ノンノン（ワンワン）: あみだくじトロッコ
import { BossBase, drawChar, circle, ellipse, rr, txt, grad, boom, bossLabel, emptyIn, rnd, ri, r0, L, LV, hitRect, PCOL, shuffle, pick, ease } from '../engine.js';

const LX = (k) => 240 + k * 120, TOP = 175, BOT = 405;

export default class Chomp extends BossBase {
  static meta = {
    id: 'chomp', boss: 'ノンノン', title: 'ノンノン・ロンプ', jp: 'ノンノンのあみだトロッコ', stage: 'ノレートマグマ ボス', bg: '#8a2a10',
    rules: ['線路の分かれ道をおぼえてから、トロッコをえらぼう（10秒）', '5本のうち4本は大砲へ、1本はノンノンへつながっている', '鉄の大砲 +1点 / 金の大砲 +3点＆大ダメージ（2ラウンドごとに登場）', 'ノンノンに着いてしまうと -1点', 'いかり時はノンノン行きが2本にふえる！', 'とどめをさすと +3点ボーナス'],
    controls: [['1〜5キー / クリック', 'トロッコをえらぶ'], ['← → ＋ Z', 'カーソルでえらぶ']],
  };
  constructor(cfg) {
    super(cfg);
    this.setHP(4 * this.n + 4);
    this.ph = 'intro'; this.pt = 0; this.round = 0;
    this.rg = []; this.ends = []; this.sel = Array(this.n).fill(-1); this.cur = Array(this.n).fill(2);
    this.fireI = 0;
  }
  go(p) { this.ph = p; this.pt = 0; }
  newRound() {
    this.round++;
    // 横線
    const rg = [], ys = [];
    const cnt = ri(6, 9);
    for (let k = 0; k < cnt; k++) {
      let tries = 0, l, y;
      do { l = ri(0, 3); y = rnd(TOP + 30, BOT - 30); tries++; } while (tries < 50 && rg.some((r) => Math.abs(r.y - y) < 22 && Math.abs(r.l - l) <= 1));
      rg.push({ l, y });
    }
    this.rg = rg.sort((a, b) => a.y - b.y);
    const nc = this.angry ? 3 : 4;
    const ends = []; for (let k = 0; k < 5; k++) ends.push(k < nc ? 1 : 0);
    shuffle(ends);
    if (this.round % 2 === 0) { const cs = ends.map((e, k) => (e ? k : -1)).filter((k) => k >= 0); ends[pick(cs)] = 2; }
    this.ends = ends;
    this.sel.fill(-1);
    this.cpuT = this.slots.map(() => rnd(1.2, 6));
    this.go('show');
  }
  trace(k) {
    let l = k; const pts = [[LX(l), TOP]];
    for (const r of this.rg) {
      if (r.l === l) { pts.push([LX(l), r.y]); l++; pts.push([LX(l), r.y]); }
      else if (r.l === l - 1) { pts.push([LX(l), r.y]); l--; pts.push([LX(l), r.y]); }
    }
    pts.push([LX(l), BOT]);
    return { end: l, pts };
  }
  update(dt, ins) {
    this.tick(dt); this.pt += dt; const P = this.pt;
    switch (this.ph) {
      case 'intro': if (P > 0.8) this.newRound(); break;
      case 'show': if (P > 3.2) this.go('choose'); break;
      case 'choose':
        ins.forEach((inp, i) => {
          if (this.sel[i] >= 0) return;
          if (inp.Lp) this.cur[i] = (this.cur[i] + 4) % 5;
          if (inp.Rp) this.cur[i] = (this.cur[i] + 1) % 5;
          let w = -1;
          if (inp.k >= 1 && inp.k <= 5) w = inp.k - 1;
          else if (inp.A) w = this.cur[i];
          if (inp.P) for (let k = 0; k < 5; k++) if (hitRect(inp.px, inp.py, LX(k) - 45, TOP - 75, 90, 80)) w = k;
          if (w >= 0 && !this.sel.includes(w)) this.sel[i] = w;
        });
        if (P > 10 || this.sel.every((x) => x >= 0)) {
          this.sel = this.sel.map((x) => { if (x >= 0) return x; const free = [0, 1, 2, 3, 4].filter((k) => !this.sel.includes(k)); return pick(free); });
          // 二重チェック
          this.res = this.sel.map((k) => this.trace(k).end);
          this.order = [0, 1, 2, 3, 4].map((e) => this.res.indexOf(e)).filter((i) => i >= 0);
          this.fireI = 0;
          this.go('ride');
        }
        break;
      case 'ride': if (P > 2.8) this.go('fire'); break;
      case 'fire': {
        const per = 0.75;
        while (this.fireI < this.order.length && P > (this.fireI + 1) * per) {
          const i = this.order[this.fireI], e = this.res[i], t = this.ends[e];
          const x = LX(e);
          if (t === 0) this.add(i, -1, x, 440);
          else { const d = t === 2 ? 3 : 1; if (this.hit(d, [i], 840, 130)) this.add(i, d, x, 440); }
          this.fireI++;
        }
        if (P > this.order.length * per + 1.0) { if (!this.done) this.newRound(); }
        break;
      }
    }
  }
  cpuInput(i) {
    const inp = emptyIn();
    if (this.ph !== 'choose' || this.sel[i] >= 0 || this.pt < this.cpuT[i]) return inp;
    const free = [0, 1, 2, 3, 4].filter((k) => !this.sel.includes(k));
    if (!free.length) return inp;
    let k;
    if (Math.random() < LV(this.lv(i))) {
      free.sort((a, b) => this.ends[this.trace(b).end] - this.ends[this.trace(a).end]);
      k = free[0];
    } else k = pick(free);
    inp.k = k + 1;
    return inp;
  }
  state() {
    const ride = this.ph === 'ride' || this.ph === 'fire';
    return {
      ...this.head(), ph: this.ph, pt: Math.round(this.pt * 100) / 100, rd: this.round,
      rg: this.rg.map((r) => r.l * 1000 + r0(r.y)), en: this.ends.slice(), sel: this.sel.slice(), cur: this.cur.slice(),
      pa: ride ? this.sel.map((k) => this.trace(k).pts.map((p) => r0(p[0]) * 1000 + r0(p[1]))) : [],
      rs: ride ? this.res.slice() : [], fi: this.fireI, od: ride ? this.order.slice() : [],
    };
  }
  static render(g, s, v) {
    grad(g, 0, 540, '#2a0a05', '#7a2a10');
    // 火山
    for (const [x, h] of [[120, 160], [860, 200]]) { g.fillStyle = '#3a1a10'; g.beginPath(); g.moveTo(x - 140, 300); g.lineTo(x - 30, 300 - h); g.lineTo(x + 30, 300 - h); g.lineTo(x + 140, 300); g.fill(); circle(g, x, 300 - h, 20 + Math.sin(v.t * 3) * 4, '#ff7a1a'); }
    g.fillStyle = '#4a2a1a'; g.fillRect(0, 300, 960, 240);
    const ph = s.ph, P = s.pt + (v.since || 0);
    const rg = L(s.rg).map((r) => ({ l: Math.floor(r / 1000), y: r % 1000 }));
    // 線路
    for (let k = 0; k < 5; k++) { g.strokeStyle = '#a07a50'; g.lineWidth = 8; g.beginPath(); g.moveTo(LX(k), TOP); g.lineTo(LX(k), BOT); g.stroke(); }
    const hide = ph === 'choose';
    rg.forEach((r) => { g.strokeStyle = '#a07a50'; g.lineWidth = 8; g.beginPath(); g.moveTo(LX(r.l), r.y); g.lineTo(LX(r.l + 1), r.y); g.stroke(); circle(g, LX(r.l), r.y, 6, '#5a3a20'); circle(g, LX(r.l + 1), r.y, 6, '#5a3a20'); });
    if (hide) {
      rr(g, 190, TOP + 12, 580, BOT - TOP - 24, 18); g.fillStyle = '#2a140a'; g.fill();
      txt(g, '？', 480, (TOP + BOT) / 2, { size: 80, col: '#7a5a40', stroke: null });
    }
    if (ph === 'show') { const left = Math.max(0, 3.2 - P); txt(g, `分かれ道をおぼえよう！ ${left.toFixed(1)}`, 480, 140, { size: 22, col: '#ffe14d' }); }
    // ゴール
    const en = L(s.en);
    const fi = s.fi || 0, od = L(s.od), rs = L(s.rs);
    en.forEach((t, k) => {
      const x = LX(k), y = BOT + 28;
      const reveal = ph === 'show' || ph === 'choose' || ph === 'ride' || ph === 'fire';
      if (!reveal) return;
      if (t === 0) { circle(g, x, y + 4, 26, '#111', '#555', 3); circle(g, x - 8, y - 4, 6, '#fff'); txt(g, 'ノンノン', x, y + 44, { size: 13 }); }
      else { rr(g, x - 24, y - 16, 48, 38, 8); g.fillStyle = t === 2 ? '#ffd23c' : '#6a6f78'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#222'; g.stroke(); circle(g, x, y - 18, 12, '#222'); txt(g, t === 2 ? '金 +3' : '+1', x, y + 44, { size: 13, col: t === 2 ? '#ffe14d' : '#fff' }); }
    });
    // ボス
    const dead = s.done ? v.t - s.dT : -1;
    const bx = 860, by = 130 + Math.abs(Math.sin(v.t * 3)) * -20 + (s.ang ? Math.sin(v.t * 20) * 3 : 0);
    if (dead < 0.9) {
      g.strokeStyle = '#555'; g.lineWidth = 5; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + 40, 260); g.stroke(); g.setLineDash([]);
      rr(g, bx + 32, 250, 16, 40, 4); g.fillStyle = '#7a5a3a'; g.fill();
      const dx = dead > 0 ? dead * 300 : 0;
      circle(g, bx + dx, by - dx * 0.6, 62, s.ang ? '#2a0a0a' : '#151515', '#000', 4);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(bx - 20 + dx, by - 24 - dx * 0.6, 14, 0, 7); g.fill();
      bossLabel(g, bx, 215, 'ノンノン', s.ang);
    }
    // トロッコとプレイヤー
    const sel = L(s.sel), pa = L(s.pa);
    const n = L(s.sc).length;
    for (let k = 0; k < 5; k++) {
      const x = LX(k);
      const who = sel.indexOf(k);
      if ((ph === 'ride' || ph === 'fire') && who >= 0) continue;
      rr(g, x - 30, TOP - 36, 60, 30, 6); g.fillStyle = '#7a5030'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#2a1a10'; g.stroke();
      txt(g, String(k + 1), x, TOP - 52, { size: 20, col: '#ffe14d' });
      if (who >= 0 && (ph !== 'choose' || who === v.me || true)) drawChar(g, x, TOP - 46, who, v.slots[who].ci, { r: 15 });
      if (ph === 'choose' && v.me >= 0 && sel[v.me] < 0 && L(s.cur)[v.me] === k) txt(g, '▼', x, TOP - 92, { size: 24, col: PCOL[v.me] });
    }
    if (ph === 'ride' || ph === 'fire') {
      pa.forEach((pp, i) => {
        const pts = L(pp).map((q) => [Math.floor(q / 1000), q % 1000]);
        if (!pts.length) return;
        let len = 0; const seg = []; for (let k = 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); seg.push(d); len += d; }
        const t = ph === 'ride' ? ease(P / 2.6) : 1;
        let want = t * len, k = 0;
        while (k < seg.length && want > seg[k]) { want -= seg[k]; k++; }
        let x, y; if (k >= seg.length) [x, y] = pts[pts.length - 1]; else { const f = seg[k] ? want / seg[k] : 0; x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f; y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f; }
        g.strokeStyle = PCOL[i]; g.lineWidth = 4; g.globalAlpha = 0.6; g.beginPath(); pts.forEach((p) => g.lineTo(p[0], p[1])); g.stroke(); g.globalAlpha = 1;
        rr(g, x - 24, y - 12, 48, 24, 6); g.fillStyle = '#7a5030'; g.fill();
        drawChar(g, x, y - 20, i, v.slots[i].ci, { r: 14 });
      });
      if (ph === 'fire') od.forEach((i, j) => {
        const t = (P - j * 0.75) / 0.75; if (t < 0 || t > 1.2) return;
        const e = rs[i], typ = en[e], x0 = LX(e), y0 = BOT + 10;
        if (typ === 0) { if (t < 1) boom(g, x0, y0 - 20, t, 50); return; }
        const x = x0 + (bx - x0) * Math.min(1, t), y = y0 + (by - y0) * Math.min(1, t) - Math.sin(Math.min(1, t) * Math.PI) * 120;
        circle(g, x, y, typ === 2 ? 16 : 11, typ === 2 ? '#ffd23c' : '#222', '#fff', 2);
        if (t > 0.9) boom(g, bx, by, (t - 0.9) * 4, 60);
      });
    }
    if (dead > 0) boom(g, bx, by, dead, 120);
    if (ph === 'choose') txt(g, `トロッコをえらべ！ のこり ${Math.max(0, Math.ceil(10 - P))}`, 480, 100, { size: 22 });
    void n;
  }
}
