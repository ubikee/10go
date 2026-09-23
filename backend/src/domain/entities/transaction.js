import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import { Direction } from '../enums.js';
import { Money } from '../value-objects/money.js';

export class Transaction {
  constructor({
    id,
    contractId,
    direction,
    amount,
    baseAmount,
    vatRate,
    vatAmount,
    withholdingRate,
    withholdingAmount,
    currency,
    date,
    invoiceNumber,
    counterparty,
    memberId,
    carId,
    houseId,
    category,
    billingPeriod,
    notes,
    fileName,
    storedName,
    mimeType,
    size,
    createdAt,
    updatedAt,
  }) {
    this.id = id ?? randomUUID();
    this.contractId = contractId;
    this.direction = direction ?? Direction.EXPENSE;
    this.amount = amount ?? null;
    this.baseAmount = baseAmount ?? null;
    this.vatRate = vatRate ?? null;
    this.vatAmount = vatAmount ?? null;
    this.withholdingRate = withholdingRate ?? null;
    this.withholdingAmount = withholdingAmount ?? null;
    this.currency = currency ?? 'EUR';
    this.date = date ?? new Date().toISOString().slice(0, 10);
    this.invoiceNumber = invoiceNumber ?? null;
    this.counterparty = counterparty ?? null;
    this.memberId = memberId ?? null;
    this.carId = carId ?? null;
    this.houseId = houseId ?? null;
    this.category = category ?? null;
    this.billingPeriod = billingPeriod ?? null;
    this.notes = notes ?? null;
    this.fileName = fileName ?? null;
    this.storedName = storedName ?? null;
    this.mimeType = mimeType ?? null;
    this.size = size ?? null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  static create(input) {
    const transaction = new Transaction(input);
    transaction.normalizeTaxes();
    transaction.validate();
    return transaction;
  }

  normalizeTaxes() {
    if (this.baseAmount == null || this.baseAmount === '') {
      this.baseAmount = null;
      this.vatRate = null;
      this.vatAmount = null;
      this.withholdingRate = null;
      this.withholdingAmount = null;
      return;
    }

    const base = Number(this.baseAmount);
    const vatRate = this.vatRate == null || this.vatRate === '' ? 0 : Number(this.vatRate);
    const whRate = this.withholdingRate == null || this.withholdingRate === '' ? 0 : Number(this.withholdingRate);

    this.baseAmount = round2(base);
    this.vatRate = vatRate;
    this.withholdingRate = whRate;
    this.vatAmount = round2(base * vatRate);
    this.withholdingAmount = round2(base * whRate);
    this.amount = round2(base + this.vatAmount - this.withholdingAmount);
  }

  get netAmount() {
    return this.baseAmount != null ? this.baseAmount : this.amount;
  }

  validate() {
    if (!Object.values(Direction).includes(this.direction)) {
      throw new ValidationError(`Dirección inválida: ${this.direction}`);
    }
    if (this.amount == null || Number.isNaN(Number(this.amount))) {
      throw new ValidationError('El movimiento requiere un importe');
    }
    new Money(Number(this.amount), this.currency);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date)) {
      throw new ValidationError('La fecha del movimiento debe ser YYYY-MM-DD');
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      contractId: this.contractId,
      direction: this.direction,
      amount: this.amount == null ? null : Number(this.amount),
      baseAmount: this.baseAmount == null ? null : Number(this.baseAmount),
      vatRate: this.vatRate,
      vatAmount: this.vatAmount == null ? null : Number(this.vatAmount),
      withholdingRate: this.withholdingRate,
      withholdingAmount: this.withholdingAmount == null ? null : Number(this.withholdingAmount),
      currency: this.currency,
      date: this.date,
      invoiceNumber: this.invoiceNumber,
      counterparty: this.counterparty,
      memberId: this.memberId,
      carId: this.carId,
      houseId: this.houseId,
      category: this.category,
      billingPeriod: this.billingPeriod,
      notes: this.notes,
      fileName: this.fileName,
      storedName: this.storedName,
      mimeType: this.mimeType,
      size: this.size,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
