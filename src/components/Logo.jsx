// Лого ORBITA: гекс-значок, прицільне кільце з розривами, стрілка вгору й супутник на орбіті
export default function Logo({ className = 'mark' }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lgG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" /><stop offset=".55" stopColor="#eab948" /><stop offset="1" stopColor="#d9741a" />
        </linearGradient>
        <linearGradient id="lgB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c3441" /><stop offset="1" stopColor="#0d1014" />
        </linearGradient>
      </defs>
      <polygon points="32,1.5 58.5,16.5 58.5,47.5 32,62.5 5.5,47.5 5.5,16.5" fill="url(#lgB)" stroke="url(#lgG)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="#fff" strokeOpacity=".14" />
      <circle cx="32" cy="32" r="14.5" fill="none" stroke="url(#lgG)" strokeWidth="3.2" strokeDasharray="18.2 4.58" strokeDashoffset="20.49" />
      <path d="M32 22.5 39.5 34h-5v6h-5v-6h-5z" fill="url(#lgG)" />
      <g className="orbit">
        <g transform="rotate(42 32 32)">
          <path d="M21.7 12.6A22 22 0 0 1 32 10" fill="none" stroke="#ff8a3d" strokeOpacity=".6" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="32" cy="10" r="6" fill="#ff8a3d" opacity=".25" />
          <circle cx="32" cy="10" r="3.6" fill="#ff8a3d" />
          <circle cx="31" cy="9" r="1.1" fill="#fff" opacity=".85" />
        </g>
      </g>
    </svg>
  );
}
