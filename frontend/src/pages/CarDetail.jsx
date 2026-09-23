import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { labelOf } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { FreeTransactionForm } from '../components/FreeTransactionForm.jsx';

const EMPTY = { name: '', brand: '', plate: '', notes: '' };

export default function CarDetail({ carId, navigate }) {
  const { currency } = useConfig();
  const [car, setCar] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cars, setCars] = useState([]);
  const [houses, setHouses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const load = () => {
    if (!carId) return;
    setLoading(true);
    Promise.all([api.get(`/cars/${carId}`), api.get('/contracts'), api.get('/transactions'), api.get('/cars'), api.get('/houses'), api.get('/members')])
      .then(([c, ct, tx, cars, hs, ms]) => {
        setCar(c);
        setContracts(ct);
        setTransactions(tx);
        setCars(cars);
        setHouses(hs);
        setMembers(ms);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [carId]);

  const carContracts = contracts.filter((c) => c.carId === carId);
  const carTransactions = transactions.filter((t) => t.carId === carId);
  const totalGastos = carTransactions.filter((t) => t.direction === 'expense').reduce((a, b) => a + (Number(b.amount) || 0), 0);

  const set = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const openEdit = () => { setEditForm({ name: car.name, brand: car.brand, plate: car.plate, notes: car.notes }); setEditOpen(true); };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/cars/${carId}`, editForm);
      setEditOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const addExpense = async (payload) => {
    try {
      await api.post('/transactions', { ...payload, carId });
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

  if (loading) return <div className="page"><p className="muted">Cargando coche…</p></div>;
  if (!car) return <div className="page"><p className="muted">Coche no encontrado.</p></div>;

  return (
    <div className="page">
      <button type="button" className="btn btn--sm back-link" onClick={() => navigate('/cars')}>← Coches</button>

      <header className="page__header">
        <div>
          <h1 className="page__title">{car.name}</h1>
          <p className="page__subtitle">{[car.brand, car.plate].filter(Boolean).join(' · ') || 'Sin datos'}</p>
        </div>
        <button type="button" className="btn" onClick={openEdit}>Editar</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}
      {car.notes && <p className="muted small">{car.notes}</p>}

      <div className="two-col">
        <section className="card">
          <h2 className="card__title">Contratos ({carContracts.length})</h2>
          {carContracts.length === 0 ? (
            <p className="muted">Este coche no tiene contratos asociados.</p>
          ) : (
            <ul className="list">
              {carContracts.map((c) => (
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
            <div className="detail-row"><dt className="detail-row__label">Movimientos</dt><dd className="detail-row__value">{carTransactions.length}</dd></div>
            <div className="detail-row"><dt className="detail-row__label">Total gastos</dt><dd className="detail-row__value negative">{formatMoney(totalGastos, currency)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">Movimientos ({carTransactions.length})</h2>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setExpenseOpen(true)}>+ Gasto puntual</button>
        </div>
        {carTransactions.length === 0 ? (
          <p className="muted" style={{ padding: '0 20px 20px' }}>Este coche aún no tiene movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Categoría</th><th>Contraparte</th><th className="num">Importe</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {carTransactions.map((t) => (
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

      <Modal title="Editar coche" open={editOpen} onClose={() => setEditOpen(false)}>
        <form className="form" onSubmit={saveEdit}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={editForm.name} onChange={set('name')} /></label>
            <label className="field"><span>Marca</span><input value={editForm.brand} onChange={set('brand')} /></label>
            <label className="field"><span>Matrícula</span><input value={editForm.plate} onChange={set('plate')} /></label>
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
          defaultCarId={carId}
          onSubmit={addExpense}
          onCancel={() => setExpenseOpen(false)}
        />
      </Modal>
    </div>
  );
}
