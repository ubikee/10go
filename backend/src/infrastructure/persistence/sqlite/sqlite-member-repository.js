export class SqliteMemberRepository {
  constructor(db) {
    this.db = db;
    this.findStmt = db.prepare('SELECT * FROM members WHERE id = ?');
    this.allStmt = db.prepare('SELECT * FROM members ORDER BY name ASC');
    this.upsertStmt = db.prepare(`
      INSERT INTO members (id, name, email, phone, role, notes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        role = excluded.role,
        notes = excluded.notes,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt
    `);
    this.deleteStmt = db.prepare('DELETE FROM members WHERE id = ?');
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
      dto.email ?? null,
      dto.phone ?? null,
      dto.role,
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
