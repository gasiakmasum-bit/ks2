import skins from '../data/skins.json';
import casesData from '../data/cases.json';
import { NAMES, GROUPS } from '../data/caseNames.js';

export const EDGE = 0.95, MAXCH = 95, KEY = 'orbita1';
export const r2 = n => Math.round(n * 100) / 100;
export const f2 = n => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const splitName = n => { const a = n.split(' | '); return a.length > 1 ? [a[0], a.slice(1).join(' | ')] : ['', n]; };

// Категорії каталогу (ключ у skins.json → підпис)
export const CATS = {
  skin: 'Скіни', sticker: 'Стікери', crate: 'Кейси й капсули', charm: 'Брелоки', agent: 'Агенти', patch: 'Патчі',
  music: 'Музика', graffiti: 'Графіті', coll: 'Монети й значки', highlight: 'Хайлайти', tool: 'Інструменти',
};

// Орієнтовна ціна за категорією й рідкістю (якщо Skinport недоступний)
const BASE = {
  sticker: { 'high grade': .05, remarkable: .15, exotic: .5, extraordinary: 2, contraband: 5000 },
  graffiti: { 'base grade': .04, 'high grade': .1, remarkable: .5, exotic: 1.2 },
  charm: { 'high grade': 2, remarkable: 5, exotic: 15, extraordinary: 60 },
  agent: { distinguished: 3, exceptional: 8, superior: 20, master: 60 },
  patch: { 'high grade': 1.5, remarkable: 4, exotic: 15 },
};
const FLAT = { crate: 2, music: 5, coll: 5, highlight: 1.5, tool: 2 };
function fallback(n, r, cat) {
  const l = r.toLowerCase();
  let base;
  if (BASE[cat]) base = BASE[cat][l] ?? 1;
  else if (FLAT[cat]) base = FLAT[cat];
  else if (n.startsWith('★') && !l.includes('extraord')) base = 250;
  else base = l.includes('consumer') ? .1 : l.includes('industrial') ? .4 : l.includes('mil') ? 2 :
    l.includes('restricted') ? 8 : l.includes('classified') ? 35 : l.includes('contraband') ? 5000 :
    l.includes('extraord') ? 400 : 150;
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return r2(Math.max(.03, base * (.5 + (h % 1000) / 1000 * 2)));
}

// Усі предмети з фото (m — URL зображення, cat — категорія)
const full = u => { const k = u.indexOf(':'); return k > 0 && k < 3 && /^\d$/.test(u[0]) ? skins.p[+u[0]] + u.slice(k + 1) : u; };
export const CATALOG = skins.i.map(([n, r, m, cat]) => ({ n, r, m: full(m), cat, col: skins.c[r] || '#8899aa', p: fallback(n, r, cat), nl: n.toLowerCase() }));
export const strip = o => ({ n: o.n, m: o.m, col: o.col, p: o.p, c: o.cat });

export async function loadPrices() {
  try {
    const q = '/v1/items?app_id=730&currency=EUR';
    let a = null;
    for (const u of ['/skinport' + q, 'https://api.skinport.com' + q]) {
      try { const r = await fetch(u); if (r.ok) { a = await r.json(); if (Array.isArray(a)) break; } } catch {}
    }
    if (!Array.isArray(a)) return '';
    const m = {};
    a.forEach(x => {
      if (x.min_price == null || /StatTrak|Souvenir/.test(x.market_hash_name)) return;
      const b = x.market_hash_name.replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/, '');
      (m[b] = m[b] || []).push(x.min_price);
    });
    let hit = 0;
    CATALOG.forEach(k => {
      const v = m[k.n];
      if (v) { k.p = r2(Math.max(.03, v.reduce((s, x) => s + x) / v.length)); hit++; }
    });
    return hit ? `ціни Skinport (${hit} скінів), у ₵` : '';
  } catch { return ''; }
}

export const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, '0')).join('');
export async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
// Чесний результат: випадкове число з хешу; виграш, якщо стрілка в зоні шансу навколо низу кола
export async function rollFor(seed, clientSeed, n, chance) {
  const h = await sha(`${seed}:${clientSeed}:${n}`);
  const roll = parseInt(h.slice(0, 8), 16) / 4294967296 * 100;
  return { roll, win: Math.min(roll, 100 - roll) < chance / 2 };
}

