import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { labelOf, HOUSE_TYPES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';

const EMPTY = { name: '', address: '', city: '', type: 'owned', notes: '' };

export default function Houses() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => {
    setLoading(true);
    api.get('/houses').then(setHouses).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (house) => { setEditing(house); setForm({ ...house }); setModalOpen(true); };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/houses/${editing.id}`, form);
      else await api.post('/houses', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (house) => {
    if (!window.confirm(`¿Eliminar la vivienda "${house.name}"?`)) return;
    try {
      await api.del(`/houses/${house.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Viviendas</h1>
          <p className="page__subtitle">{houses.length} viviendas registradas</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>+ Nueva vivienda</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <section className="card card--flush">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Dirección</th><th>Ciudad</th><th>Tipo</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {houses.map((h) => (
                <tr key={h.id}>
                  <td>
                    <div className="cell-main">
                      <span className="cell-main__title">{h.name}</span>
                      {h.notes && <span className="muted small">{h.notes}</span>}
                    </div>
                  </td>
                  <td>{h.address || '—'}</td>
                  <td>{h.city || '—'}</td>
                  <td><span className="badge badge--neutral">{labelOf('houseType', h.type)}</span></td>
                  <td className="actions-col">
                    <button className="btn btn--sm" onClick={() => openEdit(h)}>Editar</button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove(h)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {houses.length === 0 && <tr><td colSpan={5} className="muted">Sin viviendas.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <Modal title={editing ? 'Editar vivienda' : 'Nueva vivienda'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="form" onSubmit={save}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={form.name} onChange={set('name')} /></label>
            <label className="field field--full"><span>Dirección</span><input value={form.address} onChange={set('address')} /></label>
            <label className="field"><span>Ciudad</span><input value={form.city} onChange={set('city')} /></label>
            <label className="field"><span>Tipo</span>
              <select value={form.type} onChange={set('type')}>
                {HOUSE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="field field--full"><span>Notas</span><textarea rows={2} value={form.notes} onChange={set('notes')} /></label>
          </div>
          <div className="form__actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
