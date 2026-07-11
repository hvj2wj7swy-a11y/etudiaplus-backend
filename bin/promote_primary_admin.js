#!/usr/bin/env node
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const TARGET_ADMIN_EMAIL = 'etudiaplus@outlook.com';

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || undefined;
const DB_NAME = process.env.DB_NAME || 'edudia_plus';

const run = async () => {
  const requestedEmail = String(process.argv[2] || TARGET_ADMIN_EMAIL).trim().toLowerCase();

  if (requestedEmail !== TARGET_ADMIN_EMAIL) {
    console.error(`❌ Ce script peut uniquement promouvoir ${TARGET_ADMIN_EMAIL}.`);
    process.exit(1);
  }

  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  await client.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'student'
    `);

    await client.query(`
      UPDATE users
      SET role = 'student'
      WHERE role IS NULL OR role = ''
    `);

    const promoteResult = await client.query(
      `
      UPDATE users
      SET role = 'admin', updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, email, role
      `,
      [TARGET_ADMIN_EMAIL]
    );

    if (promoteResult.rowCount === 0) {
      throw new Error(`Aucun utilisateur trouvé avec l'email ${TARGET_ADMIN_EMAIL}`);
    }

    await client.query('COMMIT');

    const promoted = promoteResult.rows[0];
    console.log('✅ Promotion administrateur réussie.');
    console.log(`   - id: ${promoted.id}`);
    console.log(`   - email: ${promoted.email}`);
    console.log(`   - role: ${promoted.role}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Échec de promotion:', error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('❌ Erreur inattendue:', error.message || error);
  process.exit(1);
});
