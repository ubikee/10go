import { House } from '../../domain/entities/house.js';
import { NotFoundError } from '../../shared/errors.js';

export class HouseService {
  constructor({ houseRepository }) {
    this.houseRepository = houseRepository;
  }

  async list() {
    return this.houseRepository.findAll();
  }

  async get(id) {
    const house = await this.houseRepository.findById(id);
    if (!house) throw new NotFoundError(`Vivienda ${id} no encontrada`);
    return house;
  }

  async create(input) {
    const house = House.create(input);
    return this.houseRepository.save(house.toJSON());
  }

  async update(id, input) {
    const existing = await this.houseRepository.findById(id);
    if (!existing) throw new NotFoundError(`Vivienda ${id} no encontrada`);
    const house = House.create({
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.houseRepository.save(house.toJSON());
  }

  async remove(id) {
    const existing = await this.houseRepository.findById(id);
    if (!existing) throw new NotFoundError(`Vivienda ${id} no encontrada`);
    await this.houseRepository.delete(id);
    return { deleted: true, id };
  }
}
