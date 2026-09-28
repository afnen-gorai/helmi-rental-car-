require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mysql = require('mysql2/promise')

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
  })

  console.log('=== Voitures ===')
  const [cars] = await connection.query('SELECT id, marque, modele, annee, prix_jour, disponible FROM cars ORDER BY id')
  cars.forEach((c) => console.log(`#${c.id} ${c.marque} ${c.modele} (${c.annee}) - ${c.prix_jour}€ - ${c.disponible ? 'Disponible' : 'Indisponible'}`))

  console.log('\n=== Réservations ===')
  const [res] = await connection.query(`SELECT r.id, r.user_id, u.nom as user_nom, r.car_id, c.marque as car_marque, c.modele as car_modele, r.date_debut AS start_date, r.date_fin AS end_date, r.statut as status FROM reservations r LEFT JOIN users u ON r.user_id = u.id LEFT JOIN cars c ON r.car_id = c.id ORDER BY r.id`)
  if (res.length === 0) console.log('Aucune réservation')
  res.forEach((r) => console.log(`#${r.id} user:${r.user_id} (${r.user_nom}) car:${r.car_id} ${r.car_marque} ${r.car_modele} ${r.start_date} -> ${r.end_date} [${r.status}]`))

  await connection.end()
}

run().catch((err) => { console.error('Erreur:', err.message); process.exit(1) })
