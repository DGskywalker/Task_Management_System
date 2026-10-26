// In-memory PostgreSQL (pg-mem) loaded with the real schema.sql, used in
// place of db.js so the tests need no database server.
const fs = require('fs');
const path = require('path');
const { newDb, DataType } = require('pg-mem');

function createFakePool() {
  const mem = newDb();
  // pg-mem implements few built-in functions; register the ones schema.sql uses.
  mem.public.registerFunction({ name: 'trim', args: [DataType.text], returns: DataType.text, implementation: s => s.trim() });
  mem.public.registerFunction({ name: 'length', args: [DataType.text], returns: DataType.integer, implementation: s => s.length });
  mem.public.none(fs.readFileSync(path.join(__dirname, '../../schema.sql'), 'utf8'));
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  const clean = mem.backup();
  pool.mockReset = () => clean.restore();
  pool.mockDb = mem;
  return pool;
}

module.exports = { createFakePool };
