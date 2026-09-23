import { useEffect, useState } from 'react';
import { api } from './api/client.js';
import { ConfigContext } from './lib/config-context.js';
import { Sidebar } from './components/Sidebar.jsx';
import { Splash } from './components/Splash.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Contracts from './pages/Contracts.jsx';
import Houses from './pages/Houses.jsx';
import Members from './pages/Members.jsx';
import Forecast from './pages/Forecast.jsx';
import Settings from './pages/Settings.jsx';
import ContractDetail from './pages/ContractDetail.jsx';
import Taxes from './pages/Taxes.jsx';
import Transactions from './pages/Transactions.jsx';
import Cars from './pages/Cars.jsx';
import CarDetail from './pages/CarDetail.jsx';
import HouseDetail from './pages/HouseDetail.jsx';
import MemberDetail from './pages/MemberDetail.jsx';
import Assets from './pages/Assets.jsx';

const PAGES = {
  '/': Dashboard,
  '/contracts': Contracts,
  '/cars': Cars,
  '/houses': Houses,
  '/assets': Assets,
  '/members': Members,
  '/forecast': Forecast,
  '/taxes': Taxes,
  '/transactions': Transactions,
  '/settings': Settings,
};

function resolveRoute(route) {
  if (route.startsWith('/contracts/')) {
    return { Component: ContractDetail, contractId: route.slice('/contracts/'.length), carId: null, houseId: null, memberId: null };
  }
  if (route.startsWith('/cars/')) {
    return { Component: CarDetail, contractId: null, carId: route.slice('/cars/'.length), houseId: null, memberId: null };
  }
  if (route.startsWith('/houses/')) {
    return { Component: HouseDetail, contractId: null, carId: null, houseId: route.slice('/houses/'.length), memberId: null };
  }
  if (route.startsWith('/members/')) {
    return { Component: MemberDetail, contractId: null, carId: null, houseId: null, memberId: route.slice('/members/'.length) };
  }
  return { Component: PAGES[route] || Dashboard, contractId: null, carId: null, houseId: null, memberId: null };
}

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/');
  const [config, setConfig] = useState({ currency: 'EUR', env: 'development' });
  const [showSplash, setShowSplash] = useState(true);

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

  const { Component, contractId, carId, houseId, memberId } = resolveRoute(route);

  return (
    <ConfigContext.Provider value={config}>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <div className="app">
        <Sidebar route={route} onNavigate={navigate} />
        <main className="app__main">
          <Component navigate={navigate} contractId={contractId} carId={carId} houseId={houseId} memberId={memberId} />
        </main>
      </div>
    </ConfigContext.Provider>
  );
}
