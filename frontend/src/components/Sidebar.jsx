const NAV = [
  { path: '/', label: 'Panel' },
  { path: '/contracts', label: 'Contratos' },
  { path: '/houses', label: 'Viviendas' },
  { path: '/members', label: 'Miembros' },
  { path: '/forecast', label: 'Previsión' },
];

export function Sidebar({ route, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">10go</span>
        <span className="sidebar__tagline">Contratos &amp; finanzas</span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <button
            key={item.path}
            type="button"
            className={`nav-item${route === item.path ? ' nav-item--active' : ''}`}
            onClick={() => onNavigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">Arquitectura hexagonal · DDD</div>
    </aside>
  );
}
