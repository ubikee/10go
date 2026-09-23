export function StatCard({ label, value, hint, tone = '' }) {
  return (
    <div className={`stat-card${tone ? ` stat-card--${tone}` : ''}`}>
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </div>
  );
}
