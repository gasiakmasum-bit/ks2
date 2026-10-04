import { useEffect, useMemo, useRef, useState } from 'react';
import Photo from './Photo.jsx';
import SkinCard from './SkinCard.jsx';
import { CASES, GROUPS, TIERS, RTP, caseStats, rollCase, mkTiles, strip, f2, r2, splitName } from '../lib/game.js';
import { boom, reduced } from '../lib/fx.js';
import { sfx, spinTicks } from '../lib/sound.js';

const pc = n => n >= 10 ? n.toFixed(2) : n >= 1 ? n.toFixed(3) : n.toFixed(4);
const one = n => n >= 1000 ? Math.round(n).toLocaleString('en-US') : n >= 100 ? Math.round(n) : n.toFixed(1);

// Стрічка-рулетка: плавно їде й зупиняється на заздалегідь визначеному предметі
function Reel({ tiles, win, jit, dur, go, done, mq, tick }) {
  const vp = useRef(null), tr = useRef(null);
  useEffect(() => {
    if (!go) return;
    const el = tr.current, v = vp.current; if (!el || !v) return;
    const w = el.children[0].offsetWidth, step = el.children[1].offsetLeft - el.children[0].offsetLeft;
    const fin = -(el.children[win].offsetLeft + w / 2 + jit * w - v.clientWidth / 2);
    el.style.transition = 'none'; el.style.transform = 'translateX(0)'; void el.offsetWidth;
    el.style.transition = `transform ${dur}s cubic-bezier(.12,.62,.08,1)`;
    el.style.transform = `translateX(${fin}px)`;
    if (tick) spinTicks(-fin, dur, step);
  }, [go]);
  const list = mq ? [...tiles, ...tiles] : tiles;
  return (
    <div className="cs-reel" ref={vp}>
      <i className="cs-mark" />
      <div className={`cs-tr${mq && !go ? ' mq' : ''}`} ref={tr}>
        {list.map(({ k, t }, i) => {
          const [w, s] = splitName(k.n);
          return (
            <div key={i} className={`rt${done ? (i === win ? ' hit' : ' dim') : ''}`} style={{ '--r': TIERS[t].col }}>
              <img src={k.m} alt="" decoding="async" referrerPolicy="no-referrer" />
              <s>{w || '★'}</s><b>{s}</b>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Cases({ S, setS, hidden, seed, newSeed, cseed, fx, tick, onInv }) {
  const [sel, setSel] = useState(null);
  const [qty, setQty] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('new');
  const [grp, setGrp] = useState('');
  const [run, setRun] = useState(null);
  const [sold, setSold] = useState(new Set());
  const [more, setMore] = useState(false);
  const topRef = useRef(null), reelsRef = useRef(null);

  const stats = useMemo(() => CASES.map(c => caseStats(c)), [tick]);
  const c = sel != null ? CASES[sel] : null, st = sel != null ? stats[sel] : null;
  const idle = useMemo(() => c ? mkTiles(c, null, 40) : [], [sel]);
  const busy = run && run.phase !== 'done';
  const cost = st ? r2(st.price * qty) : 0;

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const a = CASES.map((k, i) => ({ k, i })).filter(o => !t || o.k.n.toLowerCase().includes(t));
    if (sort === 'cheap') a.sort((x, y) => stats[x.i].price - stats[y.i].price);
    else if (sort === 'dear') a.sort((x, y) => stats[y.i].price - stats[x.i].price);
    else if (sort === 'new') a.reverse();
    return a;
  }, [q, sort, stats]);

  const choose = i => {
    if (busy) return;
    sfx('pick'); setSel(i); setRun(null); setSold(new Set()); setMore(false); setQty(1);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' }));
  };
  const back = () => { if (busy) return; sfx('click'); setSel(null); setRun(null); };

  async function open() {
    if (!c || busy) return;
    if (S.bal < cost) { sfx('deny'); return; }
    const base = S.cn || 0, my = seed.s, n = qty, fast = S.fast, sp = r2(st.price * n);
    sfx('start');
    setSold(new Set());
    setS(s => ({ ...s, bal: r2(s.bal - sp), cn: (s.cn || 0) + n }));
    setRun({ phase: 'shake', reels: [], key: Date.now() });
    // на телефоні рулетка під великим блоком кейса — підводимо її в центр екрана
    if (innerWidth <= 760) requestAnimationFrame(() => reelsRef.current?.scrollIntoView({ behavior: 'auto', block: 'center' }));
    const rolls = await Promise.all(Array.from({ length: n }, (_, i) => rollCase(my, cseed, base + i + 1, c)));
    const reels = rolls.map(r => ({ ...r, nonce: base + 1 + rolls.indexOf(r), tiles: mkTiles(c, { k: r.k, t: r.t }), jit: (Math.random() - .5) * .7 }));
    const dur = reduced() ? .5 : fast ? 2 : 6;
    await new Promise(r => setTimeout(r, reduced() ? 0 : 750));
    const sk = Date.now();
    setRun({ phase: 'spin', reels, dur, my, sp, key: sk });
    setTimeout(() => {
      const got = reels.map(r => ({ id: 'c' + r.nonce, ...strip(r.k), t: r.t, nonce: r.nonce }));
      const value = r2(got.reduce((t, o) => t + o.p, 0));
      setS(s => ({
        ...s, inv: [...s.inv, ...got.map(({ t, nonce, ...o }) => o)],
        cst: { n: (s.cst?.n || 0) + n, spent: r2((s.cst?.spent || 0) + sp), won: r2((s.cst?.won || 0) + value) },
      }));
      const best = Math.max(...reels.map(r => r.t));
      setRun({ phase: 'done', reels, dur, my, sp, got, value, best, key: sk });
      sfx('stop');
      if (best === 4) sfx('win', 1); else if (best === 3) sfx('win', .6); else if (best === 2) sfx('win', .25); else if (value >= sp) sfx('coin');
      navigator.vibrate?.(best >= 3 ? [40, 50, 90] : best === 2 ? 60 : 25);
      if (best >= 2) boom(fx.current, TIERS[best].col);
      newSeed();
    }, dur * 1000 + 250);
  }

  const sellOne = id => {
    const o = run?.got.find(x => x.id === id); if (!o || sold.has(id)) return;
    sfx('sell'); setSold(s => new Set([...s, id]));
    setS(s => s.inv.some(x => x.id === id) ? { ...s, bal: r2(s.bal + o.p), inv: s.inv.filter(x => x.id !== id) } : s);
  };
  const sellAll = () => {
    const left = run.got.filter(o => !sold.has(o.id)); if (!left.length) return;
    sfx('sell'); setSold(new Set(run.got.map(o => o.id)));
    setS(s => {
      const ids = new Set(left.filter(o => s.inv.some(x => x.id === o.id)).map(o => o.id));
      return { ...s, bal: r2(s.bal + left.filter(o => ids.has(o.id)).reduce((t, o) => t + o.p, 0)), inv: s.inv.filter(x => !ids.has(x.id)) };
    });
  };

  // ─── Список кейсів ───
  if (!c) {
    const secs = GROUPS.filter(g => !grp || g.id === grp).map(g => ({ g, items: list.filter(o => o.k.g === g.id) })).filter(x => x.items.length);
    return (
      <div className="cs" hidden={hidden} ref={topRef}>
        <div className="cs-head">
          <div>
            <h2>Кейси</h2>
            <p className="mut">Обери кейс, натисни «Відкрити» — предмет одразу потрапить в інвентар. Залиш його для апгрейду або продай.</p>
          </div>
          <div className="cs-steps"><i>1</i>Обери<u /><i>2</i>Відкрий<u /><i>3</i>Забери або продай</div>
        </div>
        <div className="shopbar">
          <input type="search" placeholder="Знайти кейс" value={q} onChange={e => setQ(e.target.value)} />
          {[['new', 'Спершу нові'], ['cheap', 'Дешеві ↑'], ['dear', 'Дорогі ↓']].map(([k, l]) => <button key={k} className={`tg${sort === k ? ' on' : ''}`} onClick={() => setSort(k)}>{l}</button>)}
          <span className="sp" />
          <span className="cs-bal">Баланс <b>{f2(S.bal)}</b> ₵</span>
        </div>
        <div className="cs-chips" role="tablist" aria-label="Збірки кейсів">
          <button className={!grp ? 'on' : ''} onClick={() => setGrp('')}>Усі збірки <em>{CASES.length}</em></button>
          {GROUPS.map(g => <button key={g.id} className={grp === g.id ? 'on' : ''} style={{ '--a': g.col }} onClick={() => setGrp(grp === g.id ? '' : g.id)}><i />{g.t} <em>{CASES.filter(k => k.g === g.id).length}</em></button>)}
        </div>
        {S.cst?.n > 0 && <p className="mut cs-sum">Відкрито кейсів: <b>{S.cst.n}</b> · витрачено {f2(S.cst.spent)} ₵ · отримано {f2(S.cst.won)} ₵ · <b className={S.cst.won >= S.cst.spent ? 'up' : 'dn'}>{S.cst.won >= S.cst.spent ? '+' : '−'}{f2(Math.abs(S.cst.won - S.cst.spent))} ₵</b></p>}
        {secs.map(({ g, items }) => {
          const pr = items.map(o => stats[o.i].price);
          return (
            <section key={g.id} className="cs-coll" style={{ '--a': g.col }}>
              <div className="cs-colh">
                <i />
                <div><h3>{g.t}</h3><span className="mut">{g.s}</span></div>
                <span className="mut cs-rng">{items.length} шт. · {f2(Math.min(...pr))}–{f2(Math.max(...pr))} ₵</span>
              </div>
              <div className="cs-grid">
                {items.map(({ k, i }) => (
                  <div key={k.id} className="cs-card" role="button" tabIndex={0} data-sfx="off" onClick={() => choose(i)} onKeyDown={e => e.key === 'Enter' && choose(i)}>
                    <Photo src={k.m} className="cs-img" style={{ animationDelay: `${-(i % 7) * .6}s` }} />
                    <b>{k.n}</b>
                    <span className="mut">{k.o.replace(' Weapon Case', ' Case')}</span>
                    <u className={S.bal >= stats[i].price ? '' : 'no'}>{f2(stats[i].price)}</u>
                    <span className="cs-top">★ до {f2(stats[i].max)} ₵</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        {!secs.length && <p className="empty">Кейс не знайдено. Спробуй іншу назву.</p>}
      </div>
    );
  }

  // ─── Один кейс ───
  const reels = run && run.reels.length ? run.reels : null, spin = run?.phase === 'spin' || run?.phase === 'done';
  const left = run?.got?.filter(o => !sold.has(o.id)) || [];
  const d = run?.phase === 'done' ? run.value - run.sp : 0;
  const tierRows = TIERS.map(t => ({ t, items: st.items.filter(o => o.t.k === t.k).sort((a, b) => b.k.p - a.k.p) })).reverse();
  const gold = 100 - (1 - TIERS[4].p / 100) ** 100 * 100, cov = TIERS[3].p + TIERS[4].p;
  const chips = [1, 2, 3, 5], grp0 = GROUPS.find(g => g.id === c.g) || GROUPS[0];

  return (
    <div className="cs" hidden={hidden} ref={topRef}>
      <div className="cs-crumb">
        <button className="ghost cs-back" disabled={busy} onClick={back}>← Усі кейси</button>
        <span className="mut">Збірка: <b style={{ color: grp0.col }}>{grp0.t}</b></span>
        <span className="sp" /><span className="cs-bal">Баланс <b>{f2(S.bal)}</b> ₵</span>
      </div>

      <div className="cs-hero hud">
        <div className={`cs-crate${run?.phase === 'shake' ? ' shake' : ''}${busy ? ' busy' : ''}`}>
          <Photo src={c.m} className="cs-big" />
        </div>
        <div className="cs-info">
          <h2>{c.n}</h2>
          <p className="mut">{c.o} · {c.d.slice(0, 4)} · {st.items.length} предметів, з них {c.tiers[4].length} ★ рідкісних</p>
          <div className="cs-price"><svg className="coin"><use href="#co" /></svg><b>{f2(st.price)}</b><span className="mut"> за кейс</span></div>
          <div className="chips">{chips.map(n => <button key={n} className={qty === n ? 'on' : ''} disabled={busy} onClick={() => setQty(n)}>×{n}</button>)}</div>
          <button className="go cs-go" data-sfx="off" aria-disabled={busy || S.bal < cost} onClick={() => open()}>
            <svg><use href="#up" /></svg>{S.bal < cost ? `Не вистачає ${f2(cost - S.bal)} ₵` : `${run?.phase === 'done' ? 'Відкрити ще' : 'Відкрити'} · ${f2(cost)} ₵`}
          </button>
          {S.bal < cost
            ? <p className="mut cs-help">Не вистачає монет. <button className="ghost" onClick={onInv}>Продай щось в інвентарі</button> або забери щоденний бонус у «Нагородах».</p>
            : <p className="mut cs-help">{run?.phase === 'done' ? 'Предмети вже в інвентарі. Продай їх або відкрий ще.' : 'Предмет одразу потрапить в інвентар — його можна продати або поставити в апгрейд.'}</p>}
          <p className="mut cs-fair">Хеш сіду: <code>{seed.h.slice(0, 24)}…</code> — сід розкриється після відкриття.</p>
        </div>
      </div>

      <div ref={reelsRef} className={`cs-reels${qty > 1 && reels ? ' multi' : ''}`}>
        {reels
          ? reels.map((r, i) => <Reel key={run.key + '-' + i} tiles={r.tiles} win={50} jit={r.jit} dur={run.dur || 0} go={spin} done={run.phase === 'done'} tick={i === 0} />)
          : <Reel key={'idle' + sel} tiles={idle} win={0} jit={0} dur={0} go={false} mq />}
      </div>

      {run?.phase === 'done' && <div className="cs-done">
        <div className="cs-donebar">
          <p>Витрачено <b>{f2(run.sp)} ₵</b> · випало на <b>{f2(run.value)} ₵</b> · <b className={d >= 0 ? 'up' : 'dn'}>{d >= 0 ? '+' : '−'}{f2(Math.abs(d))} ₵</b></p>
          <button className="ghost" disabled={!left.length} onClick={sellAll}>{left.length ? `Продати все · ${f2(left.reduce((t, o) => t + o.p, 0))} ₵` : 'Продано'}</button>
        </div>
        <div className="cs-res">
          {run.got.map((o, i) => !sold.has(o.id) && <div key={o.id} style={{ '--i': i, '--r': TIERS[o.t].col }} className={`cs-win t${o.t}`}><SkinCard o={{ ...o, col: TIERS[o.t].col }} sell={() => sellOne(o.id)} /></div>)}
        </div>
        <details className="cs-proof"><summary>Перевірка чесності</summary>
          {run.reels.map(r => <p key={r.nonce}>Раунд c{r.nonce}: SHA-256(<code>{run.my}:{cseed}:c{r.nonce}</code>) = <code>{r.h.slice(0, 16)}…</code> → шанс {r.a.toFixed(4)}% ({TIERS[r.t].label}), предмет №{Math.floor(r.b * c.tiers[r.t].length) + 1} з {c.tiers[r.t].length}</p>)}
          <p className="mut">Перші 8 hex-цифр хеша дають число 0–100 для рідкості, наступні 8 — вибір предмета в ній. Хеш сіду ти бачив до відкриття.</p>
        </details>
      </div>}

      {run?.phase === 'done' && run.best >= 3 && <div key={run.key} className="cs-flash" style={{ '--r': TIERS[run.best].col }}><b>{run.best === 4 ? '★ Рідкісний предмет' : 'Таємна рідкість'}</b><span>{run.got.find(o => o.t === run.best).n}</span></div>}

      <section className="cs-odds">
        <h3>Шанси та математика</h3>
        <div className="cs-bar">{TIERS.map(t => <i key={t.k} style={{ flexGrow: t.p, background: t.col }} title={`${t.label}: ${t.p}%`} />)}</div>
        <div className="cs-tiers">
          {[...TIERS].reverse().map(t => (
            <div key={t.k} style={{ '--r': t.col }}>
              <i /><b>{t.label}</b>
              <span>{t.p}%</span>
              <span className="mut">≈ 1 з {one(100 / t.p)}</span>
              <span className="mut">{c.tiers[t.k].length} шт. по {pc(t.p / c.tiers[t.k].length)}%</span>
            </div>
          ))}
        </div>
        <div className="cs-kpi">
          <div><span>Ціна кейса</span><b>{f2(st.price)} ₵</b></div>
          <div><span>Середній дроп (EV)</span><b>{f2(st.ev)} ₵</b></div>
          <div><span>Повернення (RTP)</span><b>{Math.round(RTP * 100)}%</b></div>
          <div><span>Шанс окупитись</span><b>{st.win.toFixed(2)}%</b></div>
          <div><span>Топ-приз</span><b>{f2(st.max)} ₵</b></div>
          <div><span>Таємна й вище</span><b>≈ 1 з {one(100 / cov)}</b></div>
          <div><span>★ за 100 кейсів</span><b>{gold.toFixed(1)}%</b></div>
        </div>
        <p className="mut">Шанс окупитись — імовірність дропу дорожчого за ціну кейса. Ціни предметів — Skinport, якщо вдалося завантажити, інакше орієнтовні. Стрічка під час обертання лише візуальна, результат визначається хешем до анімації.</p>
      </section>

      <section className="cs-items">
        {tierRows.map(({ t, items }) => {
          const vis = t.k === 4 && !more ? items.slice(0, 12) : items;
          return (
            <div key={t.k} className="cs-tier" style={{ '--r': t.col }}>
              <h3><i />{t.label} <span className="mut">· {items.length} шт. · {t.p}%</span></h3>
              <div className="cs-igrid">
                {vis.map(o => {
                  const [w, s] = splitName(o.k.n);
                  return (
                    <div key={o.k.n} className="ci" style={{ '--r': t.col }}>
                      <Photo src={o.k.m} /><s>{w || '★'}</s><b>{s}</b>
                      <u>{f2(o.k.p)}</u><em>{pc(o.p)}%</em>
                    </div>
                  );
                })}
              </div>
              {t.k === 4 && items.length > 12 && <button className="ghost" onClick={() => setMore(m => !m)}>{more ? 'Згорнути' : `Показати всі ${items.length}`}</button>}
            </div>
          );
        })}
      </section>
    </div>
  );
}
