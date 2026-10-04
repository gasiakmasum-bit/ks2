import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Feed from './components/Feed.jsx';
import Gauge from './components/Gauge.jsx';
import SkinCard from './components/SkinCard.jsx';
import Photo from './components/Photo.jsx';
import Cases from './components/Cases.jsx';
import { CATALOG, CATS, EDGE, MAXCH, f2, r2, hex, sha, rollFor, strip, load, save, fresh, loadPrices, makeFeed } from './lib/game.js';
import { boom, reduced } from './lib/fx.js';
import { sfx, setSound, spinTicks } from './lib/sound.js';

export default function App() {
  const [S, setS] = useState(load);
  const [sel, setSel] = useState(new Set());
  const [tgt, setTgt] = useState(null);
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lock, setLock] = useState(null);
  const [bet, setBet] = useState(0);
  const [seed, setSeed] = useState({ s: '', h: '' });
  const [spin, setSpin] = useState({ rot: 0, dur: 0 });
  const [desc, setDesc] = useState(true);
  const [f, setF] = useState({ q: '', lo: '', hi: '', cat: '' });
  const [src, setSrc] = useState('орієнтовні ціни за рідкістю');
  const [feed, setFeed] = useState(makeFeed);
  const [tick, force] = useState(0);
  const [tab, setTab] = useState('inv');
  const [scr, setScr] = useState('up');
  const [cart, setCart] = useState(new Map());
  const [sf, setSf] = useState({ q: '', lo: '', hi: '', cat: '', desc: false, ok: false });
  const [pg, setPg] = useState(0);
  const [toast, setToast] = useState(null);
  const [atShelf, setAtShelf] = useState(false);
  const shelfRef = useRef(null);
  const cs = useRef(hex(4)), cv = useRef(null);

  const newSeed = async () => { const s = hex(16); setSeed({ s, h: await sha(s) }); };
  useEffect(() => { save(S); }, [S]);
  useEffect(() => { setSound(S.snd); }, [S.snd]);
  // Яка секція зараз на екрані — для підсвітки в навігації
  useEffect(() => {
    let id = 0;
    const f = () => { id = 0; const r = shelfRef.current?.getBoundingClientRect(); setAtShelf(!!r && r.top < innerHeight * .55); };
    const on = () => { if (!id) id = requestAnimationFrame(f); };
    f(); addEventListener('scroll', on, { passive: true });
    return () => { removeEventListener('scroll', on); cancelAnimationFrame(id); };
  }, []);
  const goNav = id => {
    const behavior = reduced() ? 'auto' : 'smooth';
    if (id === 'cases') { setScr('cases'); scrollTo({ top: 0, behavior: 'auto' }); return; }
    if (id === 'up') { setScr('up'); requestAnimationFrame(() => scrollTo({ top: 0, behavior })); return; }
    setTab(id); setScr('up');
    requestAnimationFrame(() => requestAnimationFrame(() => shelfRef.current?.scrollIntoView({ behavior, block: 'start' })));
  };
  // Глобальні звуки інтерфейсу: наведення та клік
  useEffect(() => {
    let lastEl = null, lastT = 0;
    const over = e => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const el = e.target.closest?.('button:not(:disabled),.c') || null;
      if (el === lastEl) return;
      lastEl = el;
      const n = performance.now();
      if (el && n - lastT > 45) { lastT = n; sfx('hover'); }
    };
    const click = e => {
      const b = e.target.closest?.('button');
      if (b && !b.disabled && b.dataset.sfx !== 'off') sfx('click');
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('click', click, true);
    return () => { document.removeEventListener('pointerover', over); document.removeEventListener('click', click, true); };
  }, []);
  useEffect(() => { newSeed(); loadPrices().then(t => { if (t) setSrc(t); force(x => x + 1); }); }, []);

  const b = Math.min(bet, S.bal);
  const chosen = S.inv.filter(i => sel.has(i.id));
  const st = r2(b + chosen.reduce((t, i) => t + i.p, 0));
  const tIdx = busy ? tgt : (tgt != null && CATALOG[tgt].p > st ? tgt : null);
  const ch = tIdx == null || !st ? 0 : Math.min(MAXCH, st / CATALOG[tIdx].p * 100 * EDGE);
  const view = busy && lock ? lock : { ch, st, items: chosen, b };

  // Каталог ~18 тис. предметів: сортуємо за ціною один раз (при оновленні цін), далі лише фільтруємо
  const byPrice = useMemo(() => CATALOG.map((_, x) => x).sort((a, c) => CATALOG[a].p - CATALOG[c].p), [tick]);
  const dq = useDeferredValue(f.q), dsq = useDeferredValue(sf.q);

  const list = useMemo(() => {
    const q = dq.trim().toLowerCase(), lo = +f.lo || 0, hi = +f.hi || 1e9, n = byPrice.length, out = [];
    for (let i = 0; i < n && out.length < 60; i++) {
      const x = byPrice[desc ? n - 1 - i : i], k = CATALOG[x];
      if ((!st || k.p > st * 1.05) && k.p >= lo && k.p <= hi && (!f.cat || k.cat === f.cat) && (!q || k.nl.includes(q))) out.push({ k, x });
    }
    return out;
  }, [dq, f.lo, f.hi, f.cat, st, desc, byPrice]);

  const PER = 24;
  const shopList = useMemo(() => {
    const q = dsq.trim().toLowerCase(), lo = +sf.lo || 0, hi = +sf.hi || 1e9, n = byPrice.length, out = [];
    for (let i = 0; i < n; i++) {
      const x = byPrice[sf.desc ? n - 1 - i : i], k = CATALOG[x];
      if (k.p >= lo && k.p <= hi && (!sf.ok || k.p <= S.bal) && (!sf.cat || k.cat === sf.cat) && (!q || k.nl.includes(q))) out.push({ k, x });
    }
    return out;
  }, [dsq, sf.lo, sf.hi, sf.ok, sf.cat, sf.desc, S.bal, byPrice]);
  const pages = Math.max(1, Math.ceil(shopList.length / PER)), page = Math.min(pg, pages - 1);
  const shopView = shopList.slice(page * PER, page * PER + PER);
  const cartN = [...cart.values()].reduce((t, q) => t + q, 0);
  const cartTotal = r2([...cart].reduce((t, [x, q]) => t + CATALOG[x].p * q, 0));
  const short = r2(cartTotal - S.bal);
  const setShop = patch => { setSf(o => ({ ...o, ...patch })); setPg(0); };
  const MAXQ = 99;
  const qtyOf = x => cart.get(x) || 0;
  const addCart = (x, d) => {
    const q = Math.max(0, Math.min(MAXQ, qtyOf(x) + d));
    if (q === qtyOf(x)) return;
    sfx(d > 0 ? 'select' : 'deselect');
    setCart(c => { const n = new Map(c); q ? n.set(x, q) : n.delete(x); return n; });
  };
  const buy = toStake => {
    if (busy || !cartN) return;
    if (cartTotal > S.bal) { sfx('deny'); return; }
    const items = [...cart].flatMap(([x, q]) => Array.from({ length: q }, () => strip(CATALOG[x]))).map((o, k) => ({ id: S.nid + k, ...o }));
    setS(o => ({ ...o, bal: r2(o.bal - cartTotal), inv: [...o.inv, ...items], nid: o.nid + items.length }));
    setCart(new Map()); setLast(null); sfx('buy');
    setToast({ k: Date.now(), m: `Куплено: ${items.length} шт. за ${f2(cartTotal)} ₵` + (toStake ? ' — додано до ставки' : ' — вони у «Мої скіни»') });
    if (toStake) { setSel(o => new Set([...o, ...items.map(i => i.id)])); setTab('inv'); }
  };

  const toggle = id => { if (busy) return; sfx(sel.has(id) ? 'deselect' : 'select'); setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); setLast(null); };
  const pick = x => { if (busy) return; sfx('pick'); setTgt(x); setLast(null); };
  const sell = id => {
    if (busy) return;
    const i = S.inv.find(x => x.id === id); if (!i) return;
    sfx('sell');
    setS(s => ({ ...s, bal: r2(s.bal + i.p), inv: s.inv.filter(x => x.id !== id) }));
  };
  const near = p => {
    if (busy || !st) return;
    let best = null;
    CATALOG.forEach((k, x) => { if (k.p > st * 1.05 && (best == null || Math.abs(k.p - p) < Math.abs(CATALOG[best].p - p))) best = x; });
    if (best != null) pick(best);
  };

  async function play() {
    if (busy || !st || tIdx == null) return;
    const it = CATALOG[tIdx], my = seed.s, n = S.n + 1, fast = S.fast;
    sfx('start');
    if (innerWidth <= 760 && (document.querySelector('.dialcard')?.getBoundingClientRect().top ?? 0) < 0) scrollTo({ top: 0, behavior: 'auto' });
    setBusy(true); setLast(null); setLock({ ch, st, items: chosen, b });
    const { roll, win } = await rollFor(my, cs.current, n, ch);
    const dur = reduced() ? .5 : fast ? 1.2 : 5;
    setS(s => ({ ...s, n, bal: r2(s.bal - b), inv: s.inv.filter(i => !sel.has(i.id)) }));
    setSel(new Set()); setBet(0);
    const nr = (Math.ceil(spin.rot / 360) + (fast ? 2 : 5)) * 360 + roll * 3.6;
    setSpin({ rot: nr, dur });
    spinTicks(nr - spin.rot, dur);
    setTimeout(() => {
      setS(s => ({ ...s, ups: s.ups + 1, nid: win ? s.nid + 1 : s.nid, inv: win ? [...s.inv, { id: s.nid, ...strip(it) }] : s.inv,
        hist: [{ w: win, st, tn: it.n, ch, roll, seed: my, n }, ...s.hist].slice(0, 30) }));
      setFeed(fd => [{ k: tIdx, ch, w: win }, ...fd].slice(0, 12));
      setLast({ win, it, roll }); setTgt(null); setLock(null); setBusy(false);
      sfx('stop');
      navigator.vibrate?.(win ? [40, 50, 90] : 120);
      if (win) { const m = it.p / st; sfx('win', m >= 10 ? 1 : m >= 4 ? .6 : .25); boom(cv.current, it.col); } else sfx('lose');
      newSeed();
    }, dur * 1000 + 150);
  }

  const reset = () => { if (!busy && confirm('Почати спочатку? Прогрес буде втрачено.')) { sfx('reset'); setS(fresh()); setSel(new Set()); setTgt(null); setLast(null); setBet(0); } };
  const t = tIdx != null ? CATALOG[tIdx] : null;
  const cartMode = !busy && atShelf && tab === 'shop' && cartN > 0;
  const done = !busy && last && !st;
  const mult = t && view.st ? t.p / view.st : 0;
  const info = () => alert('Перед раундом показується SHA-256 хеш сіду, після раунду сід розкривається. Випадкове число = SHA-256(сід:клієнтський сід:номер раунду). Усе на віртуальних монетах.');

  return (
    <>
      <Header S={S} busy={busy} nav={scr === 'cases' ? 'cases' : atShelf && tab !== 'cat' ? tab : 'up'} onNav={goNav} onBonus={() => { sfx('coin'); setS(s => ({ ...s, bal: r2(s.bal + 50), bonus: Date.now() })); }}
        onInfo={info} onReset={reset}
        onSnd={() => { if (S.snd) sfx('off'); else { setSound(true); sfx('on'); } setS(s => ({ ...s, snd: !s.snd })); }} onFast={() => setS(s => ({ ...s, fast: !s.fast }))} />
      <Feed feed={feed} />

      <Cases hidden={scr !== 'cases'} S={S} setS={setS} seed={seed} newSeed={newSeed} cseed={cs.current} fx={cv} tick={tick} onInv={() => goNav('inv')} />

      <main className="stage" hidden={scr === 'cases'}>
        <section className={`dialcard hud${last && !last.win ? ' shake' : ''}`}>
          <Gauge ch={view.ch} mult={mult} rot={spin.rot} dur={spin.dur} />
          <div className="ctl">
            <label className="sl"><span>З балансу: <b>{f2(b)}</b> з {f2(S.bal)} ₵</span>
              <input type="range" min="0" max={S.bal} step="0.01" value={b} disabled={busy}
                onChange={e => { setBet(+e.target.value); setLast(null); sfx.slide(S.bal ? +e.target.value / S.bal : 0); }} />
            </label>
            <div className="chips">
              {[2, 4, 8].map(x => <button key={x} onClick={() => near(st * x)}>x{x}</button>)}
              {[35, 55, 75].map(p => <button key={p} onClick={() => near(st * 95 / p)}>{p}%</button>)}
            </div>
            <button className="go" data-sfx="off" aria-disabled={busy || !st || tIdx == null} onClick={() => (busy || !st || tIdx == null) ? (!busy && sfx('deny')) : play()}>
              <svg><use href="#up" /></svg>Апгрейд
            </button>
          </div>
        </section>

        <section className="flow">
          <div className="slot hud">
            <h3>Ваша ставка</h3>
            {view.st ? <>
              <p className="big-n">{f2(view.st)} ₵</p>
              <p className="mut">Предметів: {view.items.length}{view.b ? ` + баланс ${f2(view.b)}` : ''}</p>
              <div className="sel">{view.items.map(i => <SkinCard key={i.id} o={i} cls="mini" />)}</div>
            </> : <p className="empty">Познач скіни у «Мої скіни», купи нові в магазині або додай монети повзунком.</p>}
          </div>
          <div className="arrow"><svg><use href="#up" /></svg><b>{mult ? `x${mult.toFixed(2)}` : 'x—'}</b></div>
          <div className="slot to hud">
            {last ? <>
              <p className={`res ${last.win ? 'w' : 'l'}`}>{last.win ? 'Успіх' : 'Не пощастило'}</p>
              <Photo className="bigimg" style={{ '--g': last.it.col }} src={last.it.m} />
              <h3>{last.it.n}</h3><p className="mut">{f2(last.it.p)} ₵ · випало {last.roll.toFixed(2)}</p>
            </> : t ? <>
              <h3>Ціль</h3>
              <Photo className="bigimg" style={{ '--g': t.col }} src={t.m} />
              <h3>{t.n}</h3><p className="mut">{f2(t.p)} ₵</p>
            </> : <>
              <h3>Ціль</h3>
              <p className="empty">{st ? 'Обери предмет, дорожчий за ставку.' : 'Спершу склади ставку.'}</p>
              {st > 0 && <button className="ghost" onClick={() => setTab('cat')}>Обрати ціль</button>}
            </>}
          </div>
        </section>
      </main>

      <section className="shelf" ref={shelfRef} hidden={scr === 'cases'}>
        <div className="tabs">
          <button className={tab === 'inv' ? 'on' : ''} onClick={() => setTab('inv')}><span className="lg">Мої предмети</span><span className="sm">Предмети</span><span className="n"> · {S.inv.length}</span></button>
          <button className={tab === 'shop' ? 'on' : ''} onClick={() => setTab('shop')}>Магазин{cartN > 0 && <i className="cnt">{cartN}</i>}</button>
          <button className={tab === 'cat' ? 'on' : ''} onClick={() => setTab('cat')}><span className="lg">Ціль апгрейду</span><span className="sm">Ціль</span><span className="n big"> · {CATALOG.length}</span></button>
          {tab === 'cat' && <div className="filters">
            <input type="search" placeholder="Пошук" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
            <select value={f.cat} onChange={e => setF({ ...f, cat: e.target.value })} aria-label="Категорія"><option value="">Усі категорії</option>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input type="number" min="0" placeholder="від ₵" value={f.lo} onChange={e => setF({ ...f, lo: e.target.value })} />
            <input type="number" min="0" placeholder="до ₵" value={f.hi} onChange={e => setF({ ...f, hi: e.target.value })} />
            <button onClick={() => setDesc(d => !d)}>{desc ? 'Дорожчі ↓' : 'Дешевші ↑'}</button>
          </div>}
          {tab === 'inv' && <span className="mut total">{f2(S.inv.reduce((s, i) => s + i.p, 0))} ₵</span>}
        </div>
        {tab === 'shop' && <>
          <div className="shopbar">
            <input type="search" placeholder="Пошук" value={sf.q} onChange={e => setShop({ q: e.target.value })} />
            <select value={sf.cat} onChange={e => setShop({ cat: e.target.value })} aria-label="Категорія"><option value="">Усі категорії</option>{Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            <input type="number" min="0" placeholder="від ₵" value={sf.lo} onChange={e => setShop({ lo: e.target.value })} />
            <input type="number" min="0" placeholder="до ₵" value={sf.hi} onChange={e => setShop({ hi: e.target.value })} />
            <button className={`tg${sf.ok ? ' on' : ''}`} onClick={() => setShop({ ok: !sf.ok })}>Тільки по кишені</button>
            <button className="tg" onClick={() => setShop({ desc: !sf.desc })}>{sf.desc ? 'Дорожчі ↓' : 'Дешевші ↑'}</button>
            <span className="sp" />
            <button className="trash" title="Очистити кошик" disabled={!cartN} onClick={() => setCart(new Map())}>
              <svg className="ic" viewBox="0 0 24 24"><path className="s" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
            </button>
            {cartN > 0 && <button className="tg stake" disabled={busy || short > 0} data-sfx="off" onClick={() => buy(true)}>Купити й у ставку</button>}
            <button className={`buy${short > 0 && cartN ? ' short' : ''}`} data-sfx="off" aria-disabled={!cartN || busy} onClick={() => buy(false)}>
              <svg className="coin"><use href="#co" /></svg>{f2(cartTotal)}<span className="bl">Купити</span>
              {cartN > 0 && <i className="cnt">{cartN}</i>}
            </button>
          </div>
          {cartN > 0 && (short > 0
            ? <p className="mut warn">Не вистачає {f2(short)} ₵. Продай скін, забери бонус або прибери щось із кошика.</p>
            : <p className="mut">Після покупки залишиться {f2(S.bal - cartTotal)} ₵</p>)}
        </>}
        <div className="grid">
          {tab === 'inv'
            ? (S.inv.length ? S.inv.map(i => <SkinCard key={i.id} o={i} on={sel.has(i.id)} onClick={() => toggle(i.id)} sell={() => sell(i.id)} />)
              : <div className="empty"><p>Інвентар порожній. Купи скін у магазині або забери бонус.</p><button className="ghost" onClick={() => setTab('shop')}>Відкрити магазин</button></div>)
            : tab === 'shop'
            ? (shopView.length ? shopView.map(({ k, x }) => <SkinCard key={x} o={k} qty={qtyOf(x)} onQty={d => addCart(x, d)} onClick={() => addCart(x, 1)} />)
              : <p className="empty">Нічого не знайдено. Змін фільтри.</p>)
            : list.map(({ k, x }) => <SkinCard key={x} o={k} on={tIdx === x} badge={st ? Math.min(MAXCH, st / k.p * 95).toFixed(2) + '%' : undefined} onClick={() => pick(x)} />)}
        </div>
        {tab === 'shop' && <div className="pager">
          <button aria-label="Назад" disabled={page === 0} onClick={() => setPg(page - 1)}><svg className="ic" viewBox="0 0 24 24"><path className="s" d="m15 5-7 7 7 7" /></svg></button>
          <span className="mut">стор. {page + 1} з {pages} · {shopList.length} предметів</span>
          <button aria-label="Вперед" disabled={page >= pages - 1} onClick={() => setPg(page + 1)}><svg className="ic" viewBox="0 0 24 24"><path className="s" d="m9 5 7 7-7 7" /></svg></button>
        </div>}
      </section>

      <p className="mut hash">Хеш раунду (сід розкриється після спіну): <code>{seed.h}</code><br />Джерело цін: {src}</p>
      <footer>Orbita — симулятор. Монети віртуальні й не мають реальної вартості, вивід неможливий. Стрічка зверху частково демонстраційна. Дані предметів: CSGO-API.</footer>

      <div className={`mbar${cartMode ? ' cart' : ''}`} hidden={scr === 'cases'}>
        {cartMode ? <>
          <button className="trash" aria-label="Очистити кошик" onClick={() => setCart(new Map())}>
            <svg className="ic" viewBox="0 0 24 24"><path className="s" d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
          </button>
          {short <= 0 && <button className="tg" disabled={busy} data-sfx="off" onClick={() => buy(true)}>У ставку</button>}
          <button className={`buy${short > 0 ? ' short' : ''}`} data-sfx="off" aria-disabled={busy} onClick={() => buy(false)}>
            <svg className="coin"><use href="#co" /></svg>{f2(cartTotal)}<span className="bl">{short > 0 ? `−${f2(short)} ₵` : 'Купити'}</span><i className="cnt">{cartN}</i>
          </button>
        </> : <>
          <div className="mb-i">
            <b className={done ? (last.win ? 'w' : 'l') : ''}>{done ? (last.win ? 'УСПІХ' : 'ПРОВАЛ') : `${view.ch.toFixed(2)}%`}</b>
            <span>{done ? last.it.n : t ? `${mult ? `x${mult.toFixed(2)} · ` : ''}${t.n}` : st ? 'Обери ціль' : 'Склади ставку'}</span>
          </div>
          <button className="go" data-sfx="off" aria-disabled={busy || !st || tIdx == null} onClick={() => (busy || !st || tIdx == null) ? (!busy && sfx('deny')) : play()}>
            <svg><use href="#up" /></svg>Апгрейд
          </button>
        </>}
      </div>
      {toast && <div key={toast.k} className="toast">{toast.m}</div>}
      {last && <div key={S.n} className={`banner ${last.win ? 'w' : 'l'}`}><b>{last.win ? 'Апгрейд успішний' : 'Апгрейд провалено'}</b><span>{last.it.n}</span></div>}
      <canvas id="cf" ref={cv} />
    </>
  );
}
