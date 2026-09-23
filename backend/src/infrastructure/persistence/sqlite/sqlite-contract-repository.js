export class SqliteContractRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM contracts WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM contracts ORDER BY createdAt DESC');
    this.upsertStmt = db.prepare(`
      INSERT INTO contracts (
        id, name, type, subtype, role, direction, amountType, amount, vatRate, withholdingRate,
        currency, recurrence, startDate, endDate, paymentDay, houseId, carId, memberId, status, notes, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        subtype = excluded.subtype,
        role = excluded.role,
        direction = excluded.direction,
        amountType = excluded.amountType,
        amount = excluded.amount,
        vatRate = excluded.vatRate,
        withholdingRate = excluded.withholdingRate,
        currency = excluded.currency,
        recurrence = excluded.recurrence,
        startDate = excluded.startDate,
        endDate = excluded.endDate,
        paymentDay = excluded.paymentDay,
        houseId = excluded.houseId,
        carId = excluded.carId,
        memberId = excluded.memberId,
        status = excluded.status,
        notes = excluded.notes,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM contracts WHERE id = ?');
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
      dto.type,
      dto.subtype ?? null,
      dto.role ?? null,
      dto.direction,
      dto.amountType ?? 'fixed',
      dto.amount ?? null,
      dto.vatRate ?? 0.21,
      dto.withholdingRate ?? 0.15,
      dto.currency,
      dto.recurrence,
      dto.startDate,
      dto.endDate ?? null,
      dto.paymentDay ?? null,
      dto.houseId ?? null,
      dto.carId ?? null,
      dto.memberId ?? null,
      dto.status,
      dto.notes ?? null,
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
    vatRate: row.vatRate == null ? null : Number(row.vatRate),
    withholdingRate: row.withholdingRate == null ? null : Number(row.withholdingRate),
    paymentDay: row.paymentDay == null ? null : Number(row.paymentDay),
  };
}
