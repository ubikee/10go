import { Direction, ContractType, ContractRole } from '../../domain/enums.js';
import { applyIrpfScale } from '../../domain/services/irpf-service.js';

export class TaxService {
  constructor({ transactionRepository, assetRepository, amortizationService, contractRepository, settingsService }) {
    this.transactionRepository = transactionRepository;
    this.assetRepository = assetRepository;
    this.amortizationService = amortizationService;
    this.contractRepository = contractRepository;
    this.settingsService = settingsService;
  }

  async summary(year, memberId = null) {
    const transactions = await this.transactionRepository.findAll();
    const assets = await this.assetRepository.findAll();
    const contracts = await this.contractRepository.findAll();
    const settings = await this.settingsService.get();

    const quarters = [1, 2, 3, 4].map((q) => ({
      quarter: q,
      ingresosNetos: 0,
      gastosDeducibles: 0,
      vatRepercutido: 0,
      vatSoportado: 0,
      irpfRetenido: 0,
      details: [],
    }));

    const totals = {
      ingresosNetos: 0,
      gastosDeducibles: 0,
      amortizacion: 0,
      rendimientoNeto: 0,
      vatRepercutido: 0,
      vatSoportado: 0,
      vatAPagar: 0,
      irpfRetenido: 0,
    };

    for (const t of transactions) {
      if (!t.date || t.date.slice(0, 4) !== String(year)) continue;
      if (memberId != null && memberId !== '' && t.memberId !== memberId) continue;

      const month = Number(t.date.slice(5, 7));
      const q = quarters[Math.ceil(month / 3) - 1];

      if (t.direction === Direction.INCOME) {
        const net = t.baseAmount != null ? Number(t.baseAmount) : (Number(t.amount) || 0);
        const vat = Number(t.vatAmount) || 0;
        const irpf = Number(t.withholdingAmount) || 0;
        q.ingresosNetos += net;
        q.vatRepercutido += vat;
        q.irpfRetenido += irpf;
        totals.ingresosNetos += net;
        totals.vatRepercutido += vat;
        totals.irpfRetenido += irpf;
        q.details.push(toDetail(t));
      } else if (t.baseAmount != null) {
        // gasto deducible (con desglose de IVA soportado)
        const net = Number(t.baseAmount);
        const vat = Number(t.vatAmount) || 0;
        q.gastosDeducibles += net;
        q.vatSoportado += vat;
        totals.gastosDeducibles += net;
        totals.vatSoportado += vat;
        q.details.push(toDetail(t));
      }
    }

    const assetsBreakdown = [];
    for (const asset of assets) {
      if (memberId != null && memberId !== '' && asset.memberId !== memberId) continue;
      const info = this.amortizationService.info(asset, year);
      totals.amortizacion += info.amortizacion;
      assetsBreakdown.push({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        acquisitionDate: asset.acquisitionDate,
        baseAmount: Number(asset.baseAmount),
        vatAmount: Number(asset.vatAmount) || 0,
        amortizationRate: Number(asset.amortizationRate) || 0,
        annual: round2(this.amortizationService.annual(asset)),
        amortizacion: info.amortizacion,
        accumulated: info.accumulated,
      });
    }

    totals.vatAPagar = totals.vatRepercutido - totals.vatSoportado;
    totals.rendimientoNeto = totals.ingresosNetos - totals.gastosDeducibles - totals.amortizacion;

    for (const q of quarters) {
      q.vatAPagar = q.vatRepercutido - q.vatSoportado;
    }

    const simulation = this.buildSimulation(year, memberId, contracts, totals, settings.irpf);

    return {
      year,
      totals: roundAll(totals),
      quarters: quarters.map(roundAll),
      assets: assetsBreakdown.map(roundAll),
      simulation,
    };
  }

  buildSimulation(year, memberId, contracts, totals, irpf) {
    let trabajo = 0;
    let capital = 0;

    for (const c of contracts) {
      if (c.direction !== Direction.INCOME || (c.status && c.status !== 'active')) continue;
      if (memberId != null && memberId !== '' && c.memberId !== memberId) continue;

      const annual = annualize(c);
      if (c.type === ContractType.EMPLOYMENT) trabajo += annual;
      else if (c.type === ContractType.RENTAL && c.role === ContractRole.LANDLORD) capital += annual;
    }

    const actividad = totals.rendimientoNeto;
    const base = actividad + trabajo + capital;
    const minimoPersonal = Number(irpf.minimoPersonal) || 0;
    const baseLiquidable = Math.max(0, base - minimoPersonal);
    const cuota = applyIrpfScale(baseLiquidable, irpf.brackets);
    const retenido = totals.irpfRetenido;

    return {
      actividad: round2(actividad),
      trabajo: round2(trabajo),
      capital: round2(capital),
      base: round2(base),
      minimoPersonal: round2(minimoPersonal),
      baseLiquidable: round2(baseLiquidable),
      cuota: round2(cuota),
      retenido: round2(retenido),
      aPagar: round2(cuota - retenido),
    };
  }
}

function annualize(contract) {
  const amount = Number(contract.amount) || 0;
  switch (contract.recurrence) {
    case 'monthly': return amount * 12;
    case 'quarterly': return amount * 4;
    case 'yearly': return amount;
    case 'weekly': return amount * 52;
    case 'one_time': return amount;
    default: return amount * 12;
  }
}

function toDetail(t) {
  return {
    date: t.date,
    direction: t.direction,
    invoiceNumber: t.invoiceNumber ?? null,
    counterparty: t.counterparty ?? null,
    category: t.category ?? null,
    baseAmount: t.baseAmount != null ? round2(Number(t.baseAmount)) : null,
    amount: round2(Number(t.amount) || 0),
    vatAmount: round2(Number(t.vatAmount) || 0),
    withholdingAmount: round2(Number(t.withholdingAmount) || 0),
  };
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
