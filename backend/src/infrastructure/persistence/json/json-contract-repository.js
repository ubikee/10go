export class JsonContractRepository {
  constructor(collection) {
    this.collection = collection;
  }

  async findAll() {
    const rows = await this.collection.load();
    return rows.map((r) => ({ ...r }));
  }

  async findById(id) {
    const rows = await this.collection.load();
    const found = rows.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async save(dto) {
    const rows = await this.collection.load();
    const index = rows.findIndex((r) => r.id === dto.id);
    if (index >= 0) rows[index] = { ...dto };
    else rows.push({ ...dto });
    await this.collection.persist();
    return { ...dto };
  }

  async delete(id) {
    const rows = await this.collection.load();
    this.collection.rows = rows.filter((r) => r.id !== id);
    await this.collection.persist();
  }
}
