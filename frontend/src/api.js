const DEFAULT_API_URL = 'http://localhost:5000'

function getApiUrl() {
  return import.meta.env.VITE_API_URL || DEFAULT_API_URL
}

async function request(path, { method = 'GET', body, token } = {}) {
  // Dev-mode mock: only enabled when VITE_ENABLE_DEV_MOCK=1 and token === 'admin-token'
  const USE_DEV_MOCK = import.meta.env.VITE_ENABLE_DEV_MOCK === '1'
  if (USE_DEV_MOCK && token === 'admin-token') {
    // in-memory mock store (kept per session)
    if (!globalThis.__CAR_RENTAL_MOCK) {
      globalThis.__CAR_RENTAL_MOCK = {
        cars: [
          { id: 1, brand: 'Camelcar', model: 'Peugeot 2008', price_per_day: 69, available: true, image_url: null, provider: 'Camelcar' },
          { id: 2, brand: 'OK Mobility', model: 'Hyundai i10', price_per_day: 49, available: true, image_url: null, provider: 'OK Mobility' },
          { id: 3, brand: 'Budget', model: 'Renault Clio', price_per_day: 42, available: true, image_url: null, provider: 'Budget' },
          { id: 4, brand: 'Budget', model: 'Suzuki Swift', price_per_day: 42, available: true, image_url: null, provider: 'Budget' },
          { id: 5, brand: 'ONE', model: 'Hyundai i10', price_per_day: 39, available: true, image_url: null, provider: 'ONE' },
          { id: 6, brand: 'Camelcar', model: 'Fiat Tipo', price_per_day: 27, available: true, image_url: null, provider: 'Camelcar' },
        ],
        reservations: [
          { id: 1, user_id: 4, car_id: 1, start_date: '2026-06-21', end_date: '2026-06-24', status: 'confirmee', total_price: 81, car_brand: 'Camelcar', car_model: 'Fiat Tipo' },
          { id: 2, user_id: 5, car_id: 2, start_date: '2026-06-28', end_date: '2026-06-30', status: 'en_attente', total_price: 78, car_brand: 'ONE', car_model: 'Hyundai i10' },
          { id: 3, user_id: 4, car_id: 3, start_date: '2026-07-08', end_date: '2026-07-13', status: 'confirmee', total_price: 210, car_brand: 'Budget', car_model: 'Renault Clio' },
        ],
        users: [
          { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin' },
          { id: 4, name: 'Amina Benali', email: 'amina@example.com', role: 'client' },
          { id: 5, name: 'Mohamed K.', email: 'mohamed@example.com', role: 'client' },
        ],
        nextCarId: 7,
        nextResId: 4,
        nextUserId: 6,
      }
    }

    const store = globalThis.__CAR_RENTAL_MOCK

    // simple router for mock endpoints
    if (path.startsWith('/api/cars')) {
      if (method === 'GET') {
        if (path.includes('/available')) {
          // return all available cars
          return store.cars.filter((c) => c.available)
        }
        return store.cars
      }
      if (method === 'POST') {
        const newCar = { id: store.nextCarId++, ...body }
        store.cars.push(newCar)
        return newCar
      }
      if (method === 'PUT') {
        const id = Number(path.split('/').pop())
        const idx = store.cars.findIndex((c) => c.id === id)
        if (idx === -1) throw new Error('Voiture introuvable')
        store.cars[idx] = { ...store.cars[idx], ...body }
        return store.cars[idx]
      }
      if (method === 'DELETE') {
        const id = Number(path.split('/').pop())
        store.cars = store.cars.filter((c) => c.id !== id)
        return { success: true }
      }
    }

    if (path.startsWith('/api/reservations')) {
      if (method === 'GET') {
        if (path.endsWith('/me')) {
          return store.reservations.filter((r) => r.user_id === 1)
        }
        return store.reservations
      }
      if (method === 'POST') {
        const newRes = {
          id: store.nextResId++,
          user_id: body.user_id || 1,
          car_id: body.car_id,
          start_date: body.start_date,
          end_date: body.end_date,
          status: body.status || 'en_attente',
          total_price: body.total_price || 42 * 2,
          car_brand: (store.cars.find((c) => c.id === body.car_id) || {}).brand,
          car_model: (store.cars.find((c) => c.id === body.car_id) || {}).model,
        }
        store.reservations.push(newRes)
        return newRes
      }
      if (method === 'PUT') {
        const id = Number(path.split('/').pop())
        const idx = store.reservations.findIndex((r) => r.id === id)
        if (idx === -1) throw new Error('Réservation introuvable')
        store.reservations[idx] = { ...store.reservations[idx], ...body }
        return store.reservations[idx]
      }
      if (method === 'DELETE') {
        const id = Number(path.split('/').pop())
        store.reservations = store.reservations.filter((r) => r.id !== id)
        return { success: true }
      }
    }

    if (path.startsWith('/api/users')) {
      if (method === 'GET') {
        return store.users
      }
      if (method === 'DELETE') {
        const id = Number(path.split('/').pop())
        store.users = store.users.filter((u) => u.id !== id)
        return { success: true }
      }
      if (method === 'PUT') {
        const id = Number(path.split('/').pop())
        const idx = store.users.findIndex((u) => u.id === id)
        if (idx === -1) throw new Error('Utilisateur introuvable')
        store.users[idx] = { ...store.users[idx], ...body }
        return store.users[idx]
      }
      if (method === 'POST') {
        const newUser = { id: store.nextUserId++, ...body }
        store.users.push(newUser)
        return newUser
      }
    }

    // fallback: return empty object
    return {}
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let data = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      const error = new Error(
        response.ok
          ? 'Reponse API invalide.'
          : 'Le serveur a renvoye une reponse invalide. Verifiez que le backend est lance sur le port 5000.',
      )
      error.status = response.status
      error.rawResponse = text
      throw error
    }
  }

  if (!response.ok) {
    const message = data?.message || 'Une erreur est survenue'
    const error = new Error(message)
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function isAuthError(error) {
  return error?.status === 401
}

export function login(payload) {
  return request('/api/auth/login', { method: 'POST', body: payload })
}

export function register(payload) {
  return request('/api/auth/register', { method: 'POST', body: payload })
}

export function getCars(token) {
  return request('/api/cars', { token })
}

export function getAvailableCars(startDate, endDate) {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
  return request(`/api/cars/available?${params.toString()}`)
}

export function createReservation(payload, token) {
  return request('/api/reservations', { method: 'POST', body: payload, token })
}

export function getMyReservations(token) {
  return request('/api/reservations/me', { token })
}

export function getAllReservations(token) {
  return request('/api/reservations', { token })
}

export function updateReservation(id, payload, token) {
  return request(`/api/reservations/${id}`, { method: 'PUT', body: payload, token })
}

export function deleteReservation(id, token) {
  return request(`/api/reservations/${id}`, { method: 'DELETE', token })
}

export function getUsers(token) {
  return request('/api/users', { token })
}

export function deleteUser(id, token) {
  return request(`/api/users/${id}`, { method: 'DELETE', token })
}

export function createCar(payload, token) {
  return request('/api/cars', { method: 'POST', body: payload, token })
}

export function updateCar(id, payload, token) {
  return request(`/api/cars/${id}`, { method: 'PUT', body: payload, token })
}

export function deleteCar(id, token) {
  return request(`/api/cars/${id}`, { method: 'DELETE', token })
}

export function createUser(payload, token) {
  return request('/api/users', { method: 'POST', body: payload, token })
}

export function updateUser(id, payload, token) {
  return request(`/api/users/${id}`, { method: 'PUT', body: payload, token })
}
