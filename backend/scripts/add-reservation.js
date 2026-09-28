require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mysql = require('mysql2/promise')

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = args[i+1]
      out[key] = val
      i++
    }
  }
  return out
}

const argv = parseArgs()
if (!argv.user || !argv.car || !argv.start || !argv.end) {
  console.error('Usage: node add-reservation.js --user user@example.com --car 2 --start YYYY-MM-DD --end YYYY-MM-DD [--status statut]')
  process.exit(1)
}
argv.status = argv.status || 'en_attente'
async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
  })

  // find user id
  const [users] = await conn.query('SELECT id FROM users WHERE email = ?', [argv.user])
  if (users.length === 0) {
    console.error('Utilisateur introuvable:', argv.user)
    process.exit(1)
  }
  const userId = users[0].id

  // check car exists
  const [cars] = await conn.query('SELECT id FROM cars WHERE id = ?', [argv.car])
  if (cars.length === 0) {
    console.error('Voiture introuvable:', argv.car)
    process.exit(1)
  }

  // insert
  const [res] = await conn.query('INSERT INTO reservations (user_id, car_id, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, ?)', [userId, argv.car, argv.start, argv.end, argv.status])
  console.log('Réservation ajoutée id=', res.insertId)

  await conn.end()
}

run().catch((e) => { console.error('Erreur:', e.message); process.exit(1) })
