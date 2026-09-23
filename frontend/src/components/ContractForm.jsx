import { useState } from 'react';
import {
  CONTRACT_TYPES,
  CONTRACT_ROLES,
  DIRECTIONS,
  RECURRENCES,
  CONTRACT_STATUSES,
  SUPPLY_SUBTYPES,
  AMOUNT_TYPES,
} from '../lib/constants.js';

function defaultDirection(type, role) {
  if (type === 'employment' || type === 'freelance') return 'income';
  if (type === 'rental') {
    if (role === 'landlord') return 'income';
    if (role === 'tenant') return 'expense';
    return '';
  }
  if (['supply', 'insurance', 'subscription', 'loan'].includes(type)) return 'expense';
  return '';
}

export function ContractForm({ initial, houses, cars, members, currency, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => {
    const type = initial?.type ?? 'supply';
    return {
      name: initial?.name ?? '',
      type,
      subtype: initial?.subtype ?? '',
      role: initial?.role ?? '',
      direction: initial?.direction ?? defaultDirection(type, initial?.role ?? ''),
      amountType: initial?.amountType ?? (type === 'freelance' ? 'variable' : 'fixed'),
      amount: initial?.amount ?? '',
      vatPercent: Math.round((initial?.vatRate ?? 0.21) * 100),
      withholdingPercent: Math.round((initial?.withholdingRate ?? 0.15) * 100),
      currency: initial?.currency ?? currency,
      recurrence: initial?.recurrence ?? 'monthly',
      startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: initial?.endDate ?? '',
      paymentDay: initial?.paymentDay ?? 1,
      houseId: initial?.houseId ?? '',
      carId: initial?.carId ?? '',
      memberId: initial?.memberId ?? '',
      status: initial?.status ?? 'active',
      notes: initial?.notes ?? '',
    };
  });

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'type') {
        next.direction = defaultDirection(value, f.role);
        if (value === 'freelance') next.amountType = 'variable';
      }
      if (key === 'role') next.direction = defaultDirection(f.type, value);
      return next;
    });
  };

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: form.amount === '' ? null : Number(form.amount),
      vatRate: form.vatPercent / 100,
      withholdingRate: form.withholdingPercent / 100,
      paymentDay: form.paymentDay === '' ? null : Number(form.paymentDay),
      endDate: form.endDate || null,
      houseId: form.houseId || null,
      carId: form.carId || null,
      memberId: form.memberId || null,
      subtype: form.subtype || null,
      role: form.role || null,
    });
  };

  const isVariable = form.amountType === 'variable';

  return (
    <form className="form" onSubmit={submit}>
      <div className="form__grid">
        <label className="field field--full">
          <span>Nombre</span>
          <input required value={form.name} onChange={set('name')} placeholder="Ej. Alquiler Piso Centro" />
        </label>

        <label className="field">
          <span>Tipo</span>
          <select value={form.type} onChange={set('type')}>
            {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Importe</span>
          <select value={form.amountType} onChange={set('amountType')}>
            {AMOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        {form.type === 'rental' && (
          <label className="field">
            <span>Rol</span>
            <select value={form.role} onChange={set('role')}>
              <option value="">—</option>
              {CONTRACT_ROLES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}

        {form.type === 'supply' && (
          <label className="field">
            <span>Suministro</span>
            <select value={form.subtype} onChange={set('subtype')}>
              <option value="">—</option>
              {SUPPLY_SUBTYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}

        <label className="field">
          <span>Dirección</span>
          <select value={form.direction} onChange={set('direction')}>
            {DIRECTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="field">
          <span>{isVariable ? 'Importe estimado (opcional)' : 'Importe'}</span>
          <input
            required={!isVariable}
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
          />
        </label>

        <label className="field">
          <span>Moneda</span>
          <input value={form.currency} onChange={set('currency')} />
        </label>

        {form.type === 'freelance' && (
          <>
            <label className="field">
              <span>IVA % (por defecto)</span>
              <input type="number" min="0" max="100" step="1" value={form.vatPercent} onChange={set('vatPercent')} />
            </label>
            <label className="field">
              <span>IRPF % (por defecto)</span>
              <input type="number" min="0" max="100" step="1" value={form.withholdingPercent} onChange={set('withholdingPercent')} />
            </label>
          </>
        )}

        {!isVariable && (
          <label className="field">
            <span>Recurrencia</span>
            <select value={form.recurrence} onChange={set('recurrence')}>
              {RECURRENCES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        )}

        {!isVariable && (
          <label className="field">
            <span>Día de pago</span>
            <input type="number" min="1" max="31" value={form.paymentDay} onChange={set('paymentDay')} />
          </label>
        )}

        <label className="field">
          <span>Inicio</span>
          <input type="date" value={form.startDate} onChange={set('startDate')} />
        </label>

        <label className="field">
          <span>Fin (opcional)</span>
          <input type="date" value={form.endDate} onChange={set('endDate')} />
        </label>

        <label className="field">
          <span>Vivienda</span>
          <select value={form.houseId} onChange={set('houseId')}>
            <option value="">—</option>
            {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Coche</span>
          <select value={form.carId} onChange={set('carId')}>
            <option value="">—</option>
            {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Responsable</span>
          <select value={form.memberId} onChange={set('memberId')}>
            <option value="">—</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select value={form.status} onChange={set('status')}>
            {CONTRACT_STATUSES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>

        <label className="field field--full">
          <span>Notas</span>
          <textarea rows={2} value={form.notes} onChange={set('notes')} />
        </label>
      </div>

      <div className="form__actions">
        <button type="button" className="btn" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn--primary">Guardar</button>
      </div>
    </form>
  );
}
