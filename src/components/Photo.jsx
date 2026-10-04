import { useState } from 'react';
// Фото скіна зі Steam CDN; якщо не завантажилось — показуємо заглушку
export default function Photo({ src, className = '', style }) {
  const [bad, setBad] = useState(false);
  if (bad) return <span className={`nophoto ${className}`}>немає фото</span>;
  return <img className={className} style={style} src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBad(true)} />;
}
