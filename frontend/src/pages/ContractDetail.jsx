import { useEffect, useRef, useState } from 'react';
import { api, apiUpload } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate, monthLabel } from '../lib/format.js';
import { labelOf } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { ContractForm } from '../components/ContractForm.jsx';

const EMPTY_MANUAL = { amount: '', baseAmount: '', vatPercent: 21, withholdingPercent: 15, date: new Date().toISOString().slice(0, 10), invoiceNumber: '', counterparty: '', memberId: '', notes: '' };

export default function ContractDetail({ contractId, navigate }) {
  const { currency } = useConfig();
  const [contract, setContract] = useState(null);
  const [houses, setHouses] = useState([]);
  const [cars, setCars] = useState([]);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [review, setReview] = useState(null);
  const fileInputRef = useRef(null);

  const load = () => {
    if (!contractId) return;
    setLoading(true);
    Promise.all([
      api.get(`/contracts/${contractId}`),
      api.get('/houses'),
      api.get('/cars'),
      api.get('/members'),
      api.get('/settings'),
      api.get(`/contracts/${contractId}/transactions`),
      api.get(`/contracts/${contractId}/forecast?months=12`),
    ])
      .then(([c, h, cars, m, s, t, f]) => {
        setContract(c);
        setHouses(h);
        setCars(cars);
        setMembers(m);
        setSettings(s);
        setTransactions(t);
        setForecast(f);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [contractId]);

  const houseName = (id) => houses.find((h) => h.id === id)?.name;
  const memberName = (id) => members.find((m) => m.id === id)?.name;

  const saveEdit = async (payload) => {
    try {
      await api.put(`/contracts/${contractId}`, payload);
      setEditOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  // ---- Movimiento manual (autónomo / cobro) ----
  const openManual = () => {
    setManual({
      ...EMPTY_MANUAL,
      date: new Date().toISOString().slice(0, 10),
      vatPercent: Math.round((contract?.vatRate ?? 0.21) * 100),
      withholdingPercent: Math.round((contract?.withholdingRate ?? 0.15) * 100),
      memberId: contract?.memberId ?? '',
    });
    setManualOpen(true);
  };

  const submitManual = async (e) => {
    e.preventDefault();
    try {
      const payload = isFreelance
        ? {
            baseAmount: manual.baseAmount,
            vatRate: manual.vatPercent / 100,
            withholdingRate: manual.withholdingPercent / 100,
            date: manual.date,
            invoiceNumber: manual.invoiceNumber,
            counterparty: manual.counterparty,
            memberId: manual.memberId || null,
            notes: manual.notes,
          }
        : {
            amount: manual.amount,
            date: manual.date,
            invoiceNumber: manual.invoiceNumber,
            counterparty: manual.counterparty,
            memberId: manual.memberId || null,
            notes: manual.notes,
          };
      await api.post(`/contracts/${contractId}/transactions`, payload);
      setManualOpen(false);
      setManual(EMPTY_MANUAL);
      loadTransactions();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---- Subida de facturas / OCR ----
  const startUpload = () => fileInputRef.current?.click();

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      if (settings.invoiceOcr.autoSave) {
        await apiUpload(`/contracts/${contractId}/transactions`, form);
        loadTransactions();
      } else {
        const extracted = await apiUpload('/ocr/extract', form);
        const holderMember = extracted.holder
          ? members.find((m) => extracted.holder.toLowerCase().includes(m.name.toLowerCase()))
          : null;
        setReview({
          file,
          invoiceNumber: extracted.invoiceNumber ?? '',
          amount: extracted.amount ?? '',
          period: extracted.period ?? '',
          date: extracted.date ?? new Date().toISOString().slice(0, 10),
          baseAmount: extracted.baseAmount ?? '',
          vatPercent: Math.round((extracted.vatRate ?? contract?.vatRate ?? 0.21) * 100),
          withholdingPercent: Math.round((extracted.withholdingRate ?? contract?.withholdingRate ?? 0.15) * 100),
          memberId: holderMember?.id ?? contract?.memberId ?? '',
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

      if (isFreelance && review.baseAmount !== '') {
        form.append('baseAmount', review.baseAmount);
        form.append('vatRate', review.vatPercent / 100);
        form.append('withholdingRate', review.withholdingPercent / 100);
      } else if (review.amount !== '' && review.amount != null) {
        form.append('amount', review.amount);
      }

      await apiUpload(`/contracts/${contractId}/transactions`, form);
      setReview(null);
      loadTransactions();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadTransactions = () => {
    api.get(`/contracts/${contractId}/transactions`).then(setTransactions).catch((e) => setError(e.message));
  };

  const deleteTransaction = async (transaction) => {
    if (!window.confirm('¿Eliminar este movimiento y su documento?')) return;
    try {
      await api.del(`/transactions/${transaction.id}`);
      loadTransactions();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page"><p className="muted">Cargando contrato…</p></div>;
  if (!contract) return <div className="page"><p className="muted">Contrato no encontrado.</p></div>;

  const isVariable = contract.amountType === 'variable';
  const isFreelance = contract.type === 'freelance';
  const series = buildSeries(transactions, forecast, contract.direction);
  const maxBar = Math.max(1, ...series.map((s) => s.amount));
  const totalHistorico = series.filter((s) => s.isActual).reduce((a, b) => a + b.amount, 0);
  const ocrEnabled = settings?.invoiceOcr?.enabled;

  const reviewVat = review?.baseAmount ? Number(review.baseAmount) * (Number(review.vatPercent) / 100) : 0;
  const reviewWh = review?.baseAmount ? Number(review.baseAmount) * (Number(review.withholdingPercent) / 100) : 0;
  const reviewTotal = review?.baseAmount ? Number(review.baseAmount) + reviewVat - reviewWh : 0;

  return (
    <div className="page">
      <input ref={fileInputRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }} onChange={onFileSelected} />

      <button type="button" className="btn btn--sm back-link" onClick={() => navigate('/contracts')}>← Contratos</button>

      <header className="page__header">
        <div>
          <h1 className="page__title">{contract.name}</h1>
          <p className="page__subtitle">
            <span className="badge badge--neutral">{labelOf('type', contract.type)}</span>
            {' '}
            {contract.type === 'rental' && <span className="muted small">{labelOf('role', contract.role)} · </span>}
            {contract.type === 'supply' && contract.subtype && <span className="muted small">{labelOf('subtype', contract.subtype)} · </span>}
            <span className="muted small">{labelOf('amountType', contract.amountType)}</span>
            <span className={`status status--${contract.status}`}> {labelOf('status', contract.status)}</span>
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setEditOpen(true)}>Editar datos</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="two-col">
        <section className="card">
          <h2 className="card__title">Datos del contrato</h2>
          <dl className="detail-list">
            <DetailRow
              label="Importe"
              value={isVariable && contract.amount == null
                ? 'Variable'
                : `${contract.direction === 'income' ? '+' : '−'}${formatMoney(contract.amount, contract.currency || currency)}${isVariable ? ' (estimado)' : ` / ${labelOf('recurrence', contract.recurrence).toLowerCase()}`}`}
              tone={contract.direction === 'income' ? 'positive' : 'negative'}
            />
            <DetailRow label="Dirección" value={labelOf('direction', contract.direction)} />
            <DetailRow label="Inicio" value={formatDate(contract.startDate)} />
            <DetailRow label="Fin" value={formatDate(contract.endDate)} />
            {!isVariable && <DetailRow label="Día de pago" value={contract.paymentDay ?? '—'} />}
            <DetailRow label="Vivienda" value={houseName(contract.houseId) || '—'} />
            <DetailRow label="Responsable" value={memberName(contract.memberId) || '—'} />
            {contract.notes && <DetailRow label="Notas" value={contract.notes} />}
          </dl>
        </section>

        <section className="card">
          <h2 className="card__title">Resumen</h2>
          <dl className="detail-list">
            <DetailRow label="Movimientos registrados" value={transactions.length} />
            <DetailRow label="Total histórico (movimientos)" value={formatMoney(totalHistorico, currency)} />
            <DetailRow label="Previsión próximo mes" value={formatMoney(series.find((s) => !s.isActual)?.amount ?? 0, currency)} />
            <DetailRow label="Media / mes (histórico)" value={formatMoney(mediaMensual(series), currency)} />
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
                <div className="bar-chart__group" key={s.month} title={`${monthLabel(s.month)} · ${formatMoney(s.amount, currency)}`}>
                  <div className="bar-chart__bars">
                    <div
                      className={`bar bar--${contract.direction === 'income' ? 'income' : 'expense'}${s.isActual ? '' : ' bar--forecast'}`}
                      style={{ height: `${(s.amount / maxBar) * 100}%` }}
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
          <h2 className="card__title">Movimientos ({transactions.length})</h2>
          <div className="actions-col">
            <button type="button" className="btn btn--sm" onClick={openManual}>+ Nuevo movimiento</button>
            {ocrEnabled && <button type="button" className="btn btn--primary btn--sm" onClick={startUpload}>+ Subir factura</button>}
          </div>
        </div>
        {transactions.length === 0 ? (
          <p className="muted" style={{ padding: '0 20px 20px' }}>Este contrato aún no tiene movimientos.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Fecha</th><th>Nº factura</th><th>Contraparte</th><th>Responsable</th><th className="num">Importe</th><th>Periodo</th><th className="actions-col" /></tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="muted">{formatDate(t.date)}</td>
                  <td>{t.invoiceNumber || '—'}</td>
                  <td>{t.counterparty || '—'}</td>
                  <td>{memberName(t.memberId) || '—'}</td>
                  <td className={`num ${t.direction === 'income' ? 'positive' : 'negative'}`}>
                    {t.direction === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency || currency)}
                  </td>
                  <td className="muted">{t.billingPeriod || '—'}</td>
                  <td className="actions-col">
                    {t.storedName && <a className="btn btn--sm" href={`/api/transactions/${t.id}/document`} target="_blank" rel="noreferrer">Ver factura</a>}
                    <button className="btn btn--sm btn--danger" onClick={() => deleteTransaction(t)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal title="Editar contrato" open={editOpen} onClose={() => setEditOpen(false)}>
        <ContractForm
          initial={contract}
          houses={houses}
          cars={cars}
          members={members}
          currency={currency}
          onSubmit={saveEdit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      <Modal title="Nuevo movimiento" open={manualOpen} onClose={() => setManualOpen(false)}>
        <form className="form" onSubmit={submitManual}>
          <div className="form__grid">
            {isFreelance ? (
              <>
                <label className="field"><span>Base imponible ({currency})</span>
                  <input required type="number" step="0.01" min="0" value={manual.baseAmount} onChange={(e) => setManual({ ...manual, baseAmount: e.target.value })} />
                </label>
                <label className="field"><span>IVA %</span>
                  <input type="number" min="0" max="100" step="1" value={manual.vatPercent} onChange={(e) => setManual({ ...manual, vatPercent: e.target.value })} />
                </label>
                <label className="field"><span>IRPF %</span>
                  <input type="number" min="0" max="100" step="1" value={manual.withholdingPercent} onChange={(e) => setManual({ ...manual, withholdingPercent: e.target.value })} />
                </label>
                <label className="field">
                  <span>Total a cobrar</span>
                  <input disabled value={manual.baseAmount ? formatMoney(Number(manual.baseAmount) * (1 + manual.vatPercent / 100 - manual.withholdingPercent / 100), currency) : '—'} />
                </label>
              </>
            ) : (
              <label className="field"><span>Importe ({currency})</span>
                <input required type="number" step="0.01" min="0" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: e.target.value })} />
              </label>
            )}
            <label className="field"><span>Fecha</span>
              <input type="date" value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} />
            </label>
            <label className="field"><span>Nº de factura</span>
              <input value={manual.invoiceNumber} onChange={(e) => setManual({ ...manual, invoiceNumber: e.target.value })} />
            </label>
            <label className="field"><span>Contraparte (cliente/proveedor)</span>
              <input value={manual.counterparty} onChange={(e) => setManual({ ...manual, counterparty: e.target.value })} />
            </label>
            <label className="field"><span>Responsable</span>
              <select value={manual.memberId} onChange={(e) => setManual({ ...manual, memberId: e.target.value })}>
                <option value="">—</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="field field--full"><span>Notas</span>
              <textarea rows={2} value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} />
            </label>
          </div>
          <div className="form__actions">
            <button type="button" className="btn" onClick={() => setManualOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn--primary">Guardar movimiento</button>
          </div>
        </form>
      </Modal>

      <Modal title="Revisar factura" open={!!review} onClose={() => setReview(null)}>
        <div className="form__grid">
          <label className="field"><span>Nº de factura</span>
            <input value={review?.invoiceNumber ?? ''} onChange={(e) => setReview({ ...review, invoiceNumber: e.target.value })} />
          </label>
          <label className="field"><span>Fecha</span>
            <input type="date" value={review?.date ?? ''} onChange={(e) => setReview({ ...review, date: e.target.value })} />
          </label>
          {isFreelance ? (
            <>
              <label className="field"><span>Base imponible ({currency})</span>
                <input type="number" step="0.01" min="0" value={review?.baseAmount ?? ''} onChange={(e) => setReview({ ...review, baseAmount: e.target.value })} />
              </label>
              <label className="field"><span>IVA %</span>
                <input type="number" min="0" max="100" step="1" value={review?.vatPercent ?? ''} onChange={(e) => setReview({ ...review, vatPercent: e.target.value })} />
              </label>
              <label className="field"><span>IRPF %</span>
                <input type="number" min="0" max="100" step="1" value={review?.withholdingPercent ?? ''} onChange={(e) => setReview({ ...review, withholdingPercent: e.target.value })} />
              </label>
              <label className="field"><span>IVA</span>
                <input disabled value={review?.baseAmount ? formatMoney(reviewVat, currency) : '—'} />
              </label>
              <label className="field"><span>Retención</span>
                <input disabled value={review?.baseAmount ? formatMoney(reviewWh, currency) : '—'} />
              </label>
              <label className="field"><span>Total a cobrar</span>
                <input disabled value={review?.baseAmount ? formatMoney(reviewTotal, currency) : '—'} />
              </label>
            </>
          ) : (
            <label className="field"><span>Importe ({currency})</span>
              <input type="number" step="0.01" min="0" value={review?.amount ?? ''} onChange={(e) => setReview({ ...review, amount: e.target.value })} />
            </label>
          )}
          <label className="field"><span>Responsable</span>
            <select value={review?.memberId ?? ''} onChange={(e) => setReview({ ...review, memberId: e.target.value })}>
              <option value="">—</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="field field--full"><span>Periodo facturado</span>
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
    </div>
  );
}

function DetailRow({ label, value, tone }) {
  return (
    <div className="detail-row">
      <dt className="detail-row__label">{label}</dt>
      <dd className={`detail-row__value${tone ? ` ${tone}` : ''}`}>{value}</dd>
    </div>
  );
}

function buildSeries(transactions, forecast, direction) {
  const actual = {};
  transactions.forEach((t) => {
    const m = (t.date || '').slice(0, 7);
    const net = t.baseAmount != null ? Number(t.baseAmount) : Number(t.amount);
    actual[m] = (actual[m] || 0) + (net || 0);
  });
  const future = {};
  (forecast?.months || []).forEach((f) => {
    future[f.month] = direction === 'income' ? f.income : f.expense;
  });
  const months = [...new Set([...Object.keys(actual), ...Object.keys(future)])].sort();
  return months.map((m) => ({
    month: m,
    amount: m in actual ? actual[m] : (future[m] ?? 0),
    isActual: m in actual,
  }));
}

function mediaMensual(series) {
  const actuals = series.filter((s) => s.isActual && s.amount > 0);
  if (actuals.length === 0) return 0;
  return actuals.reduce((a, b) => a + b.amount, 0) / actuals.length;
}
