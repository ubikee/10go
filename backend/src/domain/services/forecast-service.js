import { Direction, RecurrenceType, ContractStatus } from '../enums.js';

function parseDate(str) {
  return new Date(`${str}T00:00:00.000Z`);
}

function daysInMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function addMonthsClamped(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(Math.min(day, daysInMonth(d)));
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

export class ForecastService {
  constructor({ currency = 'EUR' } = {}) {
    this.currency = currency;
  }

  /**
   * Genera las ocurrencias de pago de un contrato dentro de [rangeStart, rangeEnd].
   */
  occurrencesFor(contract, rangeStart, rangeEnd) {
    const start = parseDate(contract.startDate);
    const end = contract.endDate ? parseDate(contract.endDate) : null;
    const occurrences = [];

    const push = (date) => {
      if (date < rangeStart || date > rangeEnd) return;
      if (end && date > end) return;
      occurrences.push({ date: isoDay(date) });
    };

    const recurrence = contract.recurrence.type ?? contract.recurrence;

    if (recurrence === RecurrenceType.ONE_TIME) {
      push(start);
      return occurrences;
    }

    if (recurrence === RecurrenceType.WEEKLY) {
      let cursor = new Date(start);
      let guard = 0;
      while (cursor <= rangeEnd && guard < 1000) {
        push(cursor);
        cursor = addDays(cursor, 7);
        guard += 1;
      }
      return occurrences;
    }

    const stepMonths = {
      [RecurrenceType.MONTHLY]: 1,
      [RecurrenceType.QUARTERLY]: 3,
      [RecurrenceType.YEARLY]: 12,
    }[recurrence] ?? 1;

    const day = Math.max(1, Math.min(contract.paymentDay ?? start.getUTCDate(), 31));
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    cursor.setUTCDate(Math.min(day, daysInMonth(cursor)));
    if (cursor < start) {
      cursor = addMonthsClamped(cursor, stepMonths);
    }

    let guard = 0;
    while (cursor <= rangeEnd && guard < 1000) {
      push(cursor);
      cursor = addMonthsClamped(cursor, stepMonths);
      guard += 1;
    }

    return occurrences;
  }

  /**
   * Proyección mensual de ingresos/gastos durante `months` meses a partir de `from`.
   */
  forecast(contracts, { from = new Date(), months = 12 } = {}) {
    const rangeStart = startOfMonth(from);
    const rangeEnd = addMonthsClamped(rangeStart, months - 1);
    rangeEnd.setUTCDate(daysInMonth(rangeEnd));

    const buckets = new Map();
    for (let i = 0; i < months; i += 1) {
      const monthDate = addMonthsClamped(rangeStart, i);
      buckets.set(monthKey(monthDate), {
        month: monthKey(monthDate),
        income: 0,
        expense: 0,
        net: 0,
        items: [],
      });
    }

    const active = contracts.filter((contract) => {
      if (contract.status && contract.status !== ContractStatus.ACTIVE) return false;
      const cStart = parseDate(contract.startDate);
      const cEnd = contract.endDate ? parseDate(contract.endDate) : null;
      if (cStart > rangeEnd) return false;
      if (cEnd && cEnd < rangeStart) return false;
      return true;
    });

    for (const contract of active) {
      const occurrences = this.occurrencesFor(contract, rangeStart, rangeEnd);
      const sign = contract.direction === Direction.INCOME ? 1 : -1;
      for (const { date } of occurrences) {
        const bucket = buckets.get(monthKey(parseDate(date)));
        if (!bucket) continue;
        const amount = Number(contract.amount);
        if (sign > 0) bucket.income += amount;
        else bucket.expense += amount;
        bucket.items.push({
          contractId: contract.id,
          name: contract.name,
          type: contract.type,
          direction: contract.direction,
          amount,
          currency: contract.currency,
          date,
          houseId: contract.houseId,
          memberId: contract.memberId,
        });
      }
    }

    const monthsResult = [...buckets.values()].map((bucket) => ({
      ...bucket,
      income: round2(bucket.income),
      expense: round2(bucket.expense),
      net: round2(bucket.income - bucket.expense),
    }));

    const totals = monthsResult.reduce(
      (acc, m) => ({
        income: round2(acc.income + m.income),
        expense: round2(acc.expense + m.expense),
        net: round2(acc.income - acc.expense),
      }),
      { income: 0, expense: 0, net: 0 },
    );

    return {
      currency: this.currency,
      from: isoDay(rangeStart),
      to: isoDay(rangeEnd),
      months: monthsResult,
      totals,
    };
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
