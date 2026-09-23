import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { ASSET_CATEGORIES, ASSET_STATUSES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';

const EMPTY = { name: '', category: 'informatica', memberId: '', acquisitionDate: new Date().toISOString().slice(0, 10), baseAmount: '', vatPercent: 21, amortPercent: 26, notes: '' };

export default function Assets() {
  const { currency } = useConfig();
  const [assets, setAssets] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [schedule, setSchedule] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/assets'), api.get('/members')])
      .then(([a, m]) => { setAssets(a); setMembers(m); setError(null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const memberName = (id) => members.find((m) => m.id === id)?.name;
  const categoryOf = (v) => ASSET_CATEGORIES.find((c) => c.value === v);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (asset) => {
    setEditing(asset);
    setForm({
      name: asset.name, category: asset.category, memberId: asset.memberId ?? '',
      acquisitionDate: asset.acquisitionDate, baseAmount: asset.baseAmount,
      vatPercent: Math.round((asset.vatRate ?? 0.21) * 100), amortPercent: Math.round((asset.amortizationRate ?? 0.12) * 100),
      notes: asset.notes ?? '',
    });
    setModalOpen(true);
  };

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'category') {
        next.amortPercent = Math.round((ASSET_CATEGORIES.find((c) => c.value === value)?.rate ?? 0.12) * 100);
      }
      return next;
    });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        category: form.category,
        memberId: form.memberId || null,
        acquisitionDate: form.acquisitionDate,
        baseAmount: Number(form.baseAmount),
        vatRate: form.vatPercent / 100,
        amortizationRate: form.amortPercent / 100,
        notes: form.notes || null,
      };
      if (editing) await api.put(`/assets/${editing.id}`, payload);
      else await api.post('/assets', payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (asset) => {
    if (!window.confirm(`¿Eliminar el bien "${asset.name}"?`)) return;
    try {
      await api.del(`/assets/${asset.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const viewSchedule = async (asset) => {
    try {
      const s = await api.get(`/assets/${asset.id}/schedule`);
      setSchedule({ asset, ...s });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Bienes de equipo</h1>
          <p className="page__subtitle">{assets.length} bienes registrados</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>+ Nuevo bien</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <section className="card card--flush">
        {loading ? (
          <p className="muted" style={{ padding: 20 }}>Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Categoría</th><th>Titular</th><th className="num">Base</th><th className="num">IVA soportado</th><th className="num">Amort. %</th><th>Estado</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="cell-main">
                      <span className="cell-main__title">{a.name}</span>
                      <span className="muted small">Adquirido {formatDate(a.acquisitionDate)}</span>
                    </div>
                  </td>
                  <td>{categoryOf(a.category)?.label ?? a.category}</td>
                  <td>{memberName(a.memberId) || '—'}</td>
                  <td className="num">{formatMoney(a.baseAmount, currency)}</td>
                  <td className="num">{formatMoney(a.vatAmount ?? 0, currency)}</td>
                  <td className="num">{Math.round((a.amortizationRate ?? 0) * 100)} %</td>
                  <td><span className="badge badge--neutral">{ASSET_STATUSES.find((s) => s.value === a.status)?.label ?? a.status}</span></td>
                  <td className="actions-col">
                    <button className="btn btn--sm" onClick={() => viewSchedule(a)}>Amort.</button>
                    <button className="btn btn--sm" onClick={() => openEdit(a)}>Editar</button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove(a)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && <tr><td colSpan={8} className="muted">Sin bienes de equipo.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <Modal title={editing ? 'Editar bien' : 'Nuevo bien'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="form" onSubmit={save}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={form.name} onChange={set('name')} placeholder="Ej. MacBook Pro" /></label>
            <label className="field"><span>Categoría</span>
              <select value={form.category} onChange={set('category')}>
                {ASSET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="field"><span>Titular</span>
              <select value={form.memberId} onChange={set('memberId')}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Fecha de adquisición</span>
              <input type="date" value={form.acquisitionDate} onChange={set('acquisitionDate')} />
            </label>
            <label className="field"><span>Base imponible ({currency})</span>
              <input required type="number" step="0.01" min="0" value={form.baseAmount} onChange={set('baseAmount')} />
            </label>
            <label className="field"><span>IVA %</span>
              <input type="number" min="0" max="100" step="1" value={form.vatPercent} onChange={set('vatPercent')} />
            </label>
            <label className="field"><span>Amortización % (anual)</span>
              <input type="number" min="0" max="100" step="1" value={form.amortPercent} onChange={set('amortPercent')} />
            </label>
            <label className="field field--full"><span>Notas</span>
              <textarea rows={2} value={form.notes} onChange={set('notes')} />
            </label>
          </div>
          <div className="form__actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Guardar</button>
          </div>
        </form>
      </Modal>

      <Modal title={schedule ? `Amortización — ${schedule.asset.name}` : 'Amortización'} open={!!schedule} onClose={() => setSchedule(null)}>
        {schedule && (
          <>
            <p className="muted small">
              Base {formatMoney(schedule.asset.baseAmount, currency)} · amortización anual {formatMoney(schedule.annual, currency)} ({Math.round(schedule.asset.amortizationRate * 100)} %)
            </p>
            <table className="table">
              <thead>
                <tr><th>Año</th><th className="num">Amortización</th><th className="num">Acumulado</th></tr>
              </thead>
              <tbody>
                {schedule.schedule.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td className="num">{formatMoney(y.amount, currency)}</td>
                    <td className="num muted">{formatMoney(y.accumulated, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </div>
  );
}
