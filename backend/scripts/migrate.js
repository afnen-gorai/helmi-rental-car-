require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function ensureIndex(connection, name, sql) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'reservations'
       AND INDEX_NAME = ?`,
    [name],
  )

  if (rows[0].total === 0) {
    await connection.query(sql)
    console.log(`  + index ${name}`)
  }
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
    multipleStatements: true,
  })

  const migratePath = path.join(__dirname, '..', 'database', 'migrate.sql')
  const migrateSql = fs.readFileSync(migratePath, 'utf8')

  console.log('Application des migrations...')
  await connection.query(migrateSql)

  await ensureIndex(
    connection,
    'idx_reservations_car_dates',
    'CREATE INDEX idx_reservations_car_dates ON reservations (car_id, date_debut, date_fin)',
  )
  await ensureIndex(
    connection,
    'idx_reservations_user',
    'CREATE INDEX idx_reservations_user ON reservations (user_id)',
  )

  console.log('✅ Migrations appliquées')
  await connection.end()
}

run().catch((error) => {
  console.error('❌ Erreur migration :', error.message)
  process.exit(1)
})
