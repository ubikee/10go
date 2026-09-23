import { RecurrenceType } from '../enums.js';
import { ValidationError } from '../../shared/errors.js';

const INTERVAL_MONTHS = {
  [RecurrenceType.ONE_TIME]: 0,
  [RecurrenceType.WEEKLY]: 0,
  [RecurrenceType.MONTHLY]: 1,
  [RecurrenceType.QUARTERLY]: 3,
  [RecurrenceType.YEARLY]: 12,
};

const INTERVAL_DAYS = {
  [RecurrenceType.ONE_TIME]: 0,
  [RecurrenceType.WEEKLY]: 7,
};

export class Recurrence {
  constructor(type) {
    if (!Object.values(RecurrenceType).includes(type)) {
      throw new ValidationError(`Recurrencia inválida: ${type}`);
    }
    this.type = type;
  }

  get isRecurring() {
    return this.type !== RecurrenceType.ONE_TIME;
  }

  get monthsInterval() {
    return INTERVAL_MONTHS[this.type] ?? null;
  }

  get daysInterval() {
    return INTERVAL_DAYS[this.type] ?? null;
  }

  equals(other) {
    return this.type === other.type;
  }

  toJSON() {
    return this.type;
  }
}
