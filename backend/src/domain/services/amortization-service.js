export class AmortizationService {
  annual(asset) {
    return Number(asset.baseAmount) * Number(asset.amortizationRate);
  }

  schedule(asset) {
    const base = Number(asset.baseAmount);
    const annual = this.annual(asset);
    const acqYear = Number(asset.acquisitionDate.slice(0, 4));
    const acqMonth = Number(asset.acquisitionDate.slice(5, 7));
    const firstYearMonths = 13 - acqMonth;

    const years = [];
    let accumulated = 0;
    let year = acqYear;
    let guard = 0;

    while (accumulated < base - 0.005 && guard < 200) {
      let amount = year === acqYear ? (annual * firstYearMonths) / 12 : annual;
      amount = Math.min(amount, base - accumulated);
      accumulated += amount;
      years.push({ year, amount: round2(amount), accumulated: round2(accumulated) });
      year += 1;
      guard += 1;
    }

    return years;
  }

  amortizationForYear(asset, year) {
    return this.info(asset, year).amortizacion;
  }

  info(asset, year) {
    const sched = this.schedule(asset);
    const entry = sched.find((y) => y.year === year);
    if (entry) {
      return { amortizacion: entry.amount, accumulated: entry.accumulated };
    }
    const acqYear = Number(asset.acquisitionDate.slice(0, 4));
    if (year < acqYear) {
      return { amortizacion: 0, accumulated: 0 };
    }
    return {
      amortizacion: 0,
      accumulated: sched.length ? sched[sched.length - 1].accumulated : 0,
    };
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