export function fresh() {
  const lo = CATALOG.filter(k => k.cat === 'skin' && k.p > .4 && k.p < 8);
  return { bal: 0, inv: [1, 2, 3].map(id => ({ id, ...strip(lo[Math.random() * lo.length | 0]) })),
    hist: [], bonus: 0, uid: hex(4), nid: 4, n: 0, ups: 0, snd: true, fast: false };
}
export function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.inv) return s.uid ? s : { ...s, uid: hex(4) }; } catch {}
  return fresh();
}
export const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };

// Демонстраційна стрічка (не реальні гравці)
export function makeFeed() {
  const pool = CATALOG.map((k, x) => ({ k, x })).filter(o => o.k.p > .5 && o.k.p < 1500);
  return Array.from({ length: 10 }, () => ({ k: pool[Math.random() * pool.length | 0].x, ch: 3 + Math.random() * 85, w: Math.random() < .5 }));
}


// ───────── Кейси ─────────
// Офіційні шанси CS2 за рідкістю; всередині рідкості всі предмети рівноймовірні
export const TIERS = [
  { k: 0, n: 'Mil-Spec Grade', label: 'Армійська якість', p: 79.92, col: '#4b69ff' },
  { k: 1, n: 'Restricted', label: 'Обмежена', p: 15.98, col: '#8847ff' },
  { k: 2, n: 'Classified', label: 'Засекречена', p: 3.2, col: '#d32ce6' },
  { k: 3, n: 'Covert', label: 'Таємна', p: 0.64, col: '#eb4b4b' },
  { k: 4, n: 'Rare Special', label: 'Рідкісна ★ (ножі, рукавиці)', p: 0.26, col: '#ffd700' },
];
export const RTP = 0.9; // ціна кейса = середня вартість дропу / RTP
const BYN = new Map(CATALOG.filter(k => k.cat === 'skin').map(k => [k.n, k]));
export const CASES = casesData.c.map(([n, img, d, it, ra], id) => {
  const tiers = [[], [], [], [], []];
  it.forEach(([nm, t]) => { const k = BYN.get(nm); if (k) tiers[t].push(k); });
  tiers[4] = ra.map(nm => BYN.get(nm)).filter(Boolean);
  return { id, n: NAMES[n] || n, o: n, g: GROUPS.find(g => g.names.includes(n))?.id || 'mid', d, m: full(img), tiers };
}).filter(c => c.tiers.every(t => t.length));

// Усе, що можна порахувати для кейса: шанси предметів, EV, ціна, шанс окупитись
export function caseStats(c) {
  const items = TIERS.flatMap(t => c.tiers[t.k].map(k => ({ k, t, p: t.p / c.tiers[t.k].length })));
  const ev = items.reduce((s, o) => s + o.p / 100 * o.k.p, 0);
  const price = r2(Math.max(.1, ev / RTP));
  const win = items.filter(o => o.k.p >= price).reduce((s, o) => s + o.p, 0);
  return { items, ev: r2(ev), price, win, max: Math.max(...items.map(o => o.k.p)) };
}

// Чесний дроп: SHA-256(сід:клієнтський сід:c<номер>) → перші 8 hex = рідкість, наступні 8 hex = предмет
export async function rollCase(seed, cseed, nonce, c) {
  const h = await sha(`${seed}:${cseed}:c${nonce}`);
  const a = parseInt(h.slice(0, 8), 16) / 4294967296 * 100, b = parseInt(h.slice(8, 16), 16) / 4294967296;
  let acc = 0, t = 0;
  for (const k of [4, 3, 2, 1, 0]) { acc += TIERS[k].p; if (a < acc) { t = k; break; } }
  const list = c.tiers[t];
  return { a, b, t, k: list[Math.floor(b * list.length)], h };
}

// Стрічка рулетки: лише візуал (рідкісні трохи частіші, щоб було цікаво дивитись); переможець стоїть на місці `at`
export function mkTiles(c, win, n = 64, at = 50) {
  const W = [50, 28, 13, 6, 3];
  const a = Array.from({ length: n }, () => {
    let x = Math.random() * 100, t = 0; for (; t < 4 && x >= W[t]; t++) x -= W[t];
    const l = c.tiers[t]; return { k: l[Math.random() * l.length | 0], t };
  });
  if (win) a[at] = win;
  return a;
}

export { GROUPS };
