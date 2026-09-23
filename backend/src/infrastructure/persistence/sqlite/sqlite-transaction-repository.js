export class SqliteTransactionRepository {
  constructor(db) {
    this.db = db;
    this.allStmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC, createdAt DESC');
    this.byContractStmt = db.prepare('SELECT * FROM transactions WHERE contractId = ? ORDER BY date DESC, createdAt DESC');
    this.findStmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
    this.upsertStmt = db.prepare(`
      INSERT INTO transactions (
        id, contractId, direction, amount, baseAmount, vatRate, vatAmount,
        withholdingRate, withholdingAmount, currency, date, invoiceNumber, counterparty, memberId,
        carId, houseId, category, billingPeriod, notes, fileName, storedName, mimeType, size, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        contractId = excluded.contractId,
        direction = excluded.direction,
        amount = excluded.amount,
        baseAmount = excluded.baseAmount,
        vatRate = excluded.vatRate,
        vatAmount = excluded.vatAmount,
        withholdingRate = excluded.withholdingRate,
        withholdingAmount = excluded.withholdingAmount,
        currency = excluded.currency,
        date = excluded.date,
        invoiceNumber = excluded.invoiceNumber,
        counterparty = excluded.counterparty,
        memberId = excluded.memberId,
        carId = excluded.carId,
        houseId = excluded.houseId,
        category = excluded.category,
        billingPeriod = excluded.billingPeriod,
        notes = excluded.notes,
        fileName = excluded.fileName,
        storedName = excluded.storedName,
        mimeType = excluded.mimeType,
        size = excluded.size,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  }

  async findAll() {
    return this.allStmt.all().map(rowToDto);
  }

  async findByContract(contractId) {
    return this.byContractStmt.all(contractId).map(rowToDto);
  }

  async findById(id) {
    const row = this.findStmt.get(id);
    return row ? rowToDto(row) : null;
  }

  async save(dto) {
    this.upsertStmt.run(
      dto.id,
      dto.contractId,
      dto.direction,
      dto.amount ?? null,
      dto.baseAmount ?? null,
      dto.vatRate ?? null,
      dto.vatAmount ?? null,
      dto.withholdingRate ?? null,
      dto.withholdingAmount ?? null,
      dto.currency,
      dto.date,
      dto.invoiceNumber ?? null,
      dto.counterparty ?? null,
      dto.memberId ?? null,
      dto.carId ?? null,
      dto.houseId ?? null,
      dto.category ?? null,
      dto.billingPeriod ?? null,
      dto.notes ?? null,
      dto.fileName ?? null,
      dto.storedName ?? null,
      dto.mimeType ?? null,
      dto.size ?? null,
      dto.createdAt,
      dto.updatedAt,
    );
    return { ...dto };
  }

  async delete(id) {
    this.deleteStmt.run(id);
  }
}

function rowToDto(row) {
  return {
    ...row,
    amount: row.amount == null ? null : Number(row.amount),
    baseAmount: row.baseAmount == null ? null : Number(row.baseAmount),
    vatRate: row.vatRate == null ? null : Number(row.vatRate),
    vatAmount: row.vatAmount == null ? null : Number(row.vatAmount),
    withholdingRate: row.withholdingRate == null ? null : Number(row.withholdingRate),
    withholdingAmount: row.withholdingAmount == null ? null : Number(row.withholdingAmount),
    size: row.size == null ? null : Number(row.size),
  };
}
