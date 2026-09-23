import { useState } from 'react';
import { DIRECTIONS, EXPENSE_CATEGORIES } from '../lib/constants.js';

export function FreeTransactionForm({ cars, houses, members, defaultCarId, defaultHouseId, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    amount: '',
    baseAmount: '',
    vatPercent: 21,
    deducible: false,
    direction: 'expense',
    date: new Date().toISOString().slice(0, 10),
    category: '',
    carId: defaultCarId ?? '',
    houseId: defaultHouseId ?? '',
    memberId: '',
    counterparty: '',
    notes: '',
  });

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: key === 'deducible' ? e.target.checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    const deducible = form.deducible;
    onSubmit({
      direction: form.direction,
      date: form.date,
      category: form.category || null,
      carId: form.carId || null,
      houseId: form.houseId || null,
      memberId: form.memberId || null,
      counterparty: form.counterparty || null,
      notes: form.notes || null,
      amount: deducible ? null : (form.amount !== '' ? Number(form.amount) : null),
      baseAmount: deducible ? (form.baseAmount !== '' ? Number(form.baseAmount) : null) : null,
      vatRate: deducible ? form.vatPercent / 100 : null,
    });
  };

  const total = form.deducible && form.baseAmount !== ''
    ? Number(form.baseAmount) * (1 + form.vatPercent / 100)
    : null;

  return (
    <form className="form" onSubmit={submit}>
      <div className="form__grid">
        {form.deducible ? (
          <>
            <label className="field"><span>Base imponible</span>
              <input required type="number" step="0.01" min="0" value={form.baseAmount} onChange={set('baseAmount')} />
            </label>
            <label className="field"><span>IVA %</span>
              <input type="number" min="0" max="100" step="1" value={form.vatPercent} onChange={set('vatPercent')} />
            </label>
            <label className="field"><span>Total (con IVA)</span>
              <input disabled value={total != null ? total.toFixed(2) : '—'} />
            </label>
          </>
        ) : (
          <label className="field"><span>Importe</span>
            <input required type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
          </label>
        )}
        <label className="field"><span>Dirección</span>
          <select value={form.direction} onChange={set('direction')}>
            {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
        <label className="field"><span>Fecha</span>
          <input type="date" value={form.date} onChange={set('date')} />
        </label>
        <label className="field"><span>Categoría</span>
          <input list="expense-categories" value={form.category} onChange={set('category')} placeholder="comida, ropa…" />
          <datalist id="expense-categories">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label className="field"><span>Coche</span>
          <select value={form.carId} onChange={set('carId')}>
            <option value="">—</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Vivienda</span>
          <select value={form.houseId} onChange={set('houseId')}>
            <option value="">—</option>
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Responsable</span>
          <select value={form.memberId} onChange={set('memberId')}>
            <option value="">—</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Contraparte</span>
          <input value={form.counterparty} onChange={set('counterparty')} />
        </label>
        <label className="field field--full"><span>Notas</span>
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </label>
        <label className="field field--full checkbox-label">
          <input type="checkbox" checked={form.deducible} onChange={set('deducible')} />
          <span>Gasto deducible (con IVA soportado)</span>
        </label>
      </div>
      <div className="form__actions">
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary">Guardar</button>
      </div>
    </form>
  );
}
