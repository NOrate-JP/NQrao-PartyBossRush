// ===== Firebase（匿名ログイン＋Realtime Database）=====
import { firebaseConfig } from './firebase-config.js';

const V = '10.12.2';
let F = null; // { db, uid, fns }

export function hasConfig() { return !!(firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR') && firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes('YOUR')); }

export async function connect() {
  if (F) return F;
  const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const auth = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const dbm = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
  const a = app.initializeApp(firebaseConfig);
  const au = auth.getAuth(a);
  const cred = await auth.signInAnonymously(au);
  const db = dbm.getDatabase(a);
  F = { db, uid: cred.user.uid, m: dbm };
  return F;
}

const clean = (o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v) ? 0 : v)));
// Realtime DB は配列を {0:..,1:..} にすることがあるので配列に戻す
export function norm(v) {
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (ks.length && ks.every((k) => /^\d+$/.test(k))) { const a = []; ks.forEach((k) => { a[+k] = norm(v[k]); }); for (let i = 0; i < a.length; i++) if (a[i] === undefined) a[i] = 0; return a; }
    const o = {}; ks.forEach((k) => { o[k] = norm(v[k]); }); return o;
  }
  return v;
}

const CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export class Room {
  constructor(code) { this.code = code; this.unsubs = []; }
  r(p = '') { return F.m.ref(F.db, `nbr/${this.code}${p ? '/' + p : ''}`); }
  static async create(me) {
    const { m, uid } = F;
    let code, ok = false;
    for (let t = 0; t < 8 && !ok; t++) {
      code = Array.from({ length: 5 }, () => CH[Math.floor(Math.random() * CH.length)]).join('');
      const s = await m.get(m.ref(F.db, `nbr/${code}/meta`));
      ok = !s.exists();
    }
    const room = new Room(code);
    await m.set(room.r(), {
      meta: { host: uid, st: 'lobby', at: m.serverTimestamp(), course: 'all', lv: 1, total: 4 },
      players: { [uid]: { name: me.name, ci: me.ci, t: Date.now() } },
    });
    m.onDisconnect(room.r()).remove();
    room.isHost = true;
    return room;
  }
  static async join(code, me) {
    const { m, uid } = F;
    code = code.trim().toUpperCase();
    const s = await m.get(m.ref(F.db, `nbr/${code}`));
    if (!s.exists()) throw new Error('ルームが見つかりません');
    const v = s.val();
    if (v.meta.st !== 'lobby') throw new Error('このルームはプレイ中です');
    const ps = v.players || {};
    if (!ps[uid] && Object.keys(ps).length >= 4) throw new Error('ルームが満員です（4人まで）');
    const room = new Room(code);
    await m.set(room.r(`players/${uid}`), { name: me.name, ci: me.ci, t: Date.now() });
    m.onDisconnect(room.r(`players/${uid}`)).remove();
    m.onDisconnect(room.r(`inputs/${uid}`)).remove();
    room.isHost = v.meta.host === uid;
    return room;
  }
  on(path, cb) { const u = F.m.onValue(this.r(path), (s) => cb(norm(s.val()))); this.unsubs.push(u); return u; }
  set(path, v) { return F.m.set(this.r(path), clean(v)); }
  update(path, v) { return F.m.update(this.r(path), clean(v)); }
  get uid() { return F.uid; }
  async leave() {
    this.unsubs.forEach((u) => u()); this.unsubs = [];
    try {
      if (this.isHost) await F.m.remove(this.r());
      else { await F.m.remove(this.r(`players/${F.uid}`)); await F.m.remove(this.r(`inputs/${F.uid}`)); }
    } catch (e) { /* noop */ }
  }
}
