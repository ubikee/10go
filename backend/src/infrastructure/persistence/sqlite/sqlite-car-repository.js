export class SqliteCarRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM cars WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM cars ORDER BY name ASC');
    this.upsertStmt = db.prepare(`
      INSERT INTO cars (id, name, brand, plate, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        brand = excluded.brand,
        plate = excluded.plate,
        notes = excluded.notes,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM cars WHERE id = ?');
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
      dto.brand ?? null,
      dto.plate ?? null,
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
