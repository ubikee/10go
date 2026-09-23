import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { useConfig } from '../lib/config-context.js';
import { formatMoney, formatDate, monthLabel } from '../lib/format.js';
import { labelOf, CONTRACT_TYPES, DIRECTIONS, EXPENSE_CATEGORIES } from '../lib/constants.js';
import { Modal } from '../components/Modal.jsx';
import { FreeTransactionForm } from '../components/FreeTransactionForm.jsx';

const GROUP_BY = [
  { value: 'none', label: 'Sin agrupar' },
  { value: 'month', label: 'Por mes' },
  { value: 'contract', label: 'Por contrato' },
  { value: 'member', label: 'Por responsable' },
  { value: 'category', label: 'Por categoría' },
  { value: 'car', label: 'Por coche' },
  { value: 'type', label: 'Por tipo' },
  { value: 'direction', label: 'Por dirección' },
];

export default function Transactions() {
  const { currency } = useConfig();
  const [transactions, setTransactions] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [members, setMembers] = useState([]);
  const [cars, setCars] = useState([]);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [direction, setDirection] = useState('');
  const [memberId, setMemberId] = useState('');
  const [contractId, setContractId] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [carId, setCarId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [expenseOpen, setExpenseOpen] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/transactions'), api.get('/contracts'), api.get('/members'), api.get('/cars'), api.get('/houses')])
      .then(([t, c, m, cars, houses]) => {
        setTransactions(t);
        setContracts(c);
        setMembers(m);
        setCars(cars);
        setHouses(houses);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const reload = () => {
    api.get('/transactions').then(setTransactions).catch((e) => setError(e.message));
  };

  const contractById = useMemo(() => Object.fromEntries(contracts.map((c) => [c.id, c])), [contracts]);
  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
  const carById = useMemo(() => Object.fromEntries(cars.map((c) => [c.id, c])), [cars]);
  const houseById = useMemo(() => Object.fromEntries(houses.map((h) => [h.id, h])), [houses]);

  const filtered = useMemo(() => transactions.filter((t) => {
    const c = contractById[t.contractId];
    const m = memberById[t.memberId];
    if (search) {
      const hay = [t.invoiceNumber, t.counterparty, c?.name, m?.name, t.category].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(search.toLowerCase())) return false;
    }
    if (direction && t.direction !== direction) return false;
    if (memberId && t.memberId !== memberId) return false;
    if (contractId && t.contractId !== contractId) return false;
    if (type && c?.type !== type) return false;
    if (category && (t.category || '') !== category) return false;
    if (carId && t.carId !== carId) return false;
    if (fromDate && (t.date || '') < fromDate) return false;
    if (toDate && (t.date || '') > toDate) return false;
    return true;
  }), [transactions, contractById, memberById, search, direction, memberId, contractId, type, category, carId, fromDate, toDate]);

  const groups = useMemo(() => groupRows(filtered, groupBy, contractById, memberById, carById), [filtered, groupBy, contractById, memberById, carById]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let vat = 0;
    let irpf = 0;
    for (const t of filtered) {
      if (t.direction === 'income') {
        income += t.baseAmount != null ? Number(t.baseAmount) : (Number(t.amount) || 0);
        vat += Number(t.vatAmount) || 0;
        irpf += Number(t.withholdingAmount) || 0;
      } else {
        expense += Number(t.amount) || 0;
      }
    }
    return { income, expense, net: income - expense, vat, irpf };
  }, [filtered]);

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Movimientos</h1>
          <p className="page__subtitle">{transactions.length} movimientos en total</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setExpenseOpen(true)}>+ Gasto puntual</button>
      </header>

      {error && <p className="alert alert--error">{error}</p>}

      <div className="toolbar">
        <input className="input" placeholder="Buscar nº factura, contraparte…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="">Dirección</option>
          {DIRECTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">Responsable</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="input" value={contractId} onChange={(e) => setContractId(e.target.value)}>
          <option value="">Contrato</option>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Tipo</option>
          {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Categoría</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input" value={carId} onChange={(e) => setCarId(e.target.value)}>
          <option value="">Coche</option>
          {cars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="toolbar">
        <label className="inline-label">Desde
          <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="inline-label">Hasta
          <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <label className="inline-label">Agrupar
          <select className="input" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUP_BY.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </label>
        <span className="muted small" style={{ alignSelf: 'center' }}>{filtered.length} resultados</span>
      </div>

      <section className="card card--flush">
        {loading ? (
          <p className="muted" style={{ padding: 20 }}>Cargando…</p>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Contrato</th>
                  <th>Nº factura / Contraparte</th>
                  <th>Responsable</th>
                  <th>Dirección</th>
                  <th className="num">Importe</th>
                  <th className="actions-col" />
                </tr>
              </thead>
              <tbody>
                {groups.map((group, gi) => (
                  <GroupRows key={gi} group={group} contractById={contractById} memberById={memberById} carById={carById} currency={currency} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="muted">Sin movimientos con estos filtros.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3}>Resumen · {filtered.length} movimientos</th>
                  <td className="num muted">IVA {formatMoney(summary.vat, currency)} · IRPF {formatMoney(summary.irpf, currency)}</td>
                  <td className="num"><span className="positive">+{formatMoney(summary.income, currency)}</span> · <span className="negative">−{formatMoney(summary.expense, currency)}</span></td>
                  <td className="num">Neto <strong>{formatMoney(summary.net, currency)}</strong></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <Modal title="Gasto puntual" open={expenseOpen} onClose={() => setExpenseOpen(false)}>
        <FreeTransactionForm
          cars={cars}
          houses={houses}
          members={members}
          onSubmit={async (payload) => {
            try {
              await api.post('/transactions', payload);
              setExpenseOpen(false);
              reload();
            } catch (err) {
              setError(err.message);
            }
          }}
          onCancel={() => setExpenseOpen(false)}
        />
      </Modal>
    </div>
  );
}

function GroupRows({ group, contractById, memberById, carById, currency }) {
  if (group.label == null) {
    return group.rows.map((t) => <TransactionRow key={t.id} t={t} contractById={contractById} memberById={memberById} carById={carById} currency={currency} />);
  }
  return (
    <>
      <tr className="group-row">
        <td colSpan={7}>{group.label} <span className="muted small">({group.rows.length})</span></td>
      </tr>
      {group.rows.map((t) => <TransactionRow key={t.id} t={t} contractById={contractById} memberById={memberById} carById={carById} currency={currency} />)}
    </>
  );
}

function TransactionRow({ t, contractById, memberById, carById, currency }) {
  const c = contractById[t.contractId];
  const m = memberById[t.memberId];
  const car = carById[t.carId];
  const isFree = !t.contractId;
  return (
    <tr>
      <td className="muted">{formatDate(t.date)}</td>
      <td>
        {c ? <a className="link" href={`#/contracts/${c.id}`}>{c.name}</a> : <span className="badge badge--neutral">Puntual</span>}
        {isFree && t.category && <span className="muted small"> · {t.category}</span>}
        {car && <span className="muted small"> · {car.name}</span>}
      </td>
      <td>
        <div className="cell-main">
          <span className="cell-main__title">{t.invoiceNumber || '—'}</span>
          <span className="muted small">{t.counterparty || ''}</span>
        </div>
      </td>
      <td>{m?.name || '—'}</td>
      <td><span className={`badge badge--neutral`}>{labelOf('direction', t.direction)}</span></td>
      <td className={`num ${t.direction === 'income' ? 'positive' : 'negative'}`}>
        <div>{t.direction === 'income' ? '+' : '−'}{formatMoney(t.amount, t.currency || currency)}</div>
        {t.baseAmount != null && (
          <div className="muted small">
            base {formatMoney(t.baseAmount, currency)} · IVA {formatMoney(t.vatAmount || 0, currency)} · IRPF {formatMoney(t.withholdingAmount || 0, currency)}
          </div>
        )}
      </td>
      <td className="actions-col">
        {t.storedName && <a className="btn btn--sm" href={`/api/transactions/${t.id}/document`} target="_blank" rel="noreferrer">Ver</a>}
      </td>
    </tr>
  );
}

function groupRows(rows, groupBy, contractById, memberById, carById) {
  if (!groupBy || groupBy === 'none') return [{ label: null, rows }];
  const map = new Map();
  for (const r of rows) {
    const c = contractById[r.contractId];
    const m = memberById[r.memberId];
    const car = carById[r.carId];
    let label;
    let sortKey;
    switch (groupBy) {
      case 'month': { const mm = (r.date || '').slice(0, 7); label = monthLabel(mm); sortKey = mm; break; }
      case 'contract': label = c?.name || 'Puntual'; sortKey = label; break;
      case 'member': label = m?.name || 'Sin responsable'; sortKey = label; break;
      case 'category': label = r.category || 'Sin categoría'; sortKey = label; break;
      case 'car': label = car?.name || 'Sin coche'; sortKey = label; break;
      case 'type': label = labelOf('type', c?.type) || '—'; sortKey = label; break;
      case 'direction': label = labelOf('direction', r.direction); sortKey = r.direction; break;
      default: label = '—'; sortKey = '';
    }
    if (!map.has(sortKey)) map.set(sortKey, { label, rows: [] });
    map.get(sortKey).rows.push(r);
  }
  const entries = [...map.entries()];
  entries.sort((a, b) => (groupBy === 'month' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])));
  return entries.map(([, g]) => g);
}
