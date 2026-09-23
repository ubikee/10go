export class SqliteHouseRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM houses WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM houses ORDER BY name ASC');
    this.upsertStmt = db.prepare(`
      INSERT INTO houses (id, name, address, city, type, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        city = excluded.city,
        type = excluded.type,
        notes = excluded.notes,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM houses WHERE id = ?');
  }

  async findAll() {
    return this.allStmt.all().map((r) => ({ ...r }));
  }

  async findById(id) {
    const row = this.findStmt.get(id);
    return row ? { ...row } : null;
  }

  async save(dto) {
    this.upsertStmt.run(
      dto.id,
      dto.name,
      dto.address ?? null,
      dto.city ?? null,
      dto.type,
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
