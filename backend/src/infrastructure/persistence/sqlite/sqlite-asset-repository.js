export class SqliteAssetRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM assets WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM assets ORDER BY acquisitionDate DESC');
    this.upsertStmt = db.prepare(`
      INSERT INTO assets (
        id, name, category, memberId, acquisitionDate, baseAmount, vatRate, vatAmount,
        amortizationRate, status, disposalDate, notes, transactionId, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        memberId = excluded.memberId,
        acquisitionDate = excluded.acquisitionDate,
        baseAmount = excluded.baseAmount,
        vatRate = excluded.vatRate,
        vatAmount = excluded.vatAmount,
        amortizationRate = excluded.amortizationRate,
        status = excluded.status,
        disposalDate = excluded.disposalDate,
        notes = excluded.notes,
        transactionId = excluded.transactionId,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM assets WHERE id = ?');
  }

  async findAll() {
    return this.allStmt.all().map(rowToDto);
  }

  async findById(id) {
    const row = this.findStmt.get(id);
    return row ? rowToDto(row) : null;
  }

  async save(dto) {
    this.upsertStmt.run(
      dto.id,
      dto.name,
      dto.category,
      dto.memberId ?? null,
      dto.acquisitionDate,
      dto.baseAmount,
      dto.vatRate,
      dto.vatAmount ?? null,
      dto.amortizationRate,
      dto.status,
      dto.disposalDate ?? null,
      dto.notes ?? null,
      dto.transactionId ?? null,
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
    baseAmount: row.baseAmount == null ? null : Number(row.baseAmount),
    vatRate: row.vatRate == null ? null : Number(row.vatRate),
    vatAmount: row.vatAmount == null ? null : Number(row.vatAmount),
    amortizationRate: row.amortizationRate == null ? null : Number(row.amortizationRate),
  };
}
