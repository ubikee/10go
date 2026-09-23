import { Contract } from '../../domain/entities/contract.js';
import { NotFoundError } from '../../shared/errors.js';

export class ContractService {
  constructor({ contractRepository }) {
    this.contractRepository = contractRepository;
  }

  async list() {
    return this.contractRepository.findAll();
  }

  async listByHouse(houseId) {
    const all = await this.contractRepository.findAll();
    return all.filter((c) => c.houseId === houseId);
  }

  async listByCar(carId) {
    const all = await this.contractRepository.findAll();
    return all.filter((c) => c.carId === carId);
  }

  async listByMember(memberId) {
    const all = await this.contractRepository.findAll();
    return all.filter((c) => c.memberId === memberId);
  }

  async get(id) {
    const contract = await this.contractRepository.findById(id);
    if (!contract) throw new NotFoundError(`Contrato ${id} no encontrado`);
    return contract;
  }

  async create(input) {
    const contract = Contract.create(input);
    return this.contractRepository.save(contract.toJSON());
  }

  async update(id, input) {
    const existing = await this.contractRepository.findById(id);
    if (!existing) throw new NotFoundError(`Contrato ${id} no encontrado`);
    const contract = Contract.create({
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.contractRepository.save(contract.toJSON());
  }

  async remove(id) {
    const existing = await this.contractRepository.findById(id);
    if (!existing) throw new NotFoundError(`Contrato ${id} no encontrado`);
    await this.contractRepository.delete(id);
    return { deleted: true, id };
  }
}
