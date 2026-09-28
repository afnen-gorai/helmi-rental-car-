require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

const ADMIN = {
  nom: 'Administrateur Halouma',
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  role: 'admin',
}

async function run() {
  if (!ADMIN.email || !ADMIN.password) {
    throw new Error('Configurez ADMIN_EMAIL et ADMIN_PASSWORD dans backend/.env avant de créer le compte admin.')
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'car_rental',
  })

  const hashedPassword = bcrypt.hashSync(ADMIN.password, 10)

  const [existing] = await connection.query(
    'SELECT id FROM users WHERE email = ?',
    [ADMIN.email],
  )

  if (existing.length > 0) {
    await connection.query(
      'UPDATE users SET nom = ?, mot_de_passe = ?, role = ? WHERE email = ?',
      [ADMIN.nom, hashedPassword, ADMIN.role, ADMIN.email],
    )
    console.log('✅ Compte admin mis à jour')
  } else {
    await connection.query(
      'INSERT INTO users (nom, email, mot_de_passe, role) VALUES (?, ?, ?, ?)',
      [ADMIN.nom, ADMIN.email, hashedPassword, ADMIN.role],
    )
    console.log('✅ Compte admin créé')
  }

  console.log(`   Email    : ${ADMIN.email}`)
  console.log('   Mot de passe : défini dans backend/.env')

  await connection.end()
}

run().catch((error) => {
  console.error('❌ Erreur seed admin :', error.message)
  process.exit(1)
})
