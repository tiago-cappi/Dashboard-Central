const ACCENT_STYLE = {
  moss: { background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)' },
  teal: { background: 'linear-gradient(180deg, #2a5a6b 0%, #1a3a4a 100%)' },
  gold: { background: 'linear-gradient(180deg, #a88a3d 0%, #5b4423 100%)' },
};

export default function Panel({
  title,
  subtitle,
  accent = 'wine',
  actions,
  className = '',
  bodyClassName = '',
  children,
}) {
  const accentClass = accent === 'navy' ? 'navy' : accent === 'wood' ? 'wood' : '';
  const accentStyle = ACCENT_STYLE[accent];
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className={`panel-header ${accentClass}`} style={accentStyle}>
          <div className="flex-1 min-w-0">
            {title && <div className="title truncate">{title}</div>}
            {subtitle && <div className="sub truncate">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
