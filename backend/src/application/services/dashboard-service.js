import { Direction, RecurrenceType, ContractStatus } from '../../domain/enums.js';
import { ForecastService } from '../../domain/services/forecast-service.js';

function monthlyAmount(contract) {
  if (contract.amount == null) return null;
  const amount = Number(contract.amount);
  switch (contract.recurrence) {
    case RecurrenceType.MONTHLY: return amount;
    case RecurrenceType.QUARTERLY: return amount / 3;
    case RecurrenceType.YEARLY: return amount / 12;
    case RecurrenceType.WEEKLY: return (amount * 52) / 12;
    default: return null;
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export class DashboardService {
  constructor({ contractRepository, currency = 'EUR' }) {
    this.contractRepository = contractRepository;
    this.forecastService = new ForecastService({ currency });
    this.currency = currency;
  }

  async build() {
    const contracts = await this.contractRepository.findAll();

    const active = contracts.filter((c) => c.status === ContractStatus.ACTIVE);
    const incomeContracts = active.filter((c) => c.direction === Direction.INCOME);
    const expenseContracts = active.filter((c) => c.direction === Direction.EXPENSE);

    const monthlyIncome = incomeContracts
      .map((c) => monthlyAmount(c))
      .filter((v) => v != null)
      .reduce((a, b) => a + b, 0);
    const monthlyExpense = expenseContracts
      .map((c) => monthlyAmount(c))
      .filter((v) => v != null)
      .reduce((a, b) => a + b, 0);

    const byType = groupByType(active);

    const forecast = this.forecastService.forecast(contracts, { months: 12 });
    const trend = forecast.months.map((m) => ({ month: m.month, income: m.income, expense: m.expense, net: m.net }));
    const currentMonth = forecast.months[0];

    const today = new Date();
    const in90Days = new Date(today);
    in90Days.setUTCDate(in90Days.getUTCDate() + 90);
    const upcomingEnding = active
      .filter((c) => c.endDate && new Date(`${c.endDate}T00:00:00.000Z`) <= in90Days)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));

    return {
      currency: this.currency,
      currentMonth: {
        month: currentMonth?.month ?? null,
        income: currentMonth?.income ?? 0,
        expense: currentMonth?.expense ?? 0,
        net: currentMonth?.net ?? 0,
      },
      totals: {
        contracts: contracts.length,
        active: active.length,
        incomeSources: incomeContracts.length,
        expenseSources: expenseContracts.length,
        monthlyIncome: round2(monthlyIncome),
        monthlyExpense: round2(monthlyExpense),
        monthlyNet: round2(monthlyIncome - monthlyExpense),
      },
      byType,
      trend,
      upcomingEnding,
    };
  }
}

function groupByType(contracts) {
  const map = new Map();
  for (const contract of contracts) {
    const key = contract.type;
    if (!map.has(key)) {
      map.set(key, { type: key, count: 0, income: 0, expense: 0 });
    }
    const group = map.get(key);
    group.count += 1;
    const monthly = monthlyAmount(contract) ?? 0;
    if (contract.direction === Direction.INCOME) group.income += monthly;
    else group.expense += monthly;
  }
  return [...map.values()].map((g) => ({
    ...g,
    income: round2(g.income),
    expense: round2(g.expense),
    net: round2(g.income - g.expense),
  }));
}
