require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const fetch = global.fetch || require('node-fetch')

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`

async function run() {
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Configurez ADMIN_EMAIL et ADMIN_PASSWORD dans backend/.env avant le test.')
  }

  try {
    console.log('1) Login admin')
    const loginRes = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
    })
    const loginBody = await loginRes.json()
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginBody)}`)
    const token = loginBody.token
    console.log('  -> got token (len)', token ? token.length : 0)

    console.log('2) Create car')
    const unique = Date.now().toString().slice(-6)
    const carPayload = { brand: `IT-${unique}`, model: `Test-${unique}`, year: 2022, price_per_day: 77, image_url: null, available: true }
    const createRes = await fetch(`${API}/api/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(carPayload),
    })
    const createBodyText = await createRes.text()
    let createBody
    try { createBody = createBodyText ? JSON.parse(createBodyText) : null } catch (e) { createBody = createBodyText }
    console.log('  -> create status', createRes.status, createBody)
    if (!createRes.ok) throw new Error('Create car failed')

    console.log('3) Fetch cars and find created one')
    const listRes = await fetch(`${API}/api/cars`, { headers: { Authorization: `Bearer ${token}` } })
    const list = await listRes.json()
    const found = list.find(c => c.brand === carPayload.brand && c.model === carPayload.model)
    if (!found) throw new Error('Created car not found in list')
    console.log('  -> found car id', found.id)

    console.log('4) Delete created car')
    const delRes = await fetch(`${API}/api/cars/${found.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const delBody = await delRes.json()
    console.log('  -> delete status', delRes.status, delBody)

    // verify deletion
    const list2 = await (await fetch(`${API}/api/cars`, { headers: { Authorization: `Bearer ${token}` } })).json()
    const still = list2.find(c => c.id === found.id)
    if (still) throw new Error('Car still present after delete')
    console.log('✅ Integration test passed: create -> delete OK')
    process.exit(0)
  } catch (err) {
    console.error('❌ Integration test failed:')
    console.error(err && err.stack ? err.stack : err)
    process.exit(2)
  }
}

run()
