import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate, monthLabel } from '../lib/format.js';
import { labelOf, HOUSE_TYPES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { FreeTransactionForm } from '../components/FreeTransactionForm.jsx';

const EMPTY = { name: '', address: '', city: '', type: 'owned', notes: '' };

export default function HouseDetail({ houseId, navigate }) {
  const { currency } = useConfig();
  const [house, setHouse] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [cars, setCars] = useState([]);
  const [houses, setHouses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const load = () => {
    if (!houseId) return;
    setLoading(true);
    Promise.all([
      api.get(`/houses/${houseId}`),
      api.get('/contracts'),
      api.get('/transactions'),
      api.get(`/houses/${houseId}/forecast?months=12`),
      api.get('/cars'),
      api.get('/houses'),
      api.get('/members'),
    ])
      .then(([h, ct, tx, f, cars, hs, ms]) => {
        setHouse(h);
        setContracts(ct);
        setTransactions(tx);
        setForecast(f);
        setCars(cars);
        setHouses(hs);
        setMembers(ms);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [houseId]);

  const houseContracts = contracts.filter((c) => c.houseId === houseId);
  const houseTransactions = transactions.filter((t) => t.houseId === houseId);
  const totalGastos = houseTransactions.filter((t) => t.direction === 'expense').reduce((a, b) => a + (Number(b.amount) || 0), 0);

  const series = buildSeries(houseTransactions, forecast);
  const maxBar = Math.max(1, ...series.map((s) => Math.abs(s.net)));
  const nextForecast = series.find((s) => !s.isActual)?.net ?? 0;

  const set = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const openEdit = () => {
    setEditForm({ name: house.name, address: house.address ?? '', city: house.city ?? '', type: house.type, notes: house.notes ?? '' });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/houses/${houseId}`, editForm);
      setEditOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addExpense = async (payload) => {
    try {
      await api.post('/transactions', { ...payload, houseId });
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

  if (loading) return <div className="page"><p className="muted">Cargando vivienda…</p></div>;
  if (!house) return <div className="page"><p className="muted">Vivienda no encontrada.</p></div>;

  return (
    <div className="page">
      <button type="button" className="btn btn--sm back-link" onClick={() => navigate('/houses')}>← Viviendas</button>

      <header className="page__header">
        <div>
          <h1 className="page__title">{house.name}</h1>
          <p className="page__subtitle">
            <span className="badge badge--neutral">{labelOf('houseType', house.type)}</span>
            {' '}
            {[house.address, house.city].filter(Boolean).join(', ') && <span className="muted small">{[house.address, house.city].filter(Boolean).join(', ')}</span>}
          </p>
        </div>
        <button type="button" className="btn" onClick={openEdit}>Editar</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {house.notes && <p className="muted small">{house.notes}</p>}

      <div className="two-col">
        <section className="card">
          <h2 className="card__title">Contratos ({houseContracts.length})</h2>
          {houseContracts.length === 0 ? (
            <p className="muted">Esta vivienda no tiene contratos asociados.</p>
          ) : (
            <ul className="list">
              {houseContracts.map((c) => (
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
          <h2 className="card__title">Resumen</h2>
          <dl className="detail-list">
            <div className="detail-row"><dt className="detail-row__label">Movimientos</dt><dd className="detail-row__value">{houseTransactions.length}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">Total gastos</dt><dd className="detail-row__value negative">{formatMoney(totalGastos, currency)}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">Previsión próximo mes</dt><dd className={`detail-row__value ${nextForecast >= 0 ? 'positive' : 'negative'}`}>{formatMoney(nextForecast, currency)}</dd></div>
          </dl>
        </section>
      </div>

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
          <h2 className="card__title">Movimientos ({houseTransactions.length})</h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setExpenseOpen(true)}>+ Gasto puntual</button>
        </div>
        {houseTransactions.length === 0 ? (
          <p className="muted" style={{ padding: '0 20px 20px' }}>Esta vivienda aún no tiene movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Contraparte</th><th className="num">Importe</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {houseTransactions.map((t) => (
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

      <Modal title="Editar vivienda" open={editOpen} onClose={() => setEditOpen(false)}>
        <form className="form" onSubmit={saveEdit}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={editForm.name} onChange={set('name')} /></label>
            <label className="field field--full"><span>Dirección</span><input value={editForm.address} onChange={set('address')} /></label>
            <label className="field"><span>Ciudad</span><input value={editForm.city} onChange={set('city')} /></label>
            <label className="field"><span>Tipo</span>
              <select value={editForm.type} onChange={set('type')}>
                {HOUSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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
          defaultHouseId={houseId}
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
