// ===== 効果音（WebAudioで合成。音声ファイルなし） =====
let ac = null, master = null, muted = false;
export function unlock() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.25; master.connect(ac.destination); } catch (e) { return; } }
  if (ac.state === 'suspended') ac.resume();
}
export function setMute(m) { muted = m; }
export function isMuted() { return muted; }
function tone(f, d, type = 'square', v = 0.5, t0 = 0, slide = 0) {
  if (!ac || muted) return;
  const t = ac.currentTime + t0, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d);
  gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(gn); gn.connect(master); o.start(t); o.stop(t + d + 0.02);
}
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const last = {};
export function sfx(name) {
  if (!ac || muted) return;
  const now = performance.now(); if (last[name] && now - last[name] < 50) return; last[name] = now;
  switch (name) {
    case 'start': [72, 76, 79, 84].forEach((n, i) => tone(N(n), 0.18, 'square', 0.35, i * 0.1)); break;
    case 'finish': [79, 84, 88, 91, 96].forEach((n, i) => tone(N(n), i === 4 ? 0.5 : 0.14, 'square', 0.35, i * 0.09)); break;
    case 'hit': tone(N(52), 0.12, 'sawtooth', 0.35, 0, 0.5); tone(N(76), 0.08, 'square', 0.15); break;
    case 'coin': tone(N(88), 0.06, 'square', 0.25); tone(N(93), 0.16, 'square', 0.25, 0.06); break;
    case 'ouch': tone(N(60), 0.25, 'triangle', 0.5, 0, 0.4); break;
    case 'angry': [55, 54, 53, 52].forEach((n, i) => tone(N(n), 0.22, 'sawtooth', 0.35, i * 0.16)); break;
    case 'ok': tone(N(84), 0.08, 'square', 0.25); break;
    case 'result': [67, 71, 74, 79, 74, 79].forEach((n, i) => tone(N(n), 0.16, 'triangle', 0.4, i * 0.12)); break;
    case 'champ': [72, 72, 72, 76, 79, 76, 79, 84].forEach((n, i) => tone(N(n), 0.2, 'square', 0.3, i * 0.15)); break;
    case 'tick': tone(N(96), 0.03, 'square', 0.12); break;
  }
}
