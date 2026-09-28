// E2E script using Playwright
// Install: npm --prefix frontend install --save-dev playwright
// Run: npm --prefix frontend run e2e

const { chromium } = require('playwright');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Replace with your local dev URL
  const url = process.env.E2E_URL || 'http://localhost:5174/?asAdmin=1';
  await page.goto(url, { waitUntil: 'networkidle' });

  // Ensure admin token present by logging in via API
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:5000';
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error('Définissez ADMIN_EMAIL et ADMIN_PASSWORD pour le test E2E.');
  }
  const login = await page.request.post(`${apiUrl}/api/auth/login`, {
    data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
  });
  const loginJson = await login.json();
  if (!loginJson.token) {
    console.error('Login failed', loginJson);
    await browser.close();
    process.exit(2);
  }

  await page.evaluate((t, u) => {
    localStorage.setItem('car-rental-token', t);
    localStorage.setItem('car-rental-user', JSON.stringify(u));
  }, loginJson.token, loginJson.user);

  await page.reload({ waitUntil: 'networkidle' });

  // Navigate to Voitures
  await page.click('text=Voitures');
  await page.waitForSelector('input[placeholder="Halouma"]');

  // Fill form
  await page.fill('input[placeholder="Halouma"]', 'E2EBrand');
  await page.fill('input[placeholder="Clio"]', 'E2EModel');
  // fill price (second number input)
  const numberInputs = await page.$$('input[type="number"]');
  if (numberInputs.length >= 2) {
    await numberInputs[1].fill('77');
  } else if (numberInputs.length === 1) {
    await numberInputs[0].fill('77');
  }

  await page.fill('input[placeholder="https://..."]', 'https://example.com/e2e.jpg');
  // submit
  await page.click('text=Ajouter');
  // wait a bit
  await page.waitForTimeout(800);

  // verify via API that car exists
  const apiRes = await page.request.get('http://localhost:5000/api/cars', { headers: { Authorization: `Bearer ${loginJson.token}` } });
  const cars = await apiRes.json();
  const found = cars.find(c => c.marque === 'E2EBrand' || c.modele === 'E2EModel');

  if (found) {
    console.log('E2E success, created car id', found.id);
    // cleanup
    await page.request.delete(`http://localhost:5000/api/cars/${found.id}`, { headers: { Authorization: `Bearer ${loginJson.token}` } });
    await browser.close();
    process.exit(0);
  }

  console.error('E2E failed: car not found');
  await browser.close();
  process.exit(3);
}

run().catch((e) => { console.error(e); process.exit(4) })
