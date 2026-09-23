import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import { HouseType } from '../enums.js';

export class House {
  constructor({
    id,
    name,
    address,
    city,
    type,
    notes,
    createdAt,
    updatedAt,
  }) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.address = address ?? null;
    this.city = city ?? null;
    this.type = type ?? HouseType.OWNED;
    this.notes = notes ?? null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  static create(input) {
    const house = new House(input);
    house.validate();
    return house;
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new ValidationError('El nombre de la vivienda es obligatorio');
    }
    if (!Object.values(HouseType).includes(this.type)) {
      throw new ValidationError(`Tipo de vivienda inválido: ${this.type}`);
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      address: this.address,
      city: this.city,
      type: this.type,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
