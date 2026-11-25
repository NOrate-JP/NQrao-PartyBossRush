// ===== 入力（キーボード・マウス・タッチ）→ カウンタ付きの生入力 =====
import { W, H } from './engine.js';

export const raw = { l: 0, r: 0, u: 0, d: 0, a: 0, b: 0, Ac: 0, Bc: 0, Lc: 0, Rc: 0, Uc: 0, Dc: 0, Pc: 0, kc: 0, k: -1, px: -1, py: -1 };
let onChange = () => {};
export function setInputListener(fn) { onChange = fn; }
let enabled = false;
export function enableInput(v) { enabled = v; }

const KEYMAP = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
  KeyZ: 'a', Space: 'a', Enter: 'a', KeyJ: 'a', KeyX: 'b', ShiftLeft: 'b', ShiftRight: 'b', KeyK: 'b',
};
const CNT = { l: 'Lc', r: 'Rc', u: 'Uc', d: 'Dc', a: 'Ac', b: 'Bc' };

function press(key, repeat) {
  if (!repeat || key === 'l' || key === 'r' || key === 'u' || key === 'd') raw[CNT[key]]++;
  raw[key] = 1; onChange();
}
function release(key) { raw[key] = 0; onChange(); }

window.addEventListener('keydown', (e) => {
  if (!enabled) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); press(k, e.repeat); return; }
  const m = /^(Digit|Numpad)(\d)$/.exec(e.code);
  if (m && !e.repeat) { raw.k = +m[2]; raw.kc++; onChange(); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) release(k); });
window.addEventListener('blur', () => { for (const k of ['l', 'r', 'u', 'd', 'a', 'b']) raw[k] = 0; onChange(); });

export function bindCanvas(cv) {
  const pos = (cx, cy) => { const r = cv.getBoundingClientRect(); raw.px = Math.round(((cx - r.left) / r.width) * W); raw.py = Math.round(((cy - r.top) / r.height) * H); };
  cv.addEventListener('pointermove', (e) => { if (!enabled) return; pos(e.clientX, e.clientY); onChange(true); });
  cv.addEventListener('pointerdown', (e) => { if (!enabled) return; e.preventDefault(); pos(e.clientX, e.clientY); raw.Pc++; onChange(); });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
}

// タッチ用バーチャルパッド
export function setupTouchPad(root) {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  root.classList.add('show');
  root.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k;
    const down = (e) => { e.preventDefault(); if (!enabled) return; el.classList.add('on'); press(k, false); };
    const up = (e) => { e.preventDefault(); el.classList.remove('on'); release(k); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  });
}
