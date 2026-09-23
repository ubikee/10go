import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import {
  ContractType,
  ContractRole,
  ContractStatus,
  Direction,
  RecurrenceType,
  AmountType,
} from '../enums.js';
import { Money } from '../value-objects/money.js';
import { Recurrence } from '../value-objects/recurrence.js';
import { DateRange } from '../value-objects/date-range.js';

const DEFAULT_DIRECTION = {
  [ContractType.EMPLOYMENT]: Direction.INCOME,
  [ContractType.FREELANCE]: Direction.INCOME,
  [ContractType.RENTAL]: null, // depende del rol
  [ContractType.SUPPLY]: Direction.EXPENSE,
  [ContractType.INSURANCE]: Direction.EXPENSE,
  [ContractType.SUBSCRIPTION]: Direction.EXPENSE,
  [ContractType.LOAN]: Direction.EXPENSE,
  [ContractType.OTHER]: null,
};

const DEFAULT_VAT_RATE = 0.21;
const DEFAULT_WITHHOLDING_RATE = 0.15;

function resolveDirection({ type, role, direction }) {
  if (direction && Object.values(Direction).includes(direction)) return direction;
  if (type === ContractType.RENTAL) {
    if (role === ContractRole.LANDLORD) return Direction.INCOME;
    if (role === ContractRole.TENANT) return Direction.EXPENSE;
    throw new ValidationError('Un contrato de alquiler requiere rol inquilino o casero');
  }
  const fallback = DEFAULT_DIRECTION[type];
  if (fallback) return fallback;
  throw new ValidationError('Debe indicar si el contrato es un ingreso o un gasto');
}

export class Contract {
  constructor(input) {
    this.id = input.id ?? randomUUID();
    this.name = input.name;
    this.type = input.type;
    this.subtype = input.subtype ?? null;
    this.role = input.role ?? null;
    this.direction = input.direction;
    this.amountType = input.amountType;
    this.amount = input.amount;
    this.vatRate = input.vatRate ?? DEFAULT_VAT_RATE;
    this.withholdingRate = input.withholdingRate ?? DEFAULT_WITHHOLDING_RATE;
    this.currency = input.currency;
    this.recurrence = input.recurrence;
    this.startDate = input.startDate;
    this.endDate = input.endDate ?? null;
    this.paymentDay = input.paymentDay ?? 1;
    this.houseId = input.houseId ?? null;
    this.carId = input.carId ?? null;
    this.memberId = input.memberId ?? null;
    this.status = input.status ?? ContractStatus.ACTIVE;
    this.notes = input.notes ?? null;
    this.createdAt = input.createdAt ?? new Date().toISOString();
    this.updatedAt = input.updatedAt ?? this.createdAt;
  }

  static create(input) {
    const normalized = normalizeInput(input);
    const contract = new Contract({
      ...normalized,
      direction: resolveDirection(normalized),
    });
    contract.validate();
    return contract;
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new ValidationError('El nombre del contrato es obligatorio');
    }
    if (!Object.values(ContractType).includes(this.type)) {
      throw new ValidationError(`Tipo de contrato inválido: ${this.type}`);
    }
    if (this.role && !Object.values(ContractRole).includes(this.role)) {
      throw new ValidationError(`Rol inválido: ${this.role}`);
    }
    if (!Object.values(ContractStatus).includes(this.status)) {
      throw new ValidationError(`Estado inválido: ${this.status}`);
    }
    if (!Object.values(AmountType).includes(this.amountType)) {
      throw new ValidationError(`Tipo de importe inválido: ${this.amountType}`);
    }
    if (this.amountType === AmountType.FIXED && (this.amount == null || Number.isNaN(Number(this.amount)))) {
      throw new ValidationError('Un contrato fijo requiere un importe');
    }
    if (this.amount != null) {
      new Money(this.amount, this.currency);
    }
    if (!isRate(this.vatRate) || !isRate(this.withholdingRate)) {
      throw new ValidationError('Los porcentajes de IVA/IRPF deben estar entre 0 y 1');
    }
    this.recurrence = new Recurrence(this.recurrence);
    this.range = new DateRange(this.startDate, this.endDate);
    if (
      this.paymentDay != null
      && (!Number.isInteger(this.paymentDay) || this.paymentDay < 1 || this.paymentDay > 31)
    ) {
      throw new ValidationError('El día de pago debe estar entre 1 y 31');
    }
    return true;
  }

  get money() {
    return this.amount == null ? null : new Money(this.amount, this.currency);
  }

  get isIncome() {
    return this.direction === Direction.INCOME;
  }

  isActiveOn(date = new Date()) {
    return this.status === ContractStatus.ACTIVE && this.range.contains(date);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      subtype: this.subtype,
      role: this.role,
      direction: this.direction,
      amountType: this.amountType,
      amount: this.amount == null ? null : Number(this.amount),
      vatRate: this.vatRate,
      withholdingRate: this.withholdingRate,
      currency: this.currency,
      recurrence: this.recurrence.type,
      startDate: this.startDate,
      endDate: this.endDate,
      paymentDay: this.paymentDay,
      houseId: this.houseId,
      carId: this.carId,
      memberId: this.memberId,
      status: this.status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function normalizeInput(input) {
  const out = { ...input };
  if (out.amount === '' || out.amount == null) out.amount = null;
  else if (typeof out.amount === 'string') out.amount = Number(out.amount);

  if (out.currency) out.currency = out.currency.toUpperCase();
  else out.currency = 'EUR';
  if (!out.recurrence) out.recurrence = RecurrenceType.MONTHLY;
  if (!out.startDate) out.startDate = new Date().toISOString().slice(0, 10);
  if (!out.amountType) {
    out.amountType = out.type === ContractType.FREELANCE ? AmountType.VARIABLE : AmountType.FIXED;
  }
  if (out.vatRate === '' || out.vatRate == null) out.vatRate = DEFAULT_VAT_RATE;
  else out.vatRate = Number(out.vatRate);
  if (out.withholdingRate === '' || out.withholdingRate == null) out.withholdingRate = DEFAULT_WITHHOLDING_RATE;
  else out.withholdingRate = Number(out.withholdingRate);
  return out;
}

function isRate(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
