#!/usr/bin/env node
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || undefined;
const DB_NAME = process.env.DB_NAME || 'edudia_plus';

const run = async () => {
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

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'users_role_check'
        ) THEN
          ALTER TABLE users
          ADD CONSTRAINT users_role_check
          CHECK (role IN ('student', 'admin'));
        END IF;
      END
      $$;
    `);

    await client.query('COMMIT');
    console.log('✅ Colonne role vérifiée/ajoutée avec défaut student.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Échec ensure_user_role_column:', error.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error('❌ Erreur inattendue:', error.message || error);
  process.exit(1);
});
