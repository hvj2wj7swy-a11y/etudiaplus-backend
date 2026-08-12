const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 5432);
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || undefined;
const DB_NAME = process.env.DB_NAME || 'edudia_plus';
const DB_DEFAULT = process.env.DB_DEFAULT || 'postgres';

const schemaPath = path.resolve(
  __dirname,
  '../../database/schema.sql'
);

const connectClient = (database) => {
  if (DB_URL) {
    return new Client({
      connectionString: DB_URL,
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    });
  }

  return new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database,
  });
};

const normalizeSchemaSql = (rawSql) => {
  let schemaSql = rawSql.replace(/\/\*[\s\S]*?\*\//g, '');
  schemaSql = schemaSql.replace(/--.*$/gm, '');

  return schemaSql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0)
    .map((stmt) => {
      if (/^CREATE TABLE/i.test(stmt)) {
        return stmt.replace(/^CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS');
      }
      if (/^CREATE INDEX/i.test(stmt)) {
        return stmt.replace(/^CREATE INDEX/i, 'CREATE INDEX IF NOT EXISTS');
      }
      return stmt;
    });
};

const ensureDatabaseExists = async () => {
  const client = connectClient(DB_DEFAULT);
  await client.connect();

  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [DB_NAME]);
    if (res.rowCount === 0) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Base de données créée: ${DB_NAME}`);
    } else {
      console.log(`✅ Base de données existante: ${DB_NAME}`);
    }
  } finally {
    await client.end();
  }
};

const applySchema = async () => {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schéma introuvable: ${schemaPath}`);
  }

  const rawSql = fs.readFileSync(schemaPath, 'utf8');
  const statements = normalizeSchemaSql(rawSql);

  const dbClient = connectClient(DB_NAME);
  await dbClient.connect();

  try {
    for (const [index, statement] of statements.entries()) {
      try {
        await dbClient.query(statement);
      } catch (error) {
        if (['42P07', '42710'].includes(error.code)) {
          continue;
        }
        throw new Error(`Échec SQL #${index + 1}: ${error.message}`);
      }
    }

    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'student\'');
    await dbClient.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) DEFAULT 'trial'");
    await dbClient.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'");
    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP');
    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP');
    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMP');
    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMP');
    await dbClient.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false');
await dbClient.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)
`);

await dbClient.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)
`);
    await dbClient.query("UPDATE users SET role = 'student' WHERE role IS NULL OR role = ''");
    await dbClient.query(`
      UPDATE users
      SET subscription_type = 'none'
      WHERE subscription_type IS NULL OR subscription_type = ''
    `);
    await dbClient.query(`
      UPDATE users
      SET trial_start = COALESCE(trial_start, created_at, CURRENT_TIMESTAMP)
      WHERE subscription_type = 'trial'
    `);
    await dbClient.query(`
      UPDATE users
      SET trial_end = COALESCE(trial_end, trial_start + INTERVAL '30 days', CURRENT_TIMESTAMP + INTERVAL '30 days')
      WHERE subscription_type = 'trial'
    `);
    await dbClient.query(`
      UPDATE users
      SET subscription_status = CASE
        WHEN role = 'admin' THEN 'active'
        WHEN subscription_type = 'trial' AND trial_end < CURRENT_TIMESTAMP THEN 'expired'
        WHEN subscription_status IS NULL OR subscription_status = '' THEN 'inactive'
        ELSE subscription_status
      END
    `);
    await dbClient.query(`
      UPDATE users
      SET auto_renew = COALESCE(auto_renew, false)
    `);

    await dbClient.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_subscription_type_check
    `);
    await dbClient.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_subscription_type_check
      CHECK (subscription_type IN ('trial', 'monthly', 'annual', 'none'))
    `);

    await dbClient.query(`
      ALTER TABLE users
      DROP CONSTRAINT IF EXISTS users_subscription_status_check
    `);
    await dbClient.query(`
      ALTER TABLE users
      ADD CONSTRAINT users_subscription_status_check
      CHECK (subscription_status IN ('active', 'inactive', 'expired', 'canceled'))
    `);

    await dbClient.query('ALTER TABLE users ALTER COLUMN auto_renew SET DEFAULT false');
    await dbClient.query('ALTER TABLE users ALTER COLUMN auto_renew SET NOT NULL');
    await dbClient.query(`
  ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS folder_name VARCHAR(255) DEFAULT 'Sans dossier'
`);

