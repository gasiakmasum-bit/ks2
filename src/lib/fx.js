import { useEffect, useRef, useState } from 'react';

export const reduced = () => matchMedia('(prefers-reduced-motion:reduce)').matches;

// Спалах кольору рідкості + уламки при виграші
export function boom(c, col) {
  if (!c || reduced()) return;
  const x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const P = Array.from({ length: 140 }, () => ({
    x: c.width / 2, y: c.height / 2, vx: (Math.random() - .5) * 20, vy: Math.random() * -16 - 3,
    w: Math.random() * 9 + 3, h: Math.random() * 3 + 2, a: Math.random() * 6.28, va: (Math.random() - .5) * .5,
    c: Math.random() < .5 ? col : ['#eab948', '#ff8a3d', '#fff'][Math.random() * 3 | 0]
  }));
  const t0 = performance.now();
  (function f(t) {
    const k = Math.max(0, 1 - (t - t0) / 600);
    x.clearRect(0, 0, c.width, c.height);
    if (k > 0) {
      const g = x.createRadialGradient(c.width / 2, c.height / 2, 0, c.width / 2, c.height / 2, Math.max(c.width, c.height) * .6);
      g.addColorStop(0, col); g.addColorStop(1, 'transparent');
      x.globalAlpha = .38 * k; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1;
    }
    P.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += .38; p.a += p.va;
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
    });
    if (t - t0 < 2400) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
  })(t0);
}

// Плавна зміна числа (шанс)
export function useTween(v) {
  const [x, setX] = useState(v), ref = useRef(v);
  useEffect(() => {
    if (reduced()) { ref.current = v; setX(v); return; }
    const from = ref.current, t0 = performance.now(); let id;
    const f = t => { const k = Math.min(1, (t - t0) / 500); ref.current = from + (v - from) * k; setX(ref.current); if (k < 1) id = requestAnimationFrame(f); };
    id = requestAnimationFrame(f);
    return () => cancelAnimationFrame(id);
  }, [v]);
  return x;
}
