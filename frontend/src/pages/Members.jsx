import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Modal } from '../components/Modal.jsx';

const EMPTY = { name: '', email: '', phone: '', role: 'member', notes: '' };

const ROLES = [
  { value: 'owner', label: 'Propietario' },
  { value: 'admin', label: 'Administrador' },
  { value: 'member', label: 'Miembro' },
];

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => {
    setLoading(true);
    api.get('/members').then(setMembers).catch((e) => setError(e.message)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModalOpen(true); };
  const openEdit = (member) => { setEditing(member); setForm({ ...member }); setModalOpen(true); };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/members/${editing.id}`, form);
      else await api.post('/members', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (member) => {
    if (!window.confirm(`¿Eliminar a "${member.name}"?`)) return;
    try {
      await api.del(`/members/${member.id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Miembros</h1>
          <p className="page__subtitle">{members.length} miembros de la familia u organización</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>+ Nuevo miembro</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <section className="card card--flush">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="cell-main">
                      <span className="cell-main__title"><a className="link" href={`#/members/${m.id}`}>{m.name}</a></span>
                      {m.notes && <span className="muted small">{m.notes}</span>}
                    </div>
                  </td>
                  <td>{m.email || '—'}</td>
                  <td>{m.phone || '—'}</td>
                  <td><span className="badge badge--neutral">{roleLabel(m.role)}</span></td>
                  <td className="actions-col">
                    <button className="btn btn--sm" onClick={() => openEdit(m)}>Editar</button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove(m)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && <tr><td colSpan={5} className="muted">Sin miembros.</td></tr>}
            </tbody>
          </table>
        )}
      </section>

      <Modal title={editing ? 'Editar miembro' : 'Nuevo miembro'} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="form" onSubmit={save}>
          <div className="form__grid">
            <label className="field field--full"><span>Nombre</span><input required value={form.name} onChange={set('name')} /></label>
            <label className="field"><span>Email</span><input type="email" value={form.email} onChange={set('email')} /></label>
            <label className="field"><span>Teléfono</span><input value={form.phone} onChange={set('phone')} /></label>
            <label className="field"><span>Rol</span>
              <select value={form.role} onChange={set('role')}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
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
