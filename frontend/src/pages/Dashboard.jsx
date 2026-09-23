import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate, monthLabel } from '../lib/format.js';
import { labelOf } from '../lib/constants.js';
import { StatCard } from '../components/StatCard.jsx';

export default function Dashboard() {
  const { currency } = useConfig();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="page"><p className="alert alert--error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Cargando panel…</p></div>;

  const { currentMonth, totals, byType, trend, upcomingEnding } = data;
  const maxBar = Math.max(1, ...trend.map((m) => Math.max(m.income, m.expense)));

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Panel</h1>
          <p className="page__subtitle">Estado actual y proyección de tus finanzas</p>
        </div>
        <span className="badge">{currency}</span>
      </header>

      <section className="stats-grid">
        <StatCard label="Saldo este mes" value={formatMoney(currentMonth.net, currency)} tone={currentMonth.net >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Ingresos este mes" value={formatMoney(currentMonth.income, currency)} tone="positive" />
        <StatCard label="Gastos este mes" value={formatMoney(currentMonth.expense, currency)} tone="negative" />
        <StatCard label="Ingresos recurrentes / mes" value={formatMoney(totals.monthlyIncome, currency)} hint={`${totals.incomeSources} fuentes`} />
        <StatCard label="Gastos recurrentes / mes" value={formatMoney(totals.monthlyExpense, currency)} hint={`${totals.expenseSources} fuentes`} />
        <StatCard label="Saldo recurrente / mes" value={formatMoney(totals.monthlyNet, currency)} tone={totals.monthlyNet >= 0 ? 'positive' : 'negative'} hint={`${totals.active} contratos activos`} />
      </section>

      <section className="card">
        <h2 className="card__title">Proyección a 12 meses</h2>
        <div className="bar-chart">
          {trend.map((m) => (
            <div className="bar-chart__group" key={m.month} title={`${monthLabel(m.month)} · Ingreso ${formatMoney(m.income, currency)} · Gasto ${formatMoney(m.expense, currency)}`}>
              <div className="bar-chart__bars">
                <div className="bar bar--income" style={{ height: `${(m.income / maxBar) * 100}%` }} />
                <div className="bar bar--expense" style={{ height: `${(m.expense / maxBar) * 100}%` }} />
              </div>
              <span className="bar-chart__label">{monthLabel(m.month).slice(0, 3).replace('.', '')}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span className="legend__item"><i className="legend__dot legend__dot--income" /> Ingresos</span>
          <span className="legend__item"><i className="legend__dot legend__dot--expense" /> Gastos</span>
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2 className="card__title">Por tipo de contrato</h2>
          <table className="table">
            <thead>
              <tr><th>Tipo</th><th className="num">Nº</th><th className="num">Ingreso/mes</th><th className="num">Gasto/mes</th></tr>
            </thead>
            <tbody>
              {byType.map((g) => (
                <tr key={g.type}>
                  <td>{labelOf('type', g.type)}</td>
                  <td className="num">{g.count}</td>
                  <td className="num positive">{formatMoney(g.income, currency)}</td>
                  <td className="num negative">{formatMoney(g.expense, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="card__title">Contratos que vencen pronto</h2>
          {upcomingEnding.length === 0 ? (
            <p className="muted">No hay contratos que venzan en los próximos 90 días.</p>
          ) : (
            <ul className="list">
              {upcomingEnding.map((c) => (
                <li key={c.id} className="list__item">
                  <div>
                    <span className="list__title">{c.name}</span>
                    <span className="muted small">{labelOf('type', c.type)} · vence {formatDate(c.endDate)}</span>
                  </div>
                  <span className="negative">{formatMoney(c.amount, c.currency || currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
