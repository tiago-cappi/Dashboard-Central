export default function Divider({ className = '' }) {
  return (
    <div className={`divider ${className}`}>
      <span className="line" />
      <svg className="ornament" viewBox="0 0 16 8" aria-hidden="true">
        <path
          d="M0 4 L4 1 L8 4 L12 1 L16 4 L12 7 L8 4 L4 7 Z"
          fill="currentColor"
          opacity=".75"
        />
      </svg>
      <span className="line" />
    </div>
  );
}
