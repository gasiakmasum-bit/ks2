// Синтезовані звуки на Web Audio — без жодних зовнішніх файлів.
const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
let ctx = null, out = null, noise = null, on = true, lastSlide = 0;

export const setSound = v => { on = !!v; };

function ac() {
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      out = ctx.createGain(); out.gain.value = .9;
      out.connect(comp); comp.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Тон з обвідною; lp:[від,до] — ковзний lowpass
function osc(c, { type = 'sine', f = 440, to, t = 0, d = .1, v = .2, a = .004, lp }) {
  const t0 = c.currentTime + t, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + a);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g);
  let last = g;
  if (lp) {
    const fl = c.createBiquadFilter(); fl.type = 'lowpass';
    fl.frequency.setValueAtTime(lp[0], t0); fl.frequency.exponentialRampToValueAtTime(lp[1], t0 + d);
    g.connect(fl); last = fl;
  }
  last.connect(out); o.start(t0); o.stop(t0 + d + .03);
}

// Шумовий «клац/свист»
function hiss(c, { t = 0, d = .05, v = .1, type = 'bandpass', f = 2000, to, q = 1 }) {
  const t0 = c.currentTime + t, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t0);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  s.connect(fl); fl.connect(g); g.connect(out);
  s.start(t0, Math.random() * .5); s.stop(t0 + d + .03);
}

const S = {
  hover: c => osc(c, { f: 2400, d: .025, v: .025 }),
  click: c => { osc(c, { type: 'triangle', f: 1200, to: 700, d: .05, v: .1 }); hiss(c, { d: .015, v: .05, f: 4000 }); },
  tick: (c, r = .5) => osc(c, { type: 'triangle', f: 500 + r * 900, d: .035, v: .07 }),
  select: c => { osc(c, { type: 'triangle', f: 620, d: .07, v: .13 }); osc(c, { type: 'triangle', f: 930, t: .05, d: .1, v: .13 }); },
  deselect: c => { osc(c, { type: 'triangle', f: 930, d: .06, v: .1 }); osc(c, { type: 'triangle', f: 620, t: .045, d: .09, v: .1 }); },
  pick: c => {
    hiss(c, { d: .03, v: .12, f: 3000 });
    osc(c, { type: 'square', f: 440, d: .07, v: .05, lp: [3000, 800] });
    osc(c, { type: 'square', f: 660, t: .06, d: .12, v: .05, lp: [3000, 800] });
    osc(c, { f: 110, to: 70, d: .12, v: .2 });
  },
  coin: c => { osc(c, { f: 1318, d: .12, v: .14 }); osc(c, { f: 1976, t: .08, d: .5, v: .15 }); osc(c, { type: 'triangle', f: 3952, t: .08, d: .3, v: .04 }); },
  sell: c => {
    hiss(c, { type: 'highpass', f: 5000, d: .08, v: .08 });
    [[2093, 0, .5], [2637, .06, .6], [3136, .12, .7]].forEach(([f, t, d], i) => osc(c, { f, t, d, v: .13 - i * .02 }));
  },
  buy: c => {
    hiss(c, { type: 'highpass', f: 5000, d: .06, v: .09 });
    osc(c, { f: 110, to: 70, d: .12, v: .2 });
    [880, 1318, 1760, 2349].forEach((f, i) => osc(c, { type: 'triangle', f, t: .05 + i * .07, d: .35, v: .12 }));
  },
  start: c => {
    osc(c, { type: 'sawtooth', f: 120, to: 520, d: .55, v: .07, lp: [300, 3200] });
    osc(c, { f: 70, to: 45, d: .25, v: .3 });
    hiss(c, { type: 'lowpass', f: 800, d: .12, v: .12 });
  },
  stop: c => { osc(c, { f: 140, to: 50, d: .3, v: .35 }); hiss(c, { type: 'lowpass', f: 600, d: .1, v: .15 }); },
  win: (c, tier = .3) => {
    const n = [523.25, 659.25, 783.99, 1046.5].concat(tier > .5 ? [1318.5, 1568] : []);
    n.forEach((f, i) => { osc(c, { type: 'triangle', f, t: i * .08, d: .4, v: .15 }); osc(c, { type: 'square', f, t: i * .08, d: .25, v: .03, lp: [4000, 900] }); });
    [261.6, 329.6, 392, 523.3].forEach(f => osc(c, { type: 'sawtooth', f, t: .3, d: 1.2 + tier, v: .035, a: .05, lp: [4000, 600] }));
    osc(c, { f: 55, to: 40, d: .6, v: .35 });
    for (let i = 0; i < 6 + tier * 8; i++) osc(c, { f: 2000 + Math.random() * 3000, t: .25 + Math.random() * .9, d: .12, v: .04 });
  },
  lose: c => {
    osc(c, { type: 'sawtooth', f: 220, to: 90, d: .55, v: .12, lp: [1800, 200] });
    osc(c, { f: 80, to: 40, d: .4, v: .3 });
    osc(c, { type: 'square', f: 164, to: 110, t: .15, d: .35, v: .05, lp: [900, 200] });
    hiss(c, { type: 'lowpass', f: 700, d: .2, v: .1 });
  },
  deny: c => { osc(c, { type: 'square', f: 180, d: .08, v: .07, lp: [1500, 300] }); osc(c, { type: 'square', f: 180, t: .1, d: .08, v: .07, lp: [1500, 300] }); },
  on: c => { osc(c, { type: 'triangle', f: 700, d: .06, v: .12 }); osc(c, { type: 'triangle', f: 1050, t: .06, d: .1, v: .12 }); },
  off: c => { osc(c, { type: 'triangle', f: 1050, d: .06, v: .12 }); osc(c, { type: 'triangle', f: 700, t: .06, d: .1, v: .12 }); },
  reset: c => { hiss(c, { f: 3000, to: 300, d: .4, v: .15 }); osc(c, { f: 400, to: 100, d: .35, v: .08 }); },
};

export function sfx(name, ...a) {
  if (!on) return;
  const c = ac(); if (!c) return;
  try { S[name]?.(c, ...a); } catch {}
}
sfx.slide = r => { const n = performance.now(); if (n - lastSlide < 45) return; lastSlide = n; sfx('tick', r); };

// Кубічна крива cubic-bezier(.12,.62,.08,1) — та сама, що в CSS супутника
const bez = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;

// Тріск «храповика»: тік щоразу, коли супутник проходить сектор; темп повторює уповільнення
export function spinTicks(total, dur, step = 15) {
  if (!on || total <= 0) return;
  const c = ac(); if (!c) return;
  let prev = -1;
  for (let k = 1; k <= Math.floor(total / step); k++) {
    const y = k * step / total; let lo = 0, hi = 1;
    for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; bez(m, .62, 1) < y ? lo = m : hi = m; }
    const t = bez((lo + hi) / 2, .12, .08) * dur;
    if (t - prev < .022) continue;
    prev = t;
    const p = t / dur, f = 900 + 1400 * (1 - p), v = .045 + .06 * p;
    osc(c, { type: 'triangle', f, to: f * .55, t, d: .04, v });
    hiss(c, { t, d: .015, v: v * .8, f: 4500 });
  }
}
