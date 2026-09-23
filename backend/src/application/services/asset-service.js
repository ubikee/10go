import { Asset } from '../../domain/entities/asset.js';
import { NotFoundError } from '../../shared/errors.js';

export class AssetService {
  constructor({ assetRepository, transactionService, amortizationService }) {
    this.assetRepository = assetRepository;
    this.transactionService = transactionService;
    this.amortizationService = amortizationService;
  }

  async list() {
    return this.assetRepository.findAll();
  }

  async get(id) {
    const asset = await this.assetRepository.findById(id);
    if (!asset) throw new NotFoundError(`Bien ${id} no encontrado`);
    return asset;
  }

  async schedule(id) {
    const asset = await this.get(id);
    return {
      asset,
      annual: round2(this.amortizationService.annual(asset)),
      schedule: this.amortizationService.schedule(asset),
    };
  }

  async create(input) {
    const asset = Asset.create(input);

    // El gasto de compra: flujo de caja con IVA soportado (deducible)
    const transaction = await this.transactionService.createFree({
      direction: 'expense',
      baseAmount: asset.baseAmount,
      vatRate: asset.vatRate,
      date: asset.acquisitionDate,
      memberId: asset.memberId,
      counterparty: input.counterparty || null,
      category: input.transactionCategory || 'bien de equipo',
      notes: `Bien de equipo: ${asset.name}`,
    });

    asset.transactionId = transaction.id;
    return this.assetRepository.save(asset.toJSON());
  }

  async update(id, input) {
    const existing = await this.assetRepository.findById(id);
    if (!existing) throw new NotFoundError(`Bien ${id} no encontrado`);
    const asset = Asset.create({
      ...existing,
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.assetRepository.save(asset.toJSON());
  }

  async remove(id) {
    const existing = await this.assetRepository.findById(id);
    if (!existing) throw new NotFoundError(`Bien ${id} no encontrado`);
    await this.assetRepository.delete(id);
    return { deleted: true, id };
  }
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
