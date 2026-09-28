require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
  })

  console.log('Connexion MySQL OK — insertion utilisateurs et réservations de test')

  // Insert two test clients (upsert)
  const clients = [
    { nom: 'Amina Benali', email: 'amina@example.com', password: 'password1' },
    { nom: 'Mohamed K.', email: 'mohamed@example.com', password: 'password2' },
  ]

  for (const c of clients) {
    const hashed = bcrypt.hashSync(c.password, 10)
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [c.email])
    if (existing.length > 0) {
      await connection.query('UPDATE users SET nom = ?, mot_de_passe = ?, role = ? WHERE email = ?', [c.nom, hashed, 'client', c.email])
      console.log(`Mis à jour : ${c.email}`)
    } else {
      await connection.query('INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)', [c.nom, c.email, hashed, 'client'])
      console.log(`Créé : ${c.email}`)
    }
  }

  // Insert sample reservations (clear existing demo reservations first)
  await connection.query('DELETE FROM reservations')

  // Get user ids and car ids
  const [[userA]] = await connection.query('SELECT id FROM users WHERE email = ?', [clients[0].email])
  const [[userB]] = await connection.query('SELECT id FROM users WHERE email = ?', [clients[1].email])
  const [cars] = await connection.query('SELECT id FROM cars ORDER BY id')

  if (cars.length === 0) {
    console.log('Aucune voiture trouvée — exécutez d abord db:seed pour insérer les voitures')
    await connection.end()
    return
  }

  const today = new Date()
  const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000)

  const reservations = [
    { user_id: userA.id, car_id: cars[0].id, start: addDays(today, 3), end: addDays(today, 6), statut: 'confirmee' },
    { user_id: userB.id, car_id: cars[1].id, start: addDays(today, 10), end: addDays(today, 12), statut: 'en_attente' },
    { user_id: userA.id, car_id: cars[Math.min(2, cars.length-1)].id, start: addDays(today, 20), end: addDays(today, 25), statut: 'confirmee' },
  ]

  for (const r of reservations) {
    const start = r.start.toISOString().slice(0,10)
    const end = r.end.toISOString().slice(0,10)
    await connection.query('INSERT INTO reservations (user_id, car_id, date_debut, date_fin, statut) VALUES (?, ?, ?, ?, ?)', [r.user_id, r.car_id, start, end, r.statut])
    console.log(`Réservation: user ${r.user_id} car ${r.car_id} ${start} -> ${end}`)
  }

  await connection.end()
  console.log('✅ Seed extra terminé')
}

run().catch((err) => {
  console.error('Erreur seed-extra :', err.message)
  process.exit(1)
})
