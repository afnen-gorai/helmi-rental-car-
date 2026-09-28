require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
    multipleStatements: true,
  })

  const seedPath = path.join(__dirname, '..', 'database', 'seed.sql')
  const seedSql = fs.readFileSync(seedPath, 'utf8')

  console.log('Connexion MySQL OK')
  console.log('Insertion des voitures de démo...')

  await connection.query(seedSql)

  const [cars] = await connection.query(
    'SELECT id, marque, modele, prix_jour FROM cars ORDER BY id',
  )

  console.log(`✅ ${cars.length} voiture(s) dans la base :`)
  cars.forEach((car) => {
    console.log(`  - #${car.id} ${car.marque} ${car.modele} (${car.prix_jour} €/jour)`)
  })

  await connection.end()
}

run().catch((error) => {
  console.error('❌ Erreur seed :', error.message)
  process.exit(1)
})
