import { useEffect, useState } from 'react'
import {
  createCar,
  deleteCar,
  getAllReservations,
  getUsers,
  deleteUser,
  updateCar,
  getCars as apiGetCars,
  createReservation,
  isAuthError,
  updateReservation,
  deleteReservation,
  createUser,
  updateUser,
} from './api'

const emptyCarForm = {
  brand: '',
  model: '',
  year: '',
  price_per_day: '',
  image_url: '',
  available: true,
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0 €'
  return `${Math.round(Number(value))} €`
}

function CircleStat({ size = 96, stroke = 10, percent = 0, label = '', value = '', notes = '', notesTitle = '' }) {
  const large = size > 100
  const className = large ? 'ss-circle ss-circle--large' : 'ss-circle'
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = Math.max(0, Math.min(100, percent)) / 100 * circumference
  const gradId = `g-${Math.random().toString(36).slice(2, 9)}`

  return (
    <div className={className} style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" x2="100%">
            <stop offset="0%" stopColor="#39d98a" />
            <stop offset="100%" stopColor="#16a085" />
          </linearGradient>
        </defs>
        <g transform={`translate(${size/2},${size/2})`}>
          <circle r={radius} fill="none" stroke="#e8f7ef" strokeWidth={stroke} />
          <circle r={radius} fill="none" stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={0} transform="rotate(-90)" />
        </g>
      </svg>
      <div className="ss-circle-label">
        <div className="ss-circle-value">{value}</div>
        <div className="ss-circle-sub">{label}</div>
        {notes && <div className="ss-circle-notes" title={notesTitle || notes}>{notes}</div>}
      </div>
      
    </div>
  )
}

