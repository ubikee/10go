import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import {
  ContractType,
  ContractRole,
  ContractStatus,
  Direction,
  RecurrenceType,
} from '../enums.js';
import { Money } from '../value-objects/money.js';
import { Recurrence } from '../value-objects/recurrence.js';
import { DateRange } from '../value-objects/date-range.js';

const DEFAULT_DIRECTION = {
  [ContractType.EMPLOYMENT]: Direction.INCOME,
  [ContractType.RENTAL]: null, // depende del rol
  [ContractType.SUPPLY]: Direction.EXPENSE,
  [ContractType.INSURANCE]: Direction.EXPENSE,
  [ContractType.SUBSCRIPTION]: Direction.EXPENSE,
  [ContractType.LOAN]: Direction.EXPENSE,
  [ContractType.OTHER]: null,
};

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
    this.amount = input.amount;
    this.currency = input.currency;
    this.recurrence = input.recurrence;
    this.startDate = input.startDate;
    this.endDate = input.endDate ?? null;
    this.paymentDay = input.paymentDay ?? 1;
    this.houseId = input.houseId ?? null;
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
    new Money(this.amount, this.currency);
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
    return new Money(this.amount, this.currency);
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
      amount: this.amount,
      currency: this.currency,
      recurrence: this.recurrence.type,
      startDate: this.startDate,
      endDate: this.endDate,
      paymentDay: this.paymentDay,
      houseId: this.houseId,
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
  if (typeof out.amount === 'string') out.amount = Number(out.amount);
  if (out.currency) out.currency = out.currency.toUpperCase();
  if (!out.recurrence) out.recurrence = RecurrenceType.MONTHLY;
  if (!out.startDate) out.startDate = new Date().toISOString().slice(0, 10);
  return out;
}
