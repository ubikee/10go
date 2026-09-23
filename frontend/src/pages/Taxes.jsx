import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney } from '../lib/format.js';
import { StatCard } from '../components/StatCard.jsx';

export default function Taxes() {
  const { currency } = useConfig();
  const [year, setYear] = useState(new Date().getFullYear());
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/members').then(setMembers).catch(() => {});
  }, []);

  useEffect(() => {
    setData(null);
    const params = new URLSearchParams({ year });
    if (memberId) params.set('memberId', memberId);
    api.get(`/taxes?${params.toString()}`).then(setData).catch((e) => setError(e.message));
  }, [year, memberId]);

  const years = [];
  const current = new Date().getFullYear();
  for (let y = current - 3; y <= current + 1; y += 1) years.push(y);

  const memberName = memberId ? members.find((m) => m.id === memberId)?.name ?? 'Responsable' : 'Todos';

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Impuestos</h1>
          <p className="page__subtitle">IVA repercutido e IRPF retenido por responsable</p>
        </div>
        <div className="toolbar">
          <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Todos los responsables</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {!data && !error && <p className="muted">Calculando impuestos…</p>}

      {data && (
        <>
          <section className="stats-grid">
            <StatCard label={`Ingresos netos · ${memberName}`} value={formatMoney(data.totals.net, currency)} tone="positive" />
            <StatCard label="IVA repercutido (a pagar)" value={formatMoney(data.totals.vat, currency)} tone="negative" />
            <StatCard label="IRPF retenido" value={formatMoney(data.totals.withholding, currency)} />
          </section>

          <section className="card card--flush">
            <table className="table">
              <thead>
                <tr><th>Trimestre</th><th className="num">Ingresos netos</th><th className="num">IVA repercutido</th><th className="num">IRPF retenido</th></tr>
              </thead>
              <tbody>
                {data.quarters.map((q) => (
                  <tr key={q.quarter}>
                    <td>Q{q.quarter}</td>
                    <td className="num positive">{formatMoney(q.net, currency)}</td>
                    <td className="num negative">{formatMoney(q.vat, currency)}</td>
                    <td className="num">{formatMoney(q.withholding, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total {year}</th>
                  <th className="num positive">{formatMoney(data.totals.net, currency)}</th>
                  <th className="num negative">{formatMoney(data.totals.vat, currency)}</th>
                  <th className="num">{formatMoney(data.totals.withholding, currency)}</th>
                </tr>
              </tfoot>
            </table>
          </section>

          <p className="muted small">
            Solo se tienen en cuenta las facturas de **ingresos** (autónomo/freelance) con desglose de
            IVA/IRPF del responsable seleccionado. El IVA repercutido es lo que tendrá que liquidar a Hacienda.
          </p>
        </>
      )}
    </div>
  );
}
