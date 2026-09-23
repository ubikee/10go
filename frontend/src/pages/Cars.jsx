import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';

const EMPTY = { name: '', brand: '', plate: '', notes: '' };

export default function Cars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => {
    setLoading(true);
    api.get('/cars').then(setCars).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (car) => { setEditing(car); setForm({ ...car }); setModalOpen(true); };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/cars/${editing.id}`, form);
      else await api.post('/cars', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (car) => {
    if (!window.confirm(`¿Eliminar el coche "${car.name}"?`)) return;
    try {
      await api.del(`/cars/${car.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Coches</h1>
          <p className="page__subtitle">{cars.length} coches registrados</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>+ Nuevo coche</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <section className="card card--flush">
        {loading ? (
          <p className="muted" style={{ padding: 20 }}>Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Marca</th><th>Matrícula</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {cars.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">
                      <span className="cell-main__title"><a className="link" href={`#/cars/${c.id}`}>{c.name}</a></span>
                      {c.notes && <span className="muted small">{c.notes}</span>}
                    </div>
                  </td>
                  <td>{c.brand || '—'}</td>
                  <td>{c.plate || '—'}</td>
                  <td className="actions-col">
                    <button className="btn btn--sm" onClick={() => openEdit(c)}>Editar</button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {cars.length === 0 && <tr><td colSpan={4} className="muted">Sin coches.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <Modal title={editing ? 'Editar coche' : 'Nuevo coche'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="form" onSubmit={save}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Marca</span><input value={form.brand} onChange={set('brand')} /></label>
            <label className="field"><span>Matrícula</span><input value={form.plate} onChange={set('plate')} /></label>
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
