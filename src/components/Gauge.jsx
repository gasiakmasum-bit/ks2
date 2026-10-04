import { useTween } from '../lib/fx.js';
// Орбіта-радар: стрілка облітає кільце й зупиняється; виграш, якщо вона в зеленій зоні зверху
export default function Gauge({ ch, mult, rot, dur }) {
  const pc = useTween(ch), A = ch * 3.6;
  const bg = ch ? `conic-gradient(from ${-A / 2}deg,#6fe05a 0deg,#b6f56a ${A}deg,transparent ${A}deg)` : 'transparent';
  return (
    <div className="dial">
      <div className="ticks" /><div className="ticks major" />
      <div className="track" /><div className="arc" style={{ background: bg }} />
      <div className="disc">
        <div className="pc">{pc.toFixed(2)}%</div>
        <div className="sub">шанс успіху</div>
        <div className="mx">{mult ? `x${mult.toFixed(2)}` : 'обери ціль'}</div>
      </div>
      <div className="sat" style={{ transform: `rotate(${rot}deg)`, transition: `transform ${dur}s cubic-bezier(.12,.62,.08,1)` }}><i /></div>
      <b className="pin" />
    </div>
  );
}
