import { ValidationError } from '../../shared/errors.js';

export class Money {
  constructor(amount, currency) {
    if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
      throw new ValidationError('El importe debe ser un número válido');
    }
    if (amount < 0) {
      throw new ValidationError('El importe no puede ser negativo');
    }
    this.amount = amount;
    this.currency = (currency || 'EUR').toUpperCase();
  }

  static from({ amount, currency }) {
    return new Money(amount, currency);
  }

  round(decimals = 2) {
    const factor = 10 ** decimals;
    return new Money(Math.round((this.amount + Number.EPSILON) * factor) / factor, this.currency);
  }

  equals(other) {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toJSON() {
    return { amount: this.amount, currency: this.currency };
  }
}
