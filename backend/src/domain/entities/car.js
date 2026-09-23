import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';

export class Car {
  constructor({
    id,
    name,
    brand,
    plate,
    notes,
    createdAt,
    updatedAt,
  }) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.brand = brand ?? null;
    this.plate = plate ?? null;
    this.notes = notes ?? null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  static create(input) {
    const car = new Car(input);
    car.validate();
    return car;
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new ValidationError('El nombre del coche es obligatorio');
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      brand: this.brand,
      plate: this.plate,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
