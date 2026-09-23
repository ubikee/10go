import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { labelOf, CONTRACT_TYPES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { ContractForm } from '../components/ContractForm.jsx';

export default function Contracts() {
  const { currency } = useConfig();
  const [contracts, setContracts] = useState([]);
  const [houses, setHouses] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/contracts'), api.get('/houses'), api.get('/members')])
      .then(([c, h, m]) => {
        setContracts(c);
        setHouses(h);
        setMembers(m);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const houseName = (id) => houses.find((h) => h.id === id)?.name;
  const memberName = (id) => members.find((m) => m.id === id)?.name;

  const filtered = useMemo(() => contracts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || c.type === typeFilter;
    return matchSearch && matchType;
  }), [contracts, search, typeFilter]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (contract) => { setEditing(contract); setModalOpen(true); };

  const save = async (payload) => {
    try {
      if (editing) await api.put(`/contracts/${editing.id}`, payload);
      else await api.post('/contracts', payload);
      setModalOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (contract) => {
    if (!window.confirm(`¿Eliminar el contrato "${contract.name}"?`)) return;
    try {
      await api.del(`/contracts/${contract.id}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Contratos</h1>
          <p className="page__subtitle">{contracts.length} contratos registrados</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={openCreate}>+ Nuevo contrato</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="toolbar">
        <input
          className="input"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <section className="card card--flush">
        {loading ? (
          <p className="muted">Cargando…</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th className="num">Importe</th>
                <th>Frecuencia</th>
                <th>Vivienda</th>
                <th>Estado</th>
                <th>Vence</th>
                <th className="actions-col" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="cell-main">
                      <span className="cell-main__title">{c.name}</span>
                      <span className="muted small">{memberName(c.memberId) ? `Responsable: ${memberName(c.memberId)}` : 'Sin responsable'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge--neutral">{labelOf('type', c.type)}</span>
                    {c.type === 'rental' && <span className="muted small"> · {labelOf('role', c.role)}</span>}
                    {c.type === 'supply' && c.subtype && <span className="muted small"> · {labelOf('subtype', c.subtype)}</span>}
                  </td>
                  <td className={`num ${c.direction === 'income' ? 'positive' : 'negative'}`}>
                    {c.direction === 'income' ? '+' : '−'}{formatMoney(c.amount, c.currency || currency)}
                  </td>
                  <td>{labelOf('recurrence', c.recurrence)}</td>
                  <td>{houseName(c.houseId) || '—'}</td>
                  <td><span className={`status status--${c.status}`}>{labelOf('status', c.status)}</span></td>
                  <td className="muted">{formatDate(c.endDate)}</td>
                  <td className="actions-col">
                    <button className="btn btn--sm" onClick={() => openEdit(c)}>Editar</button>
                    <button className="btn btn--sm btn--danger" onClick={() => remove(c)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="muted">Sin resultados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>

      <Modal
        title={editing ? 'Editar contrato' : 'Nuevo contrato'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <ContractForm
          initial={editing}
          houses={houses}
          members={members}
          currency={currency}
          onSubmit={save}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
