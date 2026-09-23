export class SqliteContractRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM contracts WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM contracts ORDER BY createdAt DESC');
    this.upsertStmt = db.prepare(`
      INSERT INTO contracts (
        id, name, type, subtype, role, direction, amount, currency, recurrence,
        startDate, endDate, paymentDay, houseId, memberId, status, notes, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        subtype = excluded.subtype,
        role = excluded.role,
        direction = excluded.direction,
        amount = excluded.amount,
        currency = excluded.currency,
        recurrence = excluded.recurrence,
        startDate = excluded.startDate,
        endDate = excluded.endDate,
        paymentDay = excluded.paymentDay,
        houseId = excluded.houseId,
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
      dto.amount,
      dto.currency,
      dto.recurrence,
      dto.startDate,
      dto.endDate ?? null,
      dto.paymentDay ?? null,
      dto.houseId ?? null,
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
    amount: Number(row.amount),
    paymentDay: row.paymentDay == null ? null : Number(row.paymentDay),
  };
}