function DonutChart({ items = [], size = 200, stroke = 24, centerValue = null, centerLabel = '' }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const total = items.reduce((s, it) => s + (it.value || 0), 0) || 1
  let acc = 0

  return (
    <div className="ss-donut" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`translate(${size/2},${size/2})`}>
          {items.map((it, idx) => {
            const val = it.value || 0
            const pct = val / total
            const dash = pct * circumference
            const offset = -acc / total * circumference
            acc += val
            return (
              <circle key={idx} r={radius} fill="none" stroke={it.color} strokeWidth={stroke} strokeLinecap="butt"
                strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={offset} transform="rotate(-90)" />
            )
          })}
          {centerValue !== null && (
            <>
              <text className="ss-donut-center-value" textAnchor="middle" dominantBaseline="central" y={-6} x={0}>{centerValue}</text>
              <text className="ss-donut-center-label" textAnchor="middle" dominantBaseline="central" y={16} x={0}>{centerLabel}</text>
            </>
          )}
        </g>
      </svg>
      <div className="ss-donut-legend">
        {items.map((it, i) => (
          <div key={i} className="ss-donut-legend-item">
            <span className="ss-donut-swatch" style={{ background: it.color }} />
            <span className="ss-donut-legend-label">{it.label} <strong>{it.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPanel({ token, cars, onClose, onRefresh, onSessionExpired, inline = false }) {
  const [carForm, setCarForm] = useState(emptyCarForm)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [reservations, setReservations] = useState([])
  const [reservationsLoading, setReservationsLoading] = useState(true)
  const [reservationForm, setReservationForm] = useState({ user_id: '', car_id: '', start_date: '', end_date: '', status: 'en_attente' })
  const [reservationErrors, setReservationErrors] = useState({})
  const [editingReservationId, setEditingReservationId] = useState(null)
  const [toasts, setToasts] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [carFilter, setCarFilter] = useState('')

  const TABS = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'cars', label: 'Voitures' },
    { id: 'reservations', label: 'Réservations' },
    { id: 'users', label: 'Utilisateurs' },
  ]

  function getTabIcon(id) {
    if (id === 'dashboard') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    )
    if (id === 'cars') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    )
    if (id === 'reservations') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
    if (id === 'users') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
    return null
  }

  const stored = typeof window !== 'undefined' ? localStorage.getItem('car-rental-user') : null
  const sidebarUser = stored ? JSON.parse(stored) : null

  const [localCars, setLocalCars] = useState(cars || [])
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'client' })
  const [editingUserId, setEditingUserId] = useState(null)
  const totalCars = localCars.length
  const availableCars = localCars.filter((car) => car.available).length
  const totalUsers = users.length
  const totalReservations = reservations.length
  const totalRevenue = reservations.reduce((sum, reservation) => sum + Number(reservation.total_price || 0), 0)

  function handleRequestError(err, fallback = setError) {
    if (isAuthError(err)) {
      onSessionExpired?.()
      return true
    }
    fallback(err.message)
    return false
  }

  // rentals count per car
  const rentalsCount = {}
  reservations.forEach((r) => {
    const id = Number(r.car_id)
    rentalsCount[id] = (rentalsCount[id] || 0) + 1
  })
  const carsWithRentals = (localCars || []).map((c) => ({ ...c, rentals: rentalsCount[c.id] || 0 }))
  const topRented = carsWithRentals.sort((a, b) => b.rentals - a.rentals).slice(0, 6)
  const maxRentals = topRented[0]?.rentals || 0
  const percentTop = totalReservations ? Math.round((maxRentals / totalReservations) * 100) : 0
  const fullNotes = carsWithRentals
    .filter((c) => c.rentals > 0)
    .sort((a, b) => b.rentals - a.rentals)
    .slice(0, 6)
    .map((c) => `${c.brand} ${c.model} ${c.rentals}x`)
    .join(' · ')
  const top3Notes = fullNotes.split(' · ').slice(0, 3).join(' · ')

  useEffect(() => {
    async function loadReservations() {
      setReservationsLoading(true)
      try {
        const data = await getAllReservations(token)
        setReservations(data)
      } catch (err) {
        handleRequestError(err)
      } finally {
        setReservationsLoading(false)
      }
    }

    loadReservations()
  }, [token])

  useEffect(() => {
    // default selection when users/cars load
    if (users && users.length > 0 && !reservationForm.user_id) {
      setReservationForm((f) => ({ ...f, user_id: users[0].id }))
    }
    if (localCars && localCars.length > 0 && !reservationForm.car_id) {
      setReservationForm((f) => ({ ...f, car_id: localCars[0].id }))
    }
  }, [users, localCars])

  useEffect(() => {
    let mounted = true
    async function loadUsers() {
      setUsersLoading(true)
      try {
        const data = await getUsers(token)
        if (!mounted) return
        setUsers(data || [])
      } catch (err) {
        handleRequestError(err)
      } finally {
        setUsersLoading(false)
      }
    }
    loadUsers()
    return () => { mounted = false }
  }, [token])

  function resetUserForm() {
    setUserForm({ name: '', email: '', role: 'client' })
    setEditingUserId(null)
    setError('')
    setMessage('')
  }

  async function handleUserSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      // Client-side validation for user
      if (!userForm.name || !userForm.name.trim()) {
        setError('Le nom est requis.')
        setLoading(false)
        return
      }
      if (!userForm.email || !userForm.email.includes('@')) {
        setError('Email invalide.')
        setLoading(false)
        return
      }
      // prevent duplicate email on create
      const existing = users.find((u) => u.email === userForm.email && u.id !== editingUserId)
      if (existing) {
        setError('Un utilisateur avec cet email existe déjà.')
        setLoading(false)
        return
      }

      if (editingUserId) {
        await updateUser(editingUserId, userForm, token)
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? { ...u, ...userForm } : u)))
        pushToast({ type: 'success', text: 'Utilisateur mis à jour.' })
      } else {
        const created = await createUser(userForm, token)
        setUsers((prev) => [...prev, created])
        pushToast({ type: 'success', text: 'Utilisateur créé.' })
      }
      resetUserForm()
    } catch (err) {
      handleRequestError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReservationSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setReservationErrors({})

    const errors = {}
    const user_id = Number(reservationForm.user_id)
    const car_id = Number(reservationForm.car_id)
    const start_date = reservationForm.start_date
    const end_date = reservationForm.end_date

    if (!user_id) errors.user_id = 'Sélectionnez un utilisateur.'
    if (!car_id) errors.car_id = 'Sélectionnez une voiture.'
    if (!start_date) errors.start_date = 'Date de début requise.'
    if (!end_date) errors.end_date = 'Date de fin requise.'

    const s = start_date ? new Date(start_date) : null
    const ed = end_date ? new Date(end_date) : null
    if (s && ed && s > ed) errors.date = 'La date de début doit être antérieure ou égale à la date de fin.'

    const today = new Date()
    today.setHours(0,0,0,0)
    if (s && s < today) errors.start_date = 'La date de début ne peut pas être dans le passé.'

    // check overlap
    if (s && ed && car_id) {
      const overlap = reservations.some((r) => {
        if (editingReservationId && r.id === editingReservationId) return false
        if (Number(r.car_id) !== car_id) return false
        if (r.status === 'annulee') return false
        const rs = new Date(r.start_date)
        const re = new Date(r.end_date)
        return (s <= re && rs <= ed)
      })
      if (overlap) errors.overlap = 'La voiture est déjà réservée sur ces dates.'
    }

    if (Object.keys(errors).length > 0) {
      setReservationErrors(errors)
      setLoading(false)
      return
    }

    const payload = {
      user_id,
      car_id,
      start_date,
      end_date,
      status: reservationForm.status,
    }

    try {
      if (editingReservationId) {
        if (!window.confirm('Confirmer la mise à jour de cette réservation ?')) {
          setLoading(false)
          return
        }
        // update existing reservation
        await updateReservation(editingReservationId, { start_date: payload.start_date, end_date: payload.end_date, status: payload.status }, token)
        setReservations((prev) => prev.map((r) => r.id === editingReservationId ? { ...r, user_id: payload.user_id, car_id: payload.car_id, start_date: payload.start_date, end_date: payload.end_date, status: payload.status } : r))
        pushToast({ type: 'success', text: 'Réservation mise à jour.' })
        setEditingReservationId(null)
      } else {
        const created = await createReservation(payload, token)
        setReservations((prev) => [...prev, created])
        pushToast({ type: 'success', text: 'Réservation créée.' })
      }
      setReservationForm({ user_id: '', car_id: '', start_date: '', end_date: '', status: 'en_attente' })
      setReservationErrors({})
    } catch (err) {
      if (!handleRequestError(err)) {
        pushToast({ type: 'error', text: err.message })
      }
    } finally {
      setLoading(false)
    }
  }

  function startEditReservation(reservation) {
    setEditingReservationId(reservation.id)
    setReservationForm({
      user_id: reservation.user_id || reservation.user_id,
      car_id: reservation.car_id || reservation.car_id,
      start_date: String(reservation.start_date).slice(0, 10),
      end_date: String(reservation.end_date).slice(0, 10),
      status: reservation.status || 'en_attente',
    })
    setReservationErrors({})
    setError('')
    setMessage('')
  }

  function cancelEditReservation() {
    setEditingReservationId(null)
    setReservationForm({ user_id: '', car_id: '', start_date: '', end_date: '', status: 'en_attente' })
    setReservationErrors({})
    setError('')
    setMessage('')
  }

  // helper to push toasts (stacked) and auto-dismiss
  function pushToast(t) {
    const id = Date.now() + Math.random()
    const item = { id, ...t, leaving: false }
    setToasts((prev) => [item, ...prev])
    // start exit animation slightly before removal
    setTimeout(() => {
      setToasts((prev) => prev.map((x) => x.id === id ? { ...x, leaving: true } : x))
    }, 3000)
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3500)
  }

  function dismissToast(id) {
    // trigger leaving animation then remove
    setToasts((prev) => prev.map((x) => x.id === id ? { ...x, leaving: true } : x))
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 180)
  }

  // Expose a small debug helper in dev/admin mode to add a car and refresh UI
  useEffect(() => {
    if (token === 'admin-token' && typeof window !== 'undefined') {
      window.__addCarDebug = async (car) => {
        const created = await createCar(car, token)
        try {
          await onRefresh()
        } catch (e) {
          // ignore
        }
        return created
      }
      return () => { delete window.__addCarDebug }
    }
    return undefined
  }, [token, onRefresh])

  // keep localCars in sync with parent `cars` prop
  useEffect(() => {
    setLocalCars(cars || [])
  }, [cars])

  // if inline and no cars provided yet, fetch from API (with token if available)
  useEffect(() => {
    let mounted = true
    async function loadCarsIfNeeded() {
      if (!inline) return
      if (localCars && localCars.length > 0) return
      try {
        const fetched = await apiGetCars(token)
        if (!mounted) return
        setLocalCars(fetched)
      } catch (err) {
        handleRequestError(err, () => {})
      }
    }
    loadCarsIfNeeded()
    return () => { mounted = false }
  }, [inline, localCars, token])

  const filteredCars = (localCars || []).filter((car) => {
    if (!carFilter) return true
    const q = carFilter.toLowerCase()
    return (car.brand || '').toLowerCase().includes(q) || (car.model || '').toLowerCase().includes(q)
  })

  function handleLogout() {
    localStorage.removeItem('car-rental-token')
    localStorage.removeItem('car-rental-user')
    window.location.reload()
  }

  function resetForm() {
    setCarForm(emptyCarForm)
    setEditingId(null)
  }

  function startEdit(car) {
    setEditingId(car.id)
    setCarForm({
      brand: car.brand || '',
      model: car.model || '',
      year: car.year || '',
      price_per_day: car.price_per_day || '',
      image_url: car.image_url || '',
      available: Boolean(car.available),
    })
    setError('')
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // Client-side validation
    if (!carForm.brand || !carForm.brand.trim()) {
      setError('La marque est requise.')
      setLoading(false)
      return
    }
    if (!carForm.model || !carForm.model.trim()) {
      setError('Le modèle est requis.')
      setLoading(false)
      return
    }
    const price = Number(carForm.price_per_day)
    if (!price || Number.isNaN(price) || price <= 0) {
      setError('Le prix par jour doit être un nombre supérieur à 0.')
      setLoading(false)
      return
    }
    if (carForm.year) {
      const y = Number(carForm.year)
      const cur = new Date().getFullYear()
      if (Number.isNaN(y) || y < 1900 || y > cur + 1) {
        setError("L'année est invalide.")
        setLoading(false)
        return
      }
    }
    if (carForm.image_url) {
      try {
        new URL(carForm.image_url)
      } catch (e) {
        setError("L'URL de l'image est invalide.")
        setLoading(false)
        return
      }
    }

    const payload = {
      brand: carForm.brand,
      model: carForm.model,
      year: carForm.year ? Number(carForm.year) : null,
      price_per_day: price,
      image_url: carForm.image_url || null,
      available: carForm.available,
    }

    try {
      if (editingId) {
        await updateCar(editingId, payload, token)
        pushToast({ type: 'success', text: 'Voiture mise à jour.' })
      } else {
        await createCar(payload, token)
        pushToast({ type: 'success', text: 'Voiture ajoutée.' })
      }

      resetForm()
      await onRefresh()
    } catch (err) {
      handleRequestError(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(carId) {
    if (!window.confirm('Supprimer cette voiture ?')) return

    setLoading(true)
    setError('')
    setMessage('')

    try {
      await deleteCar(carId, token)
      pushToast({ type: 'success', text: 'Voiture supprimée.' })
      if (editingId === carId) resetForm()
      await onRefresh()
    } catch (err) {
      handleRequestError(err)
    } finally {
      setLoading(false)
    }
  }

  const wrapperClass = inline ? 'ss-admin-inline' : 'ss-modal-overlay'
  const panelClass = inline ? 'ss-modal ss-admin-modal ss-admin-inline-panel' : 'ss-modal ss-admin-modal'

  return (
    <div className={wrapperClass} {...(!inline ? { onClick: onClose, role: 'presentation' } : {})}>
      <div className={panelClass} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Administration">
        {!inline && (
          <button type="button" className="ss-modal-close" onClick={onClose}>×</button>
        )}
        <div className="ss-admin-topbar">
          <div className="ss-admin-topbar-left">
            <strong>Administration</strong>
            <span className="ss-admin-top-sub">Halouma Travel</span>
          </div>
          <div className="ss-admin-topbar-right">
            <span className="ss-admin-user">{token ? 'Admin' : ''}</span>
            <button type="button" className="ss-admin-logout" onClick={handleLogout}>Déconnexion</button>
          </div>
        </div>

        <div className="ss-admin-layout">
          <aside className="ss-admin-sidebar">
            <div className="ss-admin-sidebar-head">
              <div className="ss-admin-avatar">{(sidebarUser && sidebarUser.name) ? sidebarUser.name.split(' ').map(n=>n[0]).slice(0,2).join('') : 'AD'}</div>
              <div>
                <h2>Administration</h2>
                <p className="ss-admin-intro">{sidebarUser?.name || 'Admin User'}</p>
              </div>
            </div>
            <nav className="ss-admin-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? 'active' : ''}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {getTabIcon(tab.id)}{tab.label}
                </button>
              ))}
            </nav>
            <div className="ss-admin-sidebar-stats">
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Voitures</span>
                  <strong>{totalCars}</strong>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Disponibles</span>
                  <strong>{availableCars}</strong>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Réservations</span>
                  <strong>{totalReservations}</strong>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Utilisateurs</span>
                  <strong>{totalUsers}</strong>
                </div>
              </div>
            </div>
          </aside>

          <main className="ss-admin-content">
            {activeTab === 'dashboard' && (
          <>
            <div className="ss-admin-summary">
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Voitures totales</span>
                  <strong>{totalCars}</strong>
                </div>
                <div className="ss-admin-stat-icon blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Disponibles</span>
                  <strong>{availableCars}</strong>
                </div>
                <div className="ss-admin-stat-icon green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Réservations</span>
                  <strong>{totalReservations}</strong>
                </div>
                <div className="ss-admin-stat-icon purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
              </div>
              <div className="ss-admin-stat-card">
                <div className="ss-admin-stat-content">
                  <span>Revenus estimés</span>
                  <strong>{formatPrice(totalRevenue)}</strong>
                </div>
                <div className="ss-admin-stat-icon gold">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
            </div>


            <div className="ss-admin-section">
              <h3>Dernières réservations</h3>
              {reservationsLoading && <p>Chargement...</p>}
              {!reservationsLoading && reservations.length === 0 && <p>Aucune réservation pour le moment.</p>}
              <div className="ss-admin-list">
                {reservations.slice(0, 6).map((reservation) => (
                  <div className="ss-admin-item" key={reservation.id}>
                    <div>
                      <strong>{reservation.car_brand} {reservation.car_model}</strong>
                      <span>
                        {String(reservation.start_date).slice(0, 10)} → {String(reservation.end_date).slice(0, 10)}
                      </span>
                    </div>
                    <div className="ss-admin-item-right">
                      <span className={`status-badge ${reservation.status}`}>
                        {reservation.status === 'en_attente' ? 'En attente' : reservation.status === 'confirmee' ? 'Confirmée' : 'Annulée'}
                      </span>
                      <strong>{formatPrice(reservation.total_price || reservation.price_per_day)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ss-admin-section">
              <h3>Statistiques</h3>
              <DonutChart
                items={(carsWithRentals || []).filter(c => c.rentals > 0).map((c, i) => ({
                  label: `${c.brand} ${c.model}`,
                  value: c.rentals,
                  color: ['#16a085','#39d98a','#4ade80','#60a5fa','#7c3aed','#fb7185','#f59e0b'][i % 7],
                }))}
                size={260}
                stroke={36}
                centerValue={totalReservations}
                centerLabel={`Réservations`}
              />
            </div>
          </>
        )}

        {activeTab === 'cars' && (
          <>
            <form className="ss-admin-form" onSubmit={handleSubmit}>
              <h3>{editingId ? 'Modifier une voiture' : 'Ajouter une voiture'}</h3>
              <div className="ss-admin-grid">
                <label>
                  Marque
                  <input value={carForm.brand} onChange={(e) => setCarForm({ ...carForm, brand: e.target.value })} placeholder="Halouma" required />
                </label>
                <label>
                  Modèle
                  <input value={carForm.model} onChange={(e) => setCarForm({ ...carForm, model: e.target.value })} placeholder="Clio" required />
                </label>
                <label>
                  Année
                  <input type="number" value={carForm.year} onChange={(e) => setCarForm({ ...carForm, year: e.target.value })} placeholder="2024" />
                </label>
                <label>
                  Prix / jour (€)
                  <input type="number" min="1" step="0.01" value={carForm.price_per_day} onChange={(e) => setCarForm({ ...carForm, price_per_day: e.target.value })} required />
                </label>
                <label className="ss-admin-full">
                  URL image
                  <input value={carForm.image_url} onChange={(e) => setCarForm({ ...carForm, image_url: e.target.value })} placeholder="https://..." />
                </label>
                <label className="ss-admin-checkbox">
                  <input type="checkbox" checked={carForm.available} onChange={(e) => setCarForm({ ...carForm, available: e.target.checked })} />
                  Disponible
                </label>
              </div>
              <div className="ss-admin-actions">
                {editingId && (
                  <button type="button" className="ss-ghost-btn" onClick={resetForm}>Annuler</button>
                )}
                <button type="submit" className="ss-search-btn" disabled={loading}>
                  {loading ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>

            {message && <p className="ss-success">{message}</p>}
            {error && <p className="ss-error">{error}</p>}

            <div className="ss-admin-section">
              <div className="ss-admin-section-header">
                <h3>Catalogue ({cars.length})</h3>
                <div className="ss-admin-actions-row">
                  <input className="ss-admin-search" placeholder="Rechercher marque ou modèle" value={carFilter} onChange={(e) => setCarFilter(e.target.value)} />
                  <button type="button" className="ss-admin-action-btn" onClick={() => { resetForm(); setCarFilter('') }}>Nouveau</button>
                </div>
              </div>
              <div className="ss-admin-list">
                {filteredCars.map((car) => (
                  <div className="ss-admin-item" key={car.id}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                      <CircleStat
                        size={64}
                        stroke={8}
                        percent={maxRentals ? Math.round(((rentalsCount[car.id] || 0) / maxRentals) * 100) : 0}
                        label=""
                        value={`${rentalsCount[car.id] || 0}x`}
                      />
                      <div>
                        <strong>{car.brand} {car.model}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ color: '#60a5fa', fontWeight: 600 }}>{formatPrice(car.price_per_day)} / jour</span>
                          <span className={`status-badge ${car.available ? 'confirmee' : 'annulee'}`} style={{ padding: '2px 8px', fontSize: '0.65rem', textTransform: 'none' }}>
                            {car.available ? 'Disponible' : 'Indisponible'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ss-admin-item-actions">
                      <button type="button" onClick={() => startEdit(car)}>Modifier</button>
                      <button type="button" className="danger" onClick={() => handleDelete(car.id)}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'reservations' && (
          <div className="ss-admin-section">
            <h3>Réservations ({reservations.length})</h3>
            {reservationsLoading && <p>Chargement...</p>}
            {!reservationsLoading && reservations.length === 0 && <p>Aucune réservation pour le moment.</p>}

            <form className="ss-admin-form" onSubmit={handleReservationSubmit}>
              <h4>Nouvelle réservation</h4>
              <div className="ss-admin-grid">
                <label>
                  Utilisateur
                  <select name="user_id" value={reservationForm.user_id} onChange={(e) => { setReservationForm({ ...reservationForm, user_id: e.target.value }); setReservationErrors({ ...reservationErrors, user_id: null }) }}>
                    <option value="">— sélectionner —</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                  {reservationErrors.user_id && <div className="ss-field-error">{reservationErrors.user_id}</div>}
                </label>
                <label>
                  Voiture
                  <select name="car_id" value={reservationForm.car_id} onChange={(e) => { setReservationForm({ ...reservationForm, car_id: e.target.value }); setReservationErrors({ ...reservationErrors, car_id: null }) }}>
                    <option value="">— sélectionner —</option>
                    {localCars.map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
                  </select>
                  {reservationErrors.car_id && <div className="ss-field-error">{reservationErrors.car_id}</div>}
                </label>
                <label>
                  Début
                  <input type="date" name="start_date" value={reservationForm.start_date} onChange={(e) => { setReservationForm({ ...reservationForm, start_date: e.target.value }); setReservationErrors({ ...reservationErrors, start_date: null }) }} />
                  {reservationErrors.start_date && <div className="ss-field-error">{reservationErrors.start_date}</div>}
                </label>
                <label>
                  Fin
                  <input type="date" name="end_date" value={reservationForm.end_date} onChange={(e) => { setReservationForm({ ...reservationForm, end_date: e.target.value }); setReservationErrors({ ...reservationErrors, end_date: null }) }} />
                  {reservationErrors.end_date && <div className="ss-field-error">{reservationErrors.end_date}</div>}
                </label>
                <label>
                  Statut
                  <select name="status" value={reservationForm.status} onChange={(e) => setReservationForm({ ...reservationForm, status: e.target.value })}>
                    <option value="en_attente">En attente</option>
                    <option value="confirmee">Confirmée</option>
                    <option value="annulee">Annulée</option>
                  </select>
                </label>
              </div>
                <div className="ss-admin-actions">
                  {editingReservationId ? (
                    <>
                      <button type="button" className="ss-ghost-btn" onClick={cancelEditReservation}>Annuler</button>
                      <button className="ss-search-btn" type="submit">Mettre à jour</button>
                    </>
                  ) : (
                    <button className="ss-search-btn" type="submit">Créer</button>
                  )}
                </div>
              {reservationErrors.date && <p className="ss-field-error">{reservationErrors.date}</p>}
              {reservationErrors.overlap && <p className="ss-field-error">{reservationErrors.overlap}</p>}
              {error && <p className="ss-error">{error}</p>}
              {message && <p className="ss-success">{message}</p>}
            </form>

            <div className="ss-admin-list">
              {reservations.map((reservation) => (
                <div className="ss-admin-item" key={reservation.id}>
                  <div>
                    <strong>{reservation.car_brand} {reservation.car_model}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                      <span>
                        {String(reservation.start_date).slice(0, 10)} → {String(reservation.end_date).slice(0, 10)}
                      </span>
                      <span className={`status-badge ${reservation.status}`}>
                        {reservation.status === 'en_attente' ? 'En attente' : reservation.status === 'confirmee' ? 'Confirmée' : 'Annulée'}
                      </span>
                      {reservation.total_price && (
                        <span style={{ fontWeight: 700, color: '#60a5fa' }}>
                          {formatPrice(reservation.total_price)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ss-admin-item-actions">
                    <select defaultValue={reservation.status} onChange={async (e) => {
                      const newStatus = e.target.value
                      try {
                        await updateReservation(reservation.id, { status: newStatus }, token)
                        setReservations((prev) => prev.map((r) => r.id === reservation.id ? { ...r, status: newStatus } : r))
                        pushToast({ type: 'success', text: 'Statut mis à jour.' })
                      } catch (err) {
                        if (!handleRequestError(err)) {
                          pushToast({ type: 'error', text: err.message })
                        }
                      }
                    }}>
                      <option value="en_attente">En attente</option>
                      <option value="confirmee">Confirmée</option>
                      <option value="annulee">Annulée</option>
                    </select>
                      <button type="button" onClick={() => startEditReservation(reservation)}>Modifier</button>
                      <button type="button" className="danger" onClick={async () => {
                      if (!window.confirm('Supprimer cette réservation ?')) return
                      try {
                        await deleteReservation(reservation.id, token)
                        setReservations((prev) => prev.filter((r) => r.id !== reservation.id))
                          pushToast({ type: 'success', text: 'Réservation supprimée.' })
                      } catch (err) {
                        if (!handleRequestError(err)) {
                          pushToast({ type: 'error', text: err.message })
                        }
                      }
                    }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="ss-admin-section">
            <h3>Utilisateurs ({users.length})</h3>
            {usersLoading && <p>Chargement...</p>}
            {!usersLoading && users.length === 0 && <p>Aucun utilisateur.</p>}

            <form className="ss-admin-form" onSubmit={handleUserSubmit}>
              <h4>{editingUserId ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h4>
              <div className="ss-admin-grid">
                <label>
                  Nom
                  <input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
                </label>
                <label>
                  Email
                  <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
                </label>
                <label>
                  Rôle
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="client">Client</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              </div>
              <div className="ss-admin-actions">
                {editingUserId && <button type="button" className="ss-ghost-btn" onClick={resetUserForm}>Annuler</button>}
                <button type="submit" className="ss-search-btn">{editingUserId ? 'Mettre à jour' : 'Créer'}</button>
              </div>
            </form>

            <div className="ss-admin-list">
              {users.map((u) => (
                <div className="ss-admin-item" key={u.id}>
                  <div>
                    <strong>{u.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span>{u.email}</span>
                      <span className="status-badge" style={{
                        background: u.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: u.role === 'admin' ? '#a78bfa' : '#60a5fa',
                        border: u.role === 'admin' ? '1px solid rgba(139, 92, 246, 0.2)' : '1px solid rgba(59, 130, 246, 0.2)',
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        textTransform: 'none'
                      }}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <div className="ss-admin-item-actions">
                    <button type="button" onClick={() => { setEditingUserId(u.id); setUserForm({ name: u.name, email: u.email, role: u.role }) }}>Modifier</button>
                    <button type="button" className="danger" onClick={async () => {
                      if (!window.confirm('Supprimer cet utilisateur ?')) return
                      try {
                        await deleteUser(u.id, token)
                        setUsers((prev) => prev.filter((x) => x.id !== u.id))
                        if (editingUserId === u.id) resetUserForm()
                        pushToast({ type: 'success', text: 'Utilisateur supprimé.' })
                      } catch (err) {
                        if (!handleRequestError(err)) {
                          pushToast({ type: 'error', text: err.message })
                        }
                      }
                    }}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
          </main>
        </div>
      </div>
    </div>
  )
}
