import { Car } from '../../domain/entities/car.js';
import { NotFoundError } from '../../shared/errors.js';

export class CarService {
  constructor({ carRepository }) {
    this.carRepository = carRepository;
  }

  async list() {
    return this.carRepository.findAll();
  }

  async get(id) {
    const car = await this.carRepository.findById(id);
    if (!car) throw new NotFoundError(`Coche ${id} no encontrado`);
    return car;
  }

  async create(input) {
    const car = Car.create(input);
    return this.carRepository.save(car.toJSON());
  }

  async update(id, input) {
    const existing = await this.carRepository.findById(id);
    if (!existing) throw new NotFoundError(`Coche ${id} no encontrado`);
    const car = Car.create({
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.carRepository.save(car.toJSON());
  }

  async remove(id) {
    const existing = await this.carRepository.findById(id);
    if (!existing) throw new NotFoundError(`Coche ${id} no encontrado`);
    await this.carRepository.delete(id);
    return { deleted: true, id };
  }
}