await dbClient.query(`
  ALTER TABLE notebooks
  ADD COLUMN IF NOT EXISTS source_pdf JSONB
`);

await dbClient.query(`
  ALTER TABLE note_pages
  ADD COLUMN IF NOT EXISTS background JSONB
`);

await dbClient.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255)
`);

await dbClient.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP
`);

await dbClient.query(`
  CREATE TABLE IF NOT EXISTS notebook_folders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
  )
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS idx_notebook_folders_user_id
  ON notebook_folders(user_id)
`);

await dbClient.query(`
  INSERT INTO notebook_folders (user_id, name)
  SELECT DISTINCT
    user_id,
    COALESCE(NULLIF(TRIM(folder_name), ''), 'Sans dossier')
  FROM notebooks
  ON CONFLICT (user_id, name) DO NOTHING
`);

await dbClient.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,

    message TEXT NOT NULL,

    link VARCHAR(500),

    metadata JSONB,

    is_read BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    read_at TIMESTAMP
  )
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON notifications(user_id)
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read)
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC)
`);
await dbClient.query(`
  CREATE TABLE IF NOT EXISTS agenda_events (
    id SERIAL PRIMARY KEY,

    user_id INT NOT NULL
      REFERENCES users(id)
      ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,

    type VARCHAR(50) NOT NULL
      DEFAULT 'cours',

    event_date DATE NOT NULL,

    start_time TIME NOT NULL,

    end_time TIME NOT NULL,

    course VARCHAR(255),

    description TEXT,

    color VARCHAR(30),

    created_at TIMESTAMP NOT NULL
      DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL
      DEFAULT CURRENT_TIMESTAMP
  )
`);
await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20)
  DEFAULT 'none'
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(100)
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_recurrence_type_check
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD CONSTRAINT agenda_events_recurrence_type_check
  CHECK (
    recurrence_type IN (
      'none',
      'weekly',
      'biweekly',
      'monthly'
    )
  )
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS
  idx_agenda_events_recurrence_group
  ON agenda_events(recurrence_group_id)
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS reminder_minutes_list JSONB
  DEFAULT '[]'::jsonb
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_reminder_minutes_check
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD CONSTRAINT agenda_events_reminder_minutes_check
  CHECK (
    reminder_minutes IS NULL
    OR reminder_minutes IN (
      5,
      15,
      30,
      60,
      1440,
      10080
    )
  )
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20)
  DEFAULT 'normal'
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD COLUMN IF NOT EXISTS status VARCHAR(20)
  DEFAULT 'todo'
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_status_check
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD CONSTRAINT agenda_events_status_check
  CHECK (
    status IN (
      'todo',
      'in_progress',
      'completed',
      'cancelled'
    )
  )
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  DROP CONSTRAINT IF EXISTS agenda_events_priority_check
`);

await dbClient.query(`
  ALTER TABLE agenda_events
  ADD CONSTRAINT agenda_events_priority_check
  CHECK (
    priority IN (
      'low',
      'normal',
      'important',
      'urgent'
    )
  )
`);

await dbClient.query(`
  CREATE INDEX IF NOT EXISTS
  idx_agenda_events_user_date
  ON agenda_events(user_id, event_date)
`);

    console.log('✅ Schéma PostgreSQL prêt.');
  } finally {
    await dbClient.end();
  }
};

const ensureDatabaseReady = async () => {
  await ensureDatabaseExists();
  await applySchema();
};

module.exports = {
  ensureDatabaseReady
};
