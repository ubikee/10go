import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const TRANSACTIONS_DDL = `CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  contractId TEXT,
  direction TEXT NOT NULL,
  amount REAL,
  baseAmount REAL,
  vatRate REAL,
  vatAmount REAL,
  withholdingRate REAL,
  withholdingAmount REAL,
  currency TEXT NOT NULL,
  date TEXT NOT NULL,
  invoiceNumber TEXT,
  counterparty TEXT,
  memberId TEXT,
  carId TEXT,
  houseId TEXT,
  category TEXT,
  billingPeriod TEXT,
  notes TEXT,
  fileName TEXT,
  storedName TEXT,
  mimeType TEXT,
  size INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS houses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  type TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  plate TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subtype TEXT,
  role TEXT,
  direction TEXT NOT NULL,
  amountType TEXT NOT NULL DEFAULT 'fixed',
  amount REAL,
  vatRate REAL NOT NULL DEFAULT 0.21,
  withholdingRate REAL NOT NULL DEFAULT 0.15,
  currency TEXT NOT NULL,
  recurrence TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT,
  paymentDay INTEGER,
  houseId TEXT,
  carId TEXT,
  memberId TEXT,
  status TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

${TRANSACTIONS_DDL}
`;

export function createConnection(databasePath) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

function migrate(db) {
  addColumn(db, 'contracts', 'amountType', "TEXT NOT NULL DEFAULT 'fixed'");
  addColumn(db, 'contracts', 'vatRate', 'REAL NOT NULL DEFAULT 0.21');
  addColumn(db, 'contracts', 'withholdingRate', 'REAL NOT NULL DEFAULT 0.15');
  addColumn(db, 'contracts', 'carId', 'TEXT');

  migrateTransactions(db);

  // Migra la antigua tabla "recibos" a "transactions"
  const hasRecibos = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='recibos'").get();
  if (hasRecibos) {
    try {
      db.exec(`
        INSERT INTO transactions (
          id, contractId, direction, amount, currency, date, invoiceNumber, counterparty,
          billingPeriod, notes, fileName, storedName, mimeType, size, createdAt, updatedAt
        )
        SELECT
          id, contractId,
          COALESCE((SELECT direction FROM contracts c WHERE c.id = recibos.contractId), 'expense'),
          amount, currency,
          COALESCE(issuedAt, substr(createdAt, 1, 10), date('now')),
          invoiceNumber, NULL, billingPeriod, notes, fileName, storedName, mimeType, size,
          createdAt, updatedAt
        FROM recibos
      `);
      db.exec('DROP TABLE recibos');
    } catch {
      // migración best-effort; si falla se ignora
    }
  }
}

function migrateTransactions(db) {
  const cols = db.prepare('PRAGMA table_info(transactions)').all();
  const contractIdCol = cols.find((c) => c.name === 'contractId');
  const hasCarId = cols.some((c) => c.name === 'carId');

  if (contractIdCol && contractIdCol.notnull === 1) {
    rebuildTransactions(db);
  } else if (!hasCarId) {
    addColumn(db, 'transactions', 'carId', 'TEXT');
    addColumn(db, 'transactions', 'houseId', 'TEXT');
    addColumn(db, 'transactions', 'category', 'TEXT');
  }
}

function rebuildTransactions(db) {
  db.exec('ALTER TABLE transactions RENAME TO transactions_old');
  db.exec(TRANSACTIONS_DDL);
  db.exec(`
    INSERT INTO transactions (
      id, contractId, direction, amount, baseAmount, vatRate, vatAmount,
      withholdingRate, withholdingAmount, currency, date, invoiceNumber, counterparty,
      memberId, carId, houseId, category, billingPeriod, notes, fileName, storedName,
      mimeType, size, createdAt, updatedAt
    )
    SELECT
      id, contractId, direction, amount, baseAmount, vatRate, vatAmount,
      withholdingRate, withholdingAmount, currency, date, invoiceNumber, counterparty,
      memberId, NULL, NULL, NULL, billingPeriod, notes, fileName, storedName,
      mimeType, size, createdAt, updatedAt
    FROM transactions_old
  `);
  db.exec('DROP TABLE transactions_old');
}

function addColumn(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    } catch {
      // ya existe o no aplica
    }
  }
}
