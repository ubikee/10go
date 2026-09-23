import fs from 'node:fs/promises';
import path from 'node:path';
import { seedData } from './seed.js';
import { JsonCollection } from './json/json-collection.js';
import { JsonMemberRepository } from './json/json-member-repository.js';
import { JsonHouseRepository } from './json/json-house-repository.js';
import { JsonContractRepository } from './json/json-contract-repository.js';
import { JsonTransactionRepository } from './json/json-transaction-repository.js';
import { JsonCarRepository } from './json/json-car-repository.js';
import { JsonSettingsRepository } from './json/json-settings-repository.js';
import { DocumentStore } from './document-store.js';
import { createConnection } from './sqlite/connection.js';
import { SqliteMemberRepository } from './sqlite/sqlite-member-repository.js';
import { SqliteHouseRepository } from './sqlite/sqlite-house-repository.js';
import { SqliteContractRepository } from './sqlite/sqlite-contract-repository.js';
import { SqliteTransactionRepository } from './sqlite/sqlite-transaction-repository.js';
import { SqliteCarRepository } from './sqlite/sqlite-car-repository.js';

export async function createRepositories(config) {
  const settings = new JsonSettingsRepository(config.settingsPath);
  const documentStore = new DocumentStore({ dataDir: config.dataDir });

  if (config.persistence === 'sqlite') {
    return {
      ...createSqliteRepositories(config),
      settings,
      documentStore,
    };
  }

  return {
    ...(await createJsonRepositories(config)),
    settings,
    documentStore,
  };
}

async function createJsonRepositories(config) {
  const members = new JsonCollection(path.join(config.dataDir, 'members.json'));
  const houses = new JsonCollection(path.join(config.dataDir, 'houses.json'));
  const cars = new JsonCollection(path.join(config.dataDir, 'cars.json'));
  const contracts = new JsonCollection(path.join(config.dataDir, 'contracts.json'));
  const transactions = new JsonCollection(path.join(config.dataDir, 'transactions.json'));

  await members.seed(seedData.members);
  await houses.seed(seedData.houses);
  await cars.seed([]);
  await contracts.seed(seedData.contracts.map((c) => ({ amountType: 'fixed', vatRate: 0.21, withholdingRate: 0.15, ...c })));
  await transactions.seed([]);

  await ensureContractTaxDefaults(contracts);
  await migrateJsonRecibos(config.dataDir, contracts, transactions);

  return {
    members: new JsonMemberRepository(members),
    houses: new JsonHouseRepository(houses),
    cars: new JsonCarRepository(cars),
    contracts: new JsonContractRepository(contracts),
    transactions: new JsonTransactionRepository(transactions),
  };
}

async function ensureContractTaxDefaults(contracts) {
  const rows = await contracts.load();
  let changed = false;
  for (const c of rows) {
    if (c.vatRate == null) { c.vatRate = 0.21; changed = true; }
    if (c.withholdingRate == null) { c.withholdingRate = 0.15; changed = true; }
    if (c.amountType == null) { c.amountType = 'fixed'; changed = true; }
  }
  if (changed) {
    contracts.rows = rows;
    await contracts.persist();
  }
}

async function migrateJsonRecibos(dataDir, contracts, transactions) {
  const oldPath = path.join(dataDir, 'recibos.json');
  let oldRows = [];
  try {
    const raw = await fs.readFile(oldPath, 'utf8');
    oldRows = JSON.parse(raw);
    if (!Array.isArray(oldRows)) oldRows = [];
  } catch {
    return;
  }
  if (oldRows.length === 0) return;

  const contractRows = await contracts.load();
  const directionById = Object.fromEntries(contractRows.map((c) => [c.id, c.direction]));
  const rows = await transactions.load();
  const existing = new Set(rows.map((t) => t.id));
  let changed = false;

  for (const r of oldRows) {
    if (existing.has(r.id)) continue;
    rows.push({
      id: r.id,
      contractId: r.contractId,
      direction: directionById[r.contractId] || 'expense',
      amount: r.amount ?? null,
      currency: r.currency || 'EUR',
      date: r.issuedAt || (r.createdAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      invoiceNumber: r.invoiceNumber ?? null,
      counterparty: null,
      billingPeriod: r.billingPeriod ?? null,
      notes: r.notes ?? null,
      fileName: r.fileName ?? null,
      storedName: r.storedName ?? null,
      mimeType: r.mimeType ?? null,
      size: r.size ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
    changed = true;
  }

  if (changed) {
    transactions.rows = rows;
    await transactions.persist();
  }
  try {
    await fs.unlink(oldPath);
  } catch {
    // ignorar
  }
}

function createSqliteRepositories(config) {
  const db = createConnection(config.databasePath);

  const repositories = {
    members: new SqliteMemberRepository(db),
    houses: new SqliteHouseRepository(db),
    cars: new SqliteCarRepository(db),
    contracts: new SqliteContractRepository(db),
    transactions: new SqliteTransactionRepository(db),
  };

  seedSqlite(db, repositories);

  return repositories;
}

function seedSqlite(db, repositories) {
  const countMembers = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  const countHouses = db.prepare('SELECT COUNT(*) AS c FROM houses').get().c;
  const countContracts = db.prepare('SELECT COUNT(*) AS c FROM contracts').get().c;

  if (countMembers === 0) {
    for (const member of seedData.members) repositories.members.save(member);
  }
  if (countHouses === 0) {
    for (const house of seedData.houses) repositories.houses.save(house);
  }
  if (countContracts === 0) {
    for (const contract of seedData.contracts) repositories.contracts.save(contract);
  }
}
