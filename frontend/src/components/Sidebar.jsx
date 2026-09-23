const NAV = [
  { path: '/', label: 'Panel' },
  { path: '/contracts', label: 'Contratos' },
  { path: '/transactions', label: 'Movimientos' },
  { path: '/houses', label: 'Viviendas' },
  { path: '/cars', label: 'Coches' },
  { path: '/assets', label: 'Bienes' },
  { path: '/members', label: 'Miembros' },
  { path: '/forecast', label: 'Previsión' },
  { path: '/taxes', label: 'Impuestos' },
  { path: '/settings', label: 'Configuración' },
];

export function Sidebar({ route, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">10Go</span>
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
