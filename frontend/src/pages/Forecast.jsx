import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, monthLabel } from '../lib/format.js';
import { StatCard } from '../components/StatCard.jsx';

export default function Forecast() {
  const { currency } = useConfig();
  const [months, setMonths] = useState(12);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api.get(`/forecast?months=${months}`).then(setData).catch((e) => setError(e.message));
  }, [months]);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Previsión</h1>
          <p className="page__subtitle">Proyección de ingresos y gastos a futuro</p>
        </div>
        <select className="input" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
          <option value={24}>24 meses</option>
        </select>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {!data && !error && <p className="muted">Calculando proyección…</p>}

      {data && (
        <>
          <section className="stats-grid">
            <StatCard label="Ingresos totales" value={formatMoney(data.totals.income, currency)} tone="positive" />
            <StatCard label="Gastos totales" value={formatMoney(data.totals.expense, currency)} tone="negative" />
            <StatCard label="Saldo neto" value={formatMoney(data.totals.net, currency)} tone={data.totals.net >= 0 ? 'positive' : 'negative'} />
            <StatCard label="Periodo" value={`${monthLabel(data.from)} → ${monthLabel(data.to)}`} />
          </section>

          <section className="card card--flush">
            <table className="table">
              <thead>
                <tr><th>Mes</th><th className="num">Ingresos</th><th className="num">Gastos</th><th className="num">Neto</th><th className="num">Movimientos</th></tr>
              </thead>
              <tbody>
                {data.months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthLabel(m.month)}</td>
                    <td className="num positive">{formatMoney(m.income, currency)}</td>
                    <td className="num negative">{formatMoney(m.expense, currency)}</td>
                    <td className={`num ${m.net >= 0 ? 'positive' : 'negative'}`}>{formatMoney(m.net, currency)}</td>
                    <td className="num muted">{m.items.length}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total</th>
                  <th className="num positive">{formatMoney(data.totals.income, currency)}</th>
                  <th className="num negative">{formatMoney(data.totals.expense, currency)}</th>
                  <th className="num">{formatMoney(data.totals.net, currency)}</th>
                  <th />
                </tr>
              </tfoot>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
