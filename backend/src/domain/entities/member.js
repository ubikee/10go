import { randomUUID } from 'node:crypto';
import { ValidationError } from '../../shared/errors.js';
import { MemberRole } from '../enums.js';

export class Member {
  constructor({
    id,
    name,
    email,
    phone,
    role,
    notes,
    createdAt,
    updatedAt,
  }) {
    this.id = id ?? randomUUID();
    this.name = name;
    this.email = email ?? null;
    this.phone = phone ?? null;
    this.role = role ?? MemberRole.MEMBER;
    this.notes = notes ?? null;
    this.createdAt = createdAt ?? new Date().toISOString();
    this.updatedAt = updatedAt ?? this.createdAt;
  }

  static create(input) {
    const member = new Member(input);
    member.validate();
    return member;
  }

  validate() {
    if (!this.name || typeof this.name !== 'string' || this.name.trim() === '') {
      throw new ValidationError('El nombre del miembro es obligatorio');
    }
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      throw new ValidationError('Email inválido');
    }
    return true;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      role: this.role,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
