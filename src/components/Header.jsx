import { useEffect, useRef, useState } from 'react';
import Logo from './Logo.jsx';
import { f2 } from '../lib/game.js';

// Ідентикон гравця з його id (симетрична сітка 5×5)
function Avatar({ id }) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const cells = []; let x = h;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
    x = Math.imul(x ^ (x >>> 15), 2246822507) >>> 0;
    if ((x >>> 7) & 1) { cells.push([c, r]); if (c < 2) cells.push([4 - c, r]); }
  }
  const col = `hsl(${h % 360} 70% 62%)`;
  return <svg className="av" viewBox="0 0 5 5" shapeRendering="crispEdges">{cells.map(([c, r]) => <rect key={c + '-' + r} x={c} y={r} width="1" height="1" fill={col} />)}</svg>;
}

const NAV = [['up', 'Апгрейд'], ['cases', 'Кейси'], ['inv', 'Інвентар'], ['shop', 'Магазин'], ['rw', 'Нагороди']];
// Іконки для нижньої навігації на телефоні (на десктопі приховані)
const NI = {
  up: 'M12 20V5m-6 6 6-6 6 6',
  cases: 'M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8',
  inv: 'M12 3 4 9.5 12 21l8-11.5zM4 9.5h16',
  shop: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
  rw: 'M4 11h16v9H4zM3 8h18v3H3zM12 8v12M12 8S9 8 8.5 6.5 10 4 12 8zm0 0s3 0 3.5-1.5S14 4 12 8',
};

export default function Header({ S, busy, nav, onNav, onBonus, onInfo, onReset, onSnd, onFast }) {
  const [open, setOpen] = useState(null);
  const [seen, setSeen] = useState(S.ups);
  const ref = useRef(null);
  const left = 864e5 - (Date.now() - S.bonus), locked = left > 0;
  const invSum = S.inv.reduce((t, i) => t + i.p, 0);

  useEffect(() => {
    const away = e => { if (!e.target.closest?.('.pw')) setOpen(null); };
    const esc = e => e.key === 'Escape' && setOpen(null);
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, []);

  const tog = k => { setOpen(o => o === k ? null : k); if (k === 'hist') setSeen(S.ups); };
  const nb = id => id === 'rw' ? tog('rw') : (setOpen(null), onNav(id));

  return (
    <header ref={ref} className={busy ? 'busy' : ''}>
      <div className="brand"><Logo /><span className="word">ORBITA</span><em className="tag">CS2</em></div>

      <nav className="nav" aria-label="Розділи">
        {NAV.map(([id, label]) => (
          <div className={id === 'rw' ? 'pw' : undefined} key={id}>
            <button className={(id === 'rw' ? open === 'rw' : nav === id && !open) ? 'on' : ''} data-sfx="off" onClick={() => nb(id)}>
              <svg className="ni ic" viewBox="0 0 24 24"><path className="s" d={NI[id]} /></svg>
              <span>{label}</span>{id === 'rw' && !locked && <i className="dot" />}
            </button>
            {id === 'rw' && open === 'rw' && (
              <div className="pop c">
                <h3>Нагороди</h3>
                <div className="rwrow">
                  <svg className="coin"><use href="#co" /></svg>
                  <div><b>Щоденний бонус</b><span className="mut">+50 ₵ раз на 24 години</span></div>
                  <button className="claim" disabled={busy || locked} data-sfx="off" onClick={onBonus}>
                    {locked ? `ще ${Math.ceil(left / 36e5)} год` : 'Забрати'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="right">
        <div className="money">
          <span className="m inv" title="Вартість інвентарю"><svg viewBox="0 0 24 24"><path d="M12 2 3 9l9 13 9-13z" /></svg>{f2(invSum)}</span>
          <span className="m bal" title="Баланс"><svg className="coin"><use href="#co" /></svg>{f2(S.bal)}</span>
          <button className="plus" title="Нагороди та бонус" onClick={() => tog('rw')} data-sfx="off">+</button>
        </div>

        <button className={`ib${S.snd ? ' on' : ''}`} title="Звук" data-sfx="off" onClick={onSnd}>
          <svg className="ic" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" />
            {S.snd ? <path className="s" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path className="s" d="m16 9 5 6m0-6-5 6" />}
          </svg>
        </button>

        <div className="pw">
          <button className="ib" title="Історія апгрейдів" onClick={() => tog('hist')}>
            <svg className="ic" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3v1h16v-1l-2-3V9a6 6 0 0 0-6-6zm-2 16a2 2 0 0 0 4 0z" /></svg>
            {S.ups > seen && <i className="dot top" />}
          </button>
          {open === 'hist' && (
            <div className="pop wide">
              <h3>Історія апгрейдів</h3>
              {S.hist.length ? <ul className="hist">{S.hist.slice(0, 8).map(h => (
                <li key={h.n} title={`сід: ${h.seed}`}>
                  <span className={`rs ${h.w ? 'w' : 'l'}`}>{h.w ? 'Успіх' : 'Провал'}</span>
                  <span className="tn">{h.tn}</span>
                  <span className="mut">{h.ch.toFixed(2)}% · випало {h.roll.toFixed(2)} · ставка {f2(h.st)} ₵</span>
                </li>))}</ul>
                : <p className="mut">Поки що порожньо. Зроби перший апгрейд.</p>}
            </div>
          )}
        </div>

        <div className="pw">
          <button className="avb" title="Профіль" onClick={() => tog('me')}><Avatar id={S.uid || 'orbita'} /></button>
          {open === 'me' && (
            <div className="pop menu">
              <div className="who"><Avatar id={S.uid || 'orbita'} /><div><b>Гравець {(S.uid || 'orbita').slice(0, 4).toUpperCase()}</b><span className="mut">Апгрейдів: {S.ups}</span></div></div>
              <button className="m-only" onClick={() => { setOpen(null); onSnd(); }}><svg className="ic" viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9z" /></svg>Звук<em className={S.snd ? 'on' : ''}>{S.snd ? 'увімк' : 'вимк'}</em></button>
              <button className="m-only" onClick={() => tog('hist')}><svg className="ic" viewBox="0 0 24 24"><path className="s" d="M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4" /></svg>Історія апгрейдів{S.ups > seen && <i className="dot" style={{ marginLeft: 'auto' }} />}</button>
              <button onClick={() => { setOpen(null); onFast(); }}><svg className="ic" viewBox="0 0 24 24"><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></svg>Швидкий режим<em className={S.fast ? 'on' : ''}>{S.fast ? 'увімк' : 'вимк'}</em></button>
              <button onClick={() => { setOpen(null); onInfo(); }}><b className="q">?</b>Про чесність</button>
              <button className="danger" onClick={() => { setOpen(null); onReset(); }}><svg className="ic" viewBox="0 0 24 24"><path className="s" d="M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5" /></svg>Почати спочатку</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
