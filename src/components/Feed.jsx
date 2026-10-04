import SkinCard from './SkinCard.jsx';
import { CATALOG } from '../lib/game.js';
export default function Feed({ feed }) {
  return (
    <div className="strip" aria-label="Стрічка апгрейдів">
      {feed.slice(0, 10).map((e, i) => (
        <SkinCard key={i + '-' + e.k} o={CATALOG[e.k]} badge={e.ch.toFixed(2) + '%'} lose={!e.w} cls={`mini f${e.w ? '' : ' lose'}`} />
      ))}
    </div>
  );
}
