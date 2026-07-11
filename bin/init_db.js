#!/usr/bin/env node
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { ensureDatabaseReady } = require('../src/config/bootstrapDatabase');

const run = async () => {
  await ensureDatabaseReady();
  console.log('✅ Initialisation PostgreSQL terminée.');
};

run().catch((error) => {
  console.error('❌ Erreur lors de l\'initialisation de la base :', error.message || error);
  process.exit(1);
});
