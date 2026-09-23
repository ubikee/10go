import { Transaction } from '../../domain/entities/transaction.js';
import { NotFoundError } from '../../shared/errors.js';

export class TransactionService {
  constructor({
    transactionRepository,
    contractRepository,
    documentStore,
    invoiceOcrService,
    settingsService,
    config,
  }) {
    this.transactionRepository = transactionRepository;
    this.contractRepository = contractRepository;
    this.documentStore = documentStore;
    this.invoiceOcrService = invoiceOcrService;
    this.settingsService = settingsService;
    this.config = config;
  }

  async listByContract(contractId) {
    await this.assertContract(contractId);
    return this.transactionRepository.findByContract(contractId);
  }

  async listAll() {
    const all = await this.transactionRepository.findAll();
    return all.sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '');
      return byDate !== 0 ? byDate : (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }

  async get(id) {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) throw new NotFoundError(`Movimiento ${id} no encontrado`);
    return transaction;
  }

  async createManual(fields) {
    const contract = await this.assertContract(fields.contractId);
    const transaction = Transaction.create(this.buildInput(contract, fields));
    return this.transactionRepository.save(transaction.toJSON());
  }

  async createFree({
    direction,
    amount,
    date,
    invoiceNumber,
    counterparty,
    memberId,
    carId,
    houseId,
    category,
    notes,
  }) {
    const transaction = Transaction.create({
      contractId: null,
      direction: direction || 'expense',
      amount: amount != null && amount !== '' ? Number(amount) : null,
      currency: this.config.currency,
      date: date || new Date().toISOString().slice(0, 10),
      invoiceNumber: invoiceNumber || null,
      counterparty: counterparty || null,
      memberId: memberId || null,
      carId: carId || null,
      houseId: houseId || null,
      category: category || null,
      notes: notes || null,
    });
    return this.transactionRepository.save(transaction.toJSON());
  }

  async createFromUpload({
    contractId,
    buffer,
    originalName,
    mimeType,
    invoiceNumber,
    amount,
    baseAmount,
    vatRate,
    vatAmount,
    withholdingRate,
    withholdingAmount,
    date,
    counterparty,
    memberId,
    billingPeriod,
    notes,
  }) {
    const contract = await this.assertContract(contractId);

    let invNumber = invoiceNumber ?? null;
    let amt = amount != null && amount !== '' ? Number(amount) : null;
    let billPeriod = billingPeriod || null;
    let txDate = date || null;
    let base = baseAmount ?? null;
    let vr = vatRate ?? null;
    let va = vatAmount ?? null;
    let whr = withholdingRate ?? null;
    let wha = withholdingAmount ?? null;

    const isFreelance = contract.type === 'freelance';

    const settings = await this.settingsService.get();
    if (settings.invoiceOcr.enabled && (invNumber == null || amt == null || txDate == null || (isFreelance && base == null))) {
      try {
        const extracted = await this.invoiceOcrService.extract({ buffer, mimeType, fileName: originalName });
        if (invNumber == null) invNumber = extracted.invoiceNumber;
        if (amt == null) amt = extracted.amount;
        if (billPeriod == null) billPeriod = extracted.period;
        if (txDate == null) txDate = extracted.date;
        if (isFreelance) {
          if (base == null) base = extracted.baseAmount;
          if (vr == null) vr = extracted.vatRate;
          if (va == null) va = extracted.vatAmount;
          if (whr == null) whr = extracted.withholdingRate;
          if (wha == null) wha = extracted.withholdingAmount;
        }
      } catch (err) {
        // Un fallo del OCR no debe impedir guardar el movimiento: se queda a medias.
      }
    }

    const transaction = Transaction.create(this.buildInput(contract, {
      amount: amt,
      baseAmount: base,
      vatRate: vr,
      vatAmount: va,
      withholdingRate: whr,
      withholdingAmount: wha,
      date: txDate,
      invoiceNumber: invNumber,
      counterparty,
      memberId,
      billingPeriod: billPeriod,
      notes,
      fileName: originalName,
      mimeType,
    }));

    const storedName = await this.documentStore.save({
      contractId,
      transactionId: transaction.id,
      buffer,
      originalName,
      mimeType,
    });
    transaction.storedName = storedName;
    transaction.size = buffer.length;

    return this.transactionRepository.save(transaction.toJSON());
  }

  async update(id, input) {
    const existing = await this.transactionRepository.findById(id);
    if (!existing) throw new NotFoundError(`Movimiento ${id} no encontrado`);
    const contract = await this.assertContract(existing.contractId);
    const transaction = Transaction.create({
      ...this.buildInput(contract, { ...existing, ...input }),
      id,
      updatedAt: new Date().toISOString(),
    });
    return this.transactionRepository.save(transaction.toJSON());
  }

  buildInput(contract, fields) {
    const hasBase = fields.baseAmount != null && fields.baseAmount !== '';
    return {
      contractId: contract.id,
      direction: contract.direction,
      amount: hasBase ? null : (fields.amount != null && fields.amount !== '' ? Number(fields.amount) : null),
      baseAmount: hasBase ? Number(fields.baseAmount) : null,
      vatRate: hasBase ? toRate(fields.vatRate, contract.vatRate) : null,
      vatAmount: hasBase && fields.vatAmount != null && fields.vatAmount !== '' ? Number(fields.vatAmount) : null,
      withholdingRate: hasBase ? toRate(fields.withholdingRate, contract.withholdingRate) : null,
      withholdingAmount: hasBase && fields.withholdingAmount != null && fields.withholdingAmount !== '' ? Number(fields.withholdingAmount) : null,
      currency: contract.currency ?? this.config.currency,
      date: fields.date || new Date().toISOString().slice(0, 10),
      invoiceNumber: fields.invoiceNumber || null,
      counterparty: fields.counterparty || null,
      memberId: fields.memberId || contract.memberId || null,
      carId: fields.carId ?? null,
      houseId: fields.houseId ?? null,
      category: fields.category ?? null,
      billingPeriod: fields.billingPeriod || null,
      notes: fields.notes || null,
      fileName: fields.fileName ?? null,
      mimeType: fields.mimeType ?? null,
    };
  }

  async getDocument(id) {
    const transaction = await this.get(id);
    if (!transaction.storedName) throw new NotFoundError('Este movimiento no tiene documento');
    const buffer = await this.documentStore.read(transaction.storedName);
    return { transaction, buffer };
  }

  async remove(id) {
    const transaction = await this.get(id);
    if (transaction.storedName) await this.documentStore.delete(transaction.storedName);
    await this.transactionRepository.delete(id);
    return { deleted: true, id };
  }

  async assertContract(contractId) {
    const contract = await this.contractRepository.findById(contractId);
    if (!contract) throw new NotFoundError(`Contrato ${contractId} no encontrado`);
    return contract;
  }
}

function toRate(value, fallback) {
  if (value != null && value !== '') return Number(value);
  return fallback ?? 0;
}
