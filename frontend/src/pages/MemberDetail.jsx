import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate, monthLabel } from '../lib/format.js';
import { labelOf } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { FreeTransactionForm } from '../components/FreeTransactionForm.jsx';

const ROLES = [
  { value: 'owner', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'member', label: 'Miembro' },
];

const EMPTY = { name: '', email: '', phone: '', role: 'member', notes: '' };

export default function MemberDetail({ memberId, navigate }) {
  const { currency } = useConfig();
  const [member, setMember] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [taxes, setTaxes] = useState(null);
  const [assets, setAssets] = useState([]);
  const [cars, setCars] = useState([]);
  const [houses, setHouses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const load = () => {
    if (!memberId) return;
    setLoading(true);
    const year = new Date().getFullYear();
    Promise.all([
      api.get(`/members/${memberId}`),
      api.get('/contracts'),
      api.get('/transactions'),
      api.get(`/members/${memberId}/forecast?months=12`),
      api.get(`/taxes?year=${year}&memberId=${memberId}`),
      api.get('/assets'),
      api.get('/cars'),
      api.get('/houses'),
      api.get('/members'),
    ])
      .then(([m, ct, tx, f, tax, assets, cars, hs, ms]) => {
        setMember(m);
        setContracts(ct);
        setTransactions(tx);
        setForecast(f);
        setTaxes(tax);
        setAssets(assets);
        setCars(cars);
        setHouses(hs);
        setMembers(ms);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [memberId]);

  const memberContracts = contracts.filter((c) => c.memberId === memberId);
  const memberTransactions = transactions.filter((t) => t.memberId === memberId);
  const memberAssets = assets.filter((a) => a.memberId === memberId);
  const totalGastos = memberTransactions.filter((t) => t.direction === 'expense').reduce((a, b) => a + (Number(b.amount) || 0), 0);
  const totalIngresos = memberTransactions.filter((t) => t.direction === 'income').reduce((a, b) => a + (b.baseAmount != null ? Number(b.baseAmount) : (Number(b.amount) || 0)), 0);

  const series = buildSeries(memberTransactions, forecast);
  const maxBar = Math.max(1, ...series.map((s) => Math.abs(s.net)));
  const roleLabel = ROLES.find((r) => r.value === member?.role)?.label ?? member?.role;

  const set = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const openEdit = () => {
    setEditForm({ name: member.name, email: member.email ?? '', phone: member.phone ?? '', role: member.role, notes: member.notes ?? '' });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${memberId}`, editForm);
      setEditOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addExpense = async (payload) => {
    try {
      await api.post('/transactions', { ...payload, memberId });
      setExpenseOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTransaction = async (t) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.del(`/transactions/${t.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page"><p className="muted">Cargando miembro…</p></div>;
  if (!member) return <div className="page"><p className="muted">Miembro no encontrado.</p></div>;

  return (
    <div className="page">
      <button type="button" className="btn btn--sm back-link" onClick={() => navigate('/members')}>← Miembros</button>

      <header className="page__header">
        <div>
          <h1 className="page__title">{member.name}</h1>
          <p className="page__subtitle">
            <span className="badge badge--neutral">{roleLabel}</span>
            {' '}
            {member.email && <span className="muted small">{member.email} · </span>}
            {member.phone && <span className="muted small">{member.phone}</span>}
          </p>
        </div>
        <button type="button" className="btn" onClick={openEdit}>Editar</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {member.notes && <p className="muted small">{member.notes}</p>}

      <section className="stats-grid">
        <div className="stat-card"><span className="stat-card__label">Contratos</span><span className="stat-card__value">{memberContracts.length}</span></div>
        <div className="stat-card"><span className="stat-card__label">Movimientos</span><span className="stat-card__value">{memberTransactions.length}</span></div>
        <div className="stat-card stat-card--positive"><span className="stat-card__label">Rendimiento neto (año)</span><span className="stat-card__value">{formatMoney(taxes?.totals?.rendimientoNeto ?? 0, currency)}</span></div>
        <div className="stat-card stat-card--negative"><span className="stat-card__label">IVA a pagar (año)</span><span className="stat-card__value">{formatMoney(taxes?.totals?.vatAPagar ?? 0, currency)}</span></div>
      </section>

      <div className="two-col">
        <section className="card">
          <h2 className="card__title">Contratos ({memberContracts.length})</h2>
          {memberContracts.length === 0 ? (
            <p className="muted">Este miembro no tiene contratos como responsable.</p>
          ) : (
            <ul className="list">
              {memberContracts.map((c) => (
                <li key={c.id} className="list__item">
                  <div>
                    <span className="list__title"><a className="link" href={`#/contracts/${c.id}`}>{c.name}</a></span>
                    <span className="muted small">{labelOf('type', c.type)} · {labelOf('direction', c.direction)}</span>
                  </div>
                  <span className={c.direction === 'income' ? 'positive' : 'negative'}>
                    {formatMoney(c.amount ?? 0, c.currency || currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="card__title">Impuestos ({new Date().getFullYear()})</h2>
          <dl className="detail-list">
            <div className="detail-row"><dt className="detail-row__label">Rendimiento neto</dt><dd className="detail-row__value positive">{formatMoney(taxes?.totals?.rendimientoNeto ?? 0, currency)}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">IVA a pagar</dt><dd className="detail-row__value negative">{formatMoney(taxes?.totals?.vatAPagar ?? 0, currency)}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">IRPF retenido</dt><dd className="detail-row__value">{formatMoney(taxes?.totals?.irpfRetenido ?? 0, currency)}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">Amortización</dt><dd className="detail-row__value">{formatMoney(taxes?.totals?.amortizacion ?? 0, currency)}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">Total gastos</dt><dd className="detail-row__value negative">{formatMoney(totalGastos, currency)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">Bienes de equipo ({memberAssets.length})</h2>
          <a className="btn btn--sm" href="#/assets">Gestionar</a>
        </div>
        {memberAssets.length === 0 ? (
          <p className="muted" style={{ padding: '0 20px 20px' }}>Este miembro no tiene bienes de equipo.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Categoría</th><th className="num">Base</th><th className="num">Amort. anual</th></tr>
            </thead>
            <tbody>
              {memberAssets.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td className="muted">{a.category}</td>
                  <td className="num">{formatMoney(a.baseAmount, currency)}</td>
                  <td className="num">{formatMoney(Number(a.baseAmount) * (Number(a.amortizationRate) || 0), currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Histórico y previsiones</h2>
        {series.length === 0 ? (
          <p className="muted">Sin datos para mostrar.</p>
        ) : (
          <>
            <div className="bar-chart bar-chart--single">
              {series.map((s) => (
                <div className="bar-chart__group" key={s.month} title={`${monthLabel(s.month)} · ${formatMoney(s.net, currency)}`}>
                  <div className="bar-chart__bars">
                    <div
                      className={`bar bar--${s.net >= 0 ? 'income' : 'expense'}${s.isActual ? '' : ' bar--forecast'}`}
                      style={{ height: `${(Math.abs(s.net) / maxBar) * 100}%` }}
                    />
                  </div>
                  <span className="bar-chart__label">{monthLabel(s.month).slice(0, 3).replace('.', '')}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              <span className="legend__item"><i className="legend__dot legend__dot--actual" /> Real (movimientos)</span>
              <span className="legend__item"><i className="legend__dot legend__dot--forecast" /> Previsión</span>
            </div>
          </>
        )}
      </section>

      <section className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">Movimientos ({memberTransactions.length})</h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setExpenseOpen(true)}>+ Gasto puntual</button>
        </div>
        {memberTransactions.length === 0 ? (
          <p className="muted" style={{ padding: '0 20px 20px' }}>Este miembro aún no tiene movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Contraparte</th><th className="num">Importe</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {memberTransactions.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{formatDate(t.date)}</td>
                  <td>{t.category || '—'}</td>
                  <td>{t.counterparty || '—'}</td>
                  <td className={`num ${t.direction === 'income' ? 'positive' : 'negative'}`}>
                    {t.direction === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency || currency)}
                  </td>
                  <td className="actions-col">
                    <button className="btn btn--sm btn--danger" onClick={() => deleteTransaction(t)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal title="Editar miembro" open={editOpen} onClose={() => setEditOpen(false)}>
        <form className="form" onSubmit={saveEdit}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={editForm.name} onChange={set('name')} /></label>
            <label className="field"><span>Email</span><input type="email" value={editForm.email} onChange={set('email')} /></label>
            <label className="field"><span>Teléfono</span><input value={editForm.phone} onChange={set('phone')} /></label>
            <label className="field"><span>Rol</span>
              <select value={editForm.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="field field--full"><span>Notas</span><textarea rows={2} value={editForm.notes} onChange={set('notes')} /></label>
          </div>
          <div className="form__actions">
            <button type="button" className="btn" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal title="Gasto puntual" open={expenseOpen} onClose={() => setExpenseOpen(false)}>
        <FreeTransactionForm
          cars={cars}
          houses={houses}
          members={members}
          onSubmit={addExpense}
          onCancel={() => setExpenseOpen(false)}
        />
      </Modal>
    </div>
  );
}

function buildSeries(transactions, forecast) {
  const actual = {};
  transactions.forEach((t) => {
    const m = (t.date || '').slice(0, 7);
    const sign = t.direction === 'income' ? 1 : -1;
    const net = sign * (t.baseAmount != null ? Number(t.baseAmount) : (Number(t.amount) || 0));
    actual[m] = (actual[m] || 0) + net;
  });
  const future = {};
  (forecast?.months || []).forEach((f) => {
    future[f.month] = f.income - f.expense;
  });
  const months = [...new Set([...Object.keys(actual), ...Object.keys(future)])].sort();
  return months.map((m) => ({
    month: m,
    net: m in actual ? actual[m] : (future[m] ?? 0),
    isActual: m in actual,
  }));
}
