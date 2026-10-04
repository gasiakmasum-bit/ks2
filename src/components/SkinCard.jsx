import Photo from './Photo.jsx';
import { f2, splitName, CATS } from '../lib/game.js';

// Картка в стилі інвентарю CS2: зброя, назва скіна, кольорова смуга рідкості внизу
export default function SkinCard({ o, on, badge, lose, onClick, sell, qty, onQty, cls = '' }) {
  if (qty != null) on = qty > 0;
  const [w, s] = splitName(o.n);
  return (
    <div className={`c${on ? ' on' : ''} ${cls}`} style={{ '--r': o.col }} role="button" tabIndex={0} data-sfx="off"
      onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick?.()}>
      {badge != null && <i className={`bd${lose ? ' lose' : ''}`}><svg className="i"><use href="#up" /></svg>{badge}</i>}
      {sell && <button className="sell" data-sfx="off" onClick={e => { e.stopPropagation(); sell(); }}>Продати</button>}
      <Photo src={o.m} />
      <s>{w || CATS[o.c] || ''}</s><b>{s}</b><u>{f2(o.p)}</u>
      {onQty && (
        <div className="qty" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
          <button aria-label="Менше" data-sfx="off" disabled={!qty} onClick={() => onQty(-1)}>−</button>
          <span className={qty ? 'on' : ''}>{qty}</span>
          <button aria-label="Більше" data-sfx="off" onClick={() => onQty(1)}>+</button>
        </div>
      )}
    </div>
  );
}
