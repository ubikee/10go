import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiUpload } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { labelOf, CONTRACT_TYPES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { ContractForm } from '../components/ContractForm.jsx';

export default function Contracts() {
  const { currency } = useConfig();
  const [contracts, setContracts] = useState([]);
  const [houses, setHouses] = useState([]);
  const [cars, setCars] = useState([]);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [review, setReview] = useState(null);
  const [transactionsModal, setTransactionsModal] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/contracts'), api.get('/houses'), api.get('/cars'), api.get('/members'), api.get('/settings')])
      .then(([c, h, cars, m, s]) => {
        setContracts(c);
        setHouses(h);
        setCars(cars);
        setMembers(m);
        setSettings(s);
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

  // ---- Subida de facturas / OCR ----
  const startUpload = (contract) => {
    setUploadTarget(contract);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const contract = uploadTarget;
    setUploadTarget(null);
    if (!file || !contract) return;
    setError(null);

    try {
      const form = new FormData();
      form.append('file', file);

      if (settings.invoiceOcr.autoSave) {
        await apiUpload(`/contracts/${contract.id}/transactions`, form);
        openTransactions(contract);
      } else {
        const extracted = await apiUpload('/ocr/extract', form);
        const holderMember = extracted.holder
          ? members.find((m) => extracted.holder.toLowerCase().includes(m.name.toLowerCase()))
          : null;
        setReview({
          contract,
          file,
          invoiceNumber: extracted.invoiceNumber ?? '',
          amount: extracted.amount ?? '',
          period: extracted.period ?? '',
          date: extracted.date ?? new Date().toISOString().slice(0, 10),
          baseAmount: extracted.baseAmount ?? '',
          vatPercent: Math.round((extracted.vatRate ?? contract.vatRate ?? 0.21) * 100),
          withholdingPercent: Math.round((extracted.withholdingRate ?? contract.withholdingRate ?? 0.15) * 100),
          memberId: holderMember?.id ?? contract.memberId ?? '',
          text: extracted.text ?? '',
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmReview = async () => {
    if (!review) return;
    try {
      const form = new FormData();
      form.append('file', review.file);
      if (review.invoiceNumber) form.append('invoiceNumber', review.invoiceNumber);
      if (review.period) form.append('billingPeriod', review.period);
      if (review.date) form.append('date', review.date);
      if (review.memberId) form.append('memberId', review.memberId);

      if (review.contract.type === 'freelance' && review.baseAmount !== '') {
        form.append('baseAmount', review.baseAmount);
        form.append('vatRate', review.vatPercent / 100);
        form.append('withholdingRate', review.withholdingPercent / 100);
      } else if (review.amount !== '' && review.amount != null) {
        form.append('amount', review.amount);
      }

      await apiUpload(`/contracts/${review.contract.id}/transactions`, form);
      setReview(null);
      openTransactions(review.contract);
    } catch (err) {
      setError(err.message);
    }
  };

  const openTransactions = async (contract) => {
    try {
      const list = await api.get(`/contracts/${contract.id}/transactions`);
      setTransactionsModal({ contract, list });
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteTransaction = async (transaction) => {
    if (!window.confirm('¿Eliminar este movimiento y su documento?')) return;
    try {
      await api.del(`/transactions/${transaction.id}`);
      if (transactionsModal) openTransactions(transactionsModal.contract);
    } catch (err) {
      setError(err.message);
    }
  };

  const ocrEnabled = settings?.invoiceOcr?.enabled;

  return (
    <div className="page">
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={onFileSelected} />

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
                      <span className="cell-main__title"><a className="link" href={`#/contracts/${c.id}`}>{c.name}</a></span>
                      <span className="muted small">
                        {c.amountType === 'variable' ? 'Variable' : memberName(c.memberId) ? `Responsable: ${memberName(c.memberId)}` : 'Sin responsable'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge--neutral">{labelOf('type', c.type)}</span>
                    {c.type === 'rental' && <span className="muted small"> · {labelOf('role', c.role)}</span>}
                    {c.type === 'supply' && c.subtype && <span className="muted small"> · {labelOf('subtype', c.subtype)}</span>}
                  </td>
                  <td className={`num ${c.direction === 'income' ? 'positive' : 'negative'}`}>
                    {c.amountType === 'variable' ? '—' : `${c.direction === 'income' ? '+' : '−'}${formatMoney(c.amount, c.currency || currency)}`}
                  </td>
                  <td>{c.amountType === 'variable' ? 'Variable' : labelOf('recurrence', c.recurrence)}</td>
                  <td>{houseName(c.houseId) || '—'}</td>
                  <td><span className={`status status--${c.status}`}>{labelOf('status', c.status)}</span></td>
                  <td className="muted">{formatDate(c.endDate)}</td>
                  <td className="actions-col">
                    {ocrEnabled && <button className="btn btn--sm" onClick={() => startUpload(c)}>Subir factura</button>}
                    <button className="btn btn--sm" onClick={() => openTransactions(c)}>Movimientos</button>
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
          cars={cars}
          members={members}
          currency={currency}
          onSubmit={save}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <Modal
        title="Revisar factura"
        open={!!review}
        onClose={() => setReview(null)}
      >
        <p className="muted small">Comprueba los datos extraídos por OCR antes de guardar el movimiento.</p>
        <div className="form__grid">
          <label className="field">
            <span>Nº de factura</span>
            <input value={review?.invoiceNumber ?? ''} onChange={(e) => setReview({ ...review, invoiceNumber: e.target.value })} />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={review?.date ?? ''} onChange={(e) => setReview({ ...review, date: e.target.value })} />
          </label>
          {review?.contract?.type === 'freelance' ? (
            <>
              <label className="field">
                <span>Base imponible ({currency})</span>
                <input type="number" step="0.01" min="0" value={review?.baseAmount ?? ''} onChange={(e) => setReview({ ...review, baseAmount: e.target.value })} />
              </label>
              <label className="field">
                <span>IVA %</span>
                <input type="number" min="0" max="100" step="1" value={review?.vatPercent ?? ''} onChange={(e) => setReview({ ...review, vatPercent: e.target.value })} />
              </label>
              <label className="field">
                <span>IRPF %</span>
                <input type="number" min="0" max="100" step="1" value={review?.withholdingPercent ?? ''} onChange={(e) => setReview({ ...review, withholdingPercent: e.target.value })} />
              </label>
              <label className="field">
                <span>IVA</span>
                <input disabled value={review?.baseAmount ? formatMoney(Number(review.baseAmount) * (Number(review.vatPercent) / 100), currency) : '—'} />
              </label>
              <label className="field">
                <span>Retención</span>
                <input disabled value={review?.baseAmount ? formatMoney(Number(review.baseAmount) * (Number(review.withholdingPercent) / 100), currency) : '—'} />
              </label>
              <label className="field">
                <span>Total a cobrar</span>
                <input disabled value={review?.baseAmount ? formatMoney(Number(review.baseAmount) * (1 + Number(review.vatPercent) / 100 - Number(review.withholdingPercent) / 100), currency) : '—'} />
              </label>
            </>
          ) : (
            <label className="field">
              <span>Importe ({currency})</span>
              <input type="number" step="0.01" min="0" value={review?.amount ?? ''} onChange={(e) => setReview({ ...review, amount: e.target.value })} />
            </label>
          )}
          <label className="field">
            <span>Responsable</span>
            <select value={review?.memberId ?? ''} onChange={(e) => setReview({ ...review, memberId: e.target.value })}>
              <option value="">—</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field field--full">
            <span>Periodo facturado</span>
            <input value={review?.period ?? ''} onChange={(e) => setReview({ ...review, period: e.target.value })} />
          </label>
        </div>
        {review?.text && (
          <details className="review-text">
            <summary className="muted small">Ver texto extraído del documento</summary>
            <pre className="review-text__pre">{review.text}</pre>
          </details>
        )}
        <div className="form__actions">
          <button type="button" className="btn" onClick={() => setReview(null)}>Cancelar</button>
          <button type="button" className="btn btn--primary" onClick={confirmReview}>Guardar movimiento</button>
        </div>
      </Modal>

      <Modal
        title={transactionsModal ? `Movimientos — ${transactionsModal.contract.name}` : 'Movimientos'}
        open={!!transactionsModal}
        onClose={() => setTransactionsModal(null)}
      >
        {transactionsModal?.list.length === 0 ? (
          <p className="muted">Este contrato aún no tiene movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Nº factura</th><th>Contraparte</th><th>Responsable</th><th className="num">Importe</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {transactionsModal?.list.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{formatDate(t.date)}</td>
                  <td>{t.invoiceNumber || '—'}</td>
                  <td>{t.counterparty || '—'}</td>
                  <td>{memberName(t.memberId) || '—'}</td>
                  <td className={`num ${t.direction === 'income' ? 'positive' : 'negative'}`}>
                    {t.direction === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency || currency)}
                  </td>
                  <td className="actions-col">
                    {t.storedName && <a className="btn btn--sm" href={`/api/transactions/${t.id}/document`} target="_blank" rel="noreferrer">Ver</a>}
                    <button className="btn btn--sm btn--danger" onClick={() => deleteTransaction(t)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
