import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import { ConfigContext } from './lib/config-context.js';
import { Sidebar } from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contracts from './pages/Contracts.jsx';
import Houses from './pages/Houses.jsx';
import Members from './pages/Members.jsx';
import Forecast from './pages/Forecast.jsx';

const PAGES = {
  '/': Dashboard,
  '/contracts': Contracts,
  '/houses': Houses,
  '/members': Members,
  '/forecast': Forecast,
};

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/');
  const [config, setConfig] = useState({ currency: 'EUR', env: 'development' });

  useEffect(() => {
    api.get('/config').then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  const Page = PAGES[route] || Dashboard;

  return (
    <ConfigContext.Provider value={config}>
      <div className="app">
        <Sidebar route={route} onNavigate={navigate} />
        <main className="app__main">
          <Page navigate={navigate} />
        </main>
      </div>
    </ConfigContext.Provider>
  );
}
