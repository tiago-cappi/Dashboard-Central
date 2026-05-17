export default function Crest({ size = 36, className = '' }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crestBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7e6b8" />
          <stop offset="100%" stopColor="#c9a14a" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 L60 10 L60 30 C60 46 48 58 32 62 C16 58 4 46 4 30 L4 10 Z"
        fill="url(#crestBg)"
        stroke="#5b4423"
        strokeWidth="1.5"
      />
      <path d="M32 2 L32 62" stroke="#5b4423" strokeWidth="1" opacity=".5" />
      <path d="M4 32 L60 32" stroke="#5b4423" strokeWidth="1" opacity=".5" />
      {/* quadrantes simbólicos */}
      <circle cx="18" cy="18" r="4" fill="#6b1f2a" />
      <path d="M40 12 L52 12 L46 22 Z" fill="#1f3a5f" />
      <path d="M18 42 L24 50 L12 50 Z" fill="#4a6b3a" />
      <rect x="40" y="42" width="10" height="10" fill="#4a1620" />
      <path
        d="M32 2 L60 10 L60 30 C60 46 48 58 32 62 C16 58 4 46 4 30 L4 10 Z"
        fill="none"
        stroke="#a88a3d"
        strokeWidth="1"
      />
    </svg>
  );
}
