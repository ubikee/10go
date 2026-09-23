import { Fragment, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { StatCard } from '../components/StatCard.jsx';

export default function Taxes() {
  const { currency } = useConfig();
  const [year, setYear] = useState(new Date().getFullYear());
  const [memberId, setMemberId] = useState('');
  const [members, setMembers] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleQuarter = (q) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  };

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
          <p className="page__subtitle">IVA e IRPF por responsable</p>
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
            <StatCard label={`Rendimiento neto · ${memberName}`} value={formatMoney(data.totals.rendimientoNeto, currency)} tone={data.totals.rendimientoNeto >= 0 ? 'positive' : 'negative'} />
            <StatCard label="IVA a pagar" value={formatMoney(data.totals.vatAPagar, currency)} tone="negative" hint={`repercutido ${formatMoney(data.totals.vatRepercutido, currency)} − soportado ${formatMoney(data.totals.vatSoportado, currency)}`} />
            <StatCard label="IRPF retenido" value={formatMoney(data.totals.irpfRetenido, currency)} />
            <StatCard label="Amortización (año)" value={formatMoney(data.totals.amortizacion, currency)} />
          </section>

          <section className="card card--flush">
            <table className="table">
              <thead>
                <tr>
                  <th>Trimestre</th>
                  <th className="num">Ingresos netos</th>
                  <th className="num">Gastos deducibles</th>
                  <th className="num">IVA repercutido</th>
                  <th className="num">IVA soportado</th>
                  <th className="num">IVA a pagar</th>
                  <th className="num">IRPF retenido</th>
                </tr>
              </thead>
              <tbody>
                {data.quarters.map((q) => (
                  <Fragment key={q.quarter}>
                    <tr className="expandable-row" onClick={() => toggleQuarter(q.quarter)}>
                      <td>
                        <span className="expand-caret">{expanded.has(q.quarter) ? '▾' : '▸'}</span> Q{q.quarter}
                      </td>
                      <td className="num positive">{formatMoney(q.ingresosNetos, currency)}</td>
                      <td className="num negative">{formatMoney(q.gastosDeducibles, currency)}</td>
                      <td className="num">{formatMoney(q.vatRepercutido, currency)}</td>
                      <td className="num">{formatMoney(q.vatSoportado, currency)}</td>
                      <td className="num negative">{formatMoney(q.vatAPagar, currency)}</td>
                      <td className="num">{formatMoney(q.irpfRetenido, currency)}</td>
                    </tr>
                    {expanded.has(q.quarter) && (
                      <tr className="detail-row">
                        <td colSpan={7}>
                          {q.details.length === 0 ? (
                            <p className="muted small">Sin movimientos deducibles en este trimestre.</p>
                          ) : (
                            <table className="table table--inner">
                              <thead>
                                <tr>
                                  <th>Fecha</th>
                                  <th>Concepto</th>
                                  <th>Dirección</th>
                                  <th className="num">Base</th>
                                  <th className="num">IVA</th>
                                  <th className="num">IRPF</th>
                                  <th className="num">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {q.details.map((d, i) => (
                                  <tr key={i}>
                                    <td className="muted">{formatDate(d.date)}</td>
                                    <td>{d.invoiceNumber || d.counterparty || d.category || '—'}</td>
                                    <td><span className="badge badge--neutral">{d.direction === 'income' ? 'Ingreso' : 'Gasto'}</span></td>
                                    <td className="num">{d.baseAmount != null ? formatMoney(d.baseAmount, currency) : '—'}</td>
                                    <td className="num">{formatMoney(d.vatAmount, currency)}</td>
                                    <td className="num">{formatMoney(d.withholdingAmount, currency)}</td>
                                    <td className="num">{formatMoney(d.amount, currency)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Total {year}</th>
                  <th className="num positive">{formatMoney(data.totals.ingresosNetos, currency)}</th>
                  <th className="num negative">{formatMoney(data.totals.gastosDeducibles, currency)}</th>
                  <th className="num">{formatMoney(data.totals.vatRepercutido, currency)}</th>
                  <th className="num">{formatMoney(data.totals.vatSoportado, currency)}</th>
                  <th className="num negative">{formatMoney(data.totals.vatAPagar, currency)}</th>
                  <th className="num">{formatMoney(data.totals.irpfRetenido, currency)}</th>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="card card--flush">
            <div className="card__header">
              <h2 className="card__title">Amortizaciones de bienes ({data.assets.length})</h2>
            </div>
            {data.assets.length === 0 ? (
              <p className="muted" style={{ padding: '0 20px 20px' }}>Sin bienes amortizables.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Bien</th>
                    <th>Categoría</th>
                    <th className="num">Base</th>
                    <th className="num">%</th>
                    <th className="num">Amort. anual</th>
                    <th className="num">Amort. {year}</th>
                    <th className="num">Acumulado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assets.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td className="muted">{a.category}</td>
                      <td className="num">{formatMoney(a.baseAmount, currency)}</td>
                      <td className="num">{Math.round(a.amortizationRate * 100)} %</td>
                      <td className="num">{formatMoney(a.annual, currency)}</td>
                      <td className="num">{formatMoney(a.amortizacion, currency)}</td>
                      <td className="num muted">{formatMoney(a.accumulated, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={5}>Total amortización {year}</th>
                    <th className="num">{formatMoney(data.totals.amortizacion, currency)}</th>
                    <th />
                  </tr>
                </tfoot>
              </table>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Simulación IRPF ({year})</h2>
            <dl className="detail-list">
              <div className="detail-row"><dt className="detail-row__label">Rendimiento actividades económicas</dt><dd className="detail-row__value">{formatMoney(data.simulation.actividad, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Rendimiento del trabajo</dt><dd className="detail-row__value">{formatMoney(data.simulation.trabajo, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Rendimiento del capital inmobiliario</dt><dd className="detail-row__value">{formatMoney(data.simulation.capital, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Base imponible (suma)</dt><dd className="detail-row__value">{formatMoney(data.simulation.base, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">− Mínimo personal y familiar</dt><dd className="detail-row__value">{formatMoney(data.simulation.minimoPersonal, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Base liquidable</dt><dd className="detail-row__value">{formatMoney(data.simulation.baseLiquidable, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Cuota íntegra estimada</dt><dd className="detail-row__value negative">{formatMoney(data.simulation.cuota, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">Retenciones practicadas</dt><dd className="detail-row__value positive">{formatMoney(data.simulation.retenido, currency)}</dd></div>
              <div className="detail-row"><dt className="detail-row__label">IRPF a pagar / a devolver</dt><dd className={`detail-row__value ${data.simulation.aPagar >= 0 ? 'negative' : 'positive'}`}>{formatMoney(Math.abs(data.simulation.aPagar), currency)}{data.simulation.aPagar >= 0 ? ' a pagar' : ' a devolver'}</dd></div>
            </dl>
          </section>

          <p className="muted small">
            Rendimiento neto = ingresos netos − gastos deducibles − amortización del año.
            IVA a pagar = IVA repercutido − IVA soportado deducible.
            La simulación de IRPF es orientativa: usa la escala configurada en Ajustes y no incluye
            mínimo personal, deducciones ni parte autonómica.
          </p>
        </>
      )}
    </div>
  );
}
