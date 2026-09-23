import { Direction } from '../../domain/enums.js';

export class TaxService {
  constructor({ transactionRepository }) {
    this.transactionRepository = transactionRepository;
  }

  async summary(year, memberId = null) {
    const all = await this.transactionRepository.findAll();

    const quarters = [1, 2, 3, 4].map((q) => ({ quarter: q, vat: 0, withholding: 0, net: 0 }));
    const totals = { vat: 0, withholding: 0, net: 0 };

    for (const t of all) {
      if (t.direction !== Direction.INCOME || !t.date) continue;
      if (t.date.slice(0, 4) !== String(year)) continue;
      if (memberId != null && memberId !== '' && t.memberId !== memberId) continue;

      const month = Number(t.date.slice(5, 7));
      const quarter = quarters[Math.ceil(month / 3) - 1];

      const vat = Number(t.vatAmount) || 0;
      const withholding = Number(t.withholdingAmount) || 0;
      const net = t.baseAmount != null ? Number(t.baseAmount) : (Number(t.amount) || 0);

      quarter.vat += vat;
      quarter.withholding += withholding;
      quarter.net += net;
      totals.vat += vat;
      totals.withholding += withholding;
      totals.net += net;
    }

    return {
      year,
      totals: roundAll(totals),
      quarters: quarters.map(roundAll),
    };
  }
}

function roundAll(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = typeof value === 'number' ? round2(value) : value;
  }
  return out;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
