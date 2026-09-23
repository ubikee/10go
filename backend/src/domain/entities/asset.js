import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import { defaultRateFor } from '../asset-categories.js';

export const AssetStatus = Object.freeze({
  ACTIVE: 'active',
  AMORTIZED: 'amortized',
  SOLD: 'sold',
});

export class Asset {
  constructor({
    id,
    name,
    category,
    memberId,
    acquisitionDate,
    baseAmount,
    vatRate,
    vatAmount,
    amortizationRate,
    status,
    disposalDate,
    notes,
    transactionId,
    createdAt,
    updatedAt,
  }) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.category = category ?? 'otros';
    this.memberId = memberId ?? null;
    this.acquisitionDate = acquisitionDate;
    this.baseAmount = baseAmount;
    this.vatRate = vatRate ?? 0.21;
    this.vatAmount = vatAmount ?? null;
    this.amortizationRate = amortizationRate ?? defaultRateFor(this.category);
    this.status = status ?? AssetStatus.ACTIVE;
    this.disposalDate = disposalDate ?? null;
    this.notes = notes ?? null;
    this.transactionId = transactionId ?? null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  static create(input) {
    const asset = new Asset(input);
    asset.normalize();
    asset.validate();
    return asset;
  }

  normalize() {
    if (typeof this.baseAmount === 'string') this.baseAmount = Number(this.baseAmount);
    if (typeof this.vatRate === 'string') this.vatRate = Number(this.vatRate);
    if (typeof this.amortizationRate === 'string') this.amortizationRate = Number(this.amortizationRate);
    this.vatAmount = round2(Number(this.baseAmount) * Number(this.vatRate));
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new ValidationError('El nombre del bien es obligatorio');
    }
    if (!this.acquisitionDate || !/^\d{4}-\d{2}-\d{2}$/.test(this.acquisitionDate)) {
      throw new ValidationError('La fecha de adquisición debe ser YYYY-MM-DD');
    }
    if (this.baseAmount == null || Number.isNaN(Number(this.baseAmount)) || Number(this.baseAmount) <= 0) {
      throw new ValidationError('La base imponible del bien es obligatoria');
    }
    if (!isRate(this.vatRate) || !isRate(this.amortizationRate)) {
      throw new ValidationError('Los porcentajes de IVA/amortización deben estar entre 0 y 1');
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      memberId: this.memberId,
      acquisitionDate: this.acquisitionDate,
      baseAmount: Number(this.baseAmount),
      vatRate: this.vatRate,
      vatAmount: this.vatAmount,
      amortizationRate: this.amortizationRate,
      status: this.status,
      disposalDate: this.disposalDate,
      notes: this.notes,
      transactionId: this.transactionId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function isRate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
