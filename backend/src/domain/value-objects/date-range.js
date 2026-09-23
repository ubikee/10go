import { ValidationError } from '../../shared/errors.js';

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }
  throw new ValidationError(`Fecha inválida: ${value}`);
}

export class DateRange {
  constructor(start, end) {
    this.start = toDate(start);
    this.end = end ? toDate(end) : null;
    if (this.end && this.end < this.start) {
      throw new ValidationError('La fecha de fin no puede ser anterior a la de inicio');
    }
  }

  contains(date) {
    const d = toDate(date);
    if (d < this.start) return false;
    if (this.end && d > this.end) return false;
    return true;
  }

  toJSON() {
    return {
      start: this.start.toISOString().slice(0, 10),
      end: this.end ? this.end.toISOString().slice(0, 10) : null,
    };
  }
}
