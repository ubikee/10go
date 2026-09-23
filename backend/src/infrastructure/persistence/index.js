import path from 'node:path';
import { seedData } from './seed.js';
import { JsonCollection } from './json/json-collection.js';
import { JsonMemberRepository } from './json/json-member-repository.js';
import { JsonHouseRepository } from './json/json-house-repository.js';
import { JsonContractRepository } from './json/json-contract-repository.js';
import { createConnection } from './sqlite/connection.js';
import { SqliteMemberRepository } from './sqlite/sqlite-member-repository.js';
import { SqliteHouseRepository } from './sqlite/sqlite-house-repository.js';
import { SqliteContractRepository } from './sqlite/sqlite-contract-repository.js';

export async function createRepositories(config) {
  if (config.persistence === 'sqlite') {
    return createSqliteRepositories(config);
  }
  return createJsonRepositories(config);
}

async function createJsonRepositories(config) {
  const members = new JsonCollection(path.join(config.dataDir, 'members.json'));
  const houses = new JsonCollection(path.join(config.dataDir, 'houses.json'));
  const contracts = new JsonCollection(path.join(config.dataDir, 'contracts.json'));

  await members.seed(seedData.members);
  await houses.seed(seedData.houses);
  await contracts.seed(seedData.contracts);

  return {
    members: new JsonMemberRepository(members),
    houses: new JsonHouseRepository(houses),
    contracts: new JsonContractRepository(contracts),
  };
}

function createSqliteRepositories(config) {
  const db = createConnection(config.databasePath);

  const repositories = {
    members: new SqliteMemberRepository(db),
    houses: new SqliteHouseRepository(db),
    contracts: new SqliteContractRepository(db),
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
