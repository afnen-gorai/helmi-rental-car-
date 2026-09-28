import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createReservation,
  getAvailableCars,
  getCars,
  getMyReservations,
  isAuthError,
  login,
  register,
} from '../src/api'
import AdminPanel from '../src/AdminPanel'
import MapView from '../src/MapView'

const initialAuthForm = { name: '', email: '', password: '' }
const initialReservationForm = { car_id: '', start_date: '', end_date: '' }

const CATEGORIES = ['Familiale', 'Mini', 'Compacte', 'Intermédiaire', 'Économique', 'Premium']
const SUBTYPES = ['4-5 portes', '4-5 portes', '4-5 portes', '4-5 portes', 'Voiture de sport', 'SUV']
const PASSENGERS = [5, 5, 5, 5, 4, 5]
const LUGGAGE = [4, 2, 3, 4, 2, 3]

const MONTHLY_PRICES = [
  { month: 'juin', price: 52 },
  { month: 'juil.', price: 85 },
  { month: 'août', price: 70 },
  { month: 'sept', price: 53 },
  { month: 'oct.', price: 52 },
  { month: 'nov.', price: null },
]

const MAP_LOCATIONS = [
  { lat: 36.8065, lng: 10.1815, label: 'Tunis centre' },
  { lat: 36.7989, lng: 10.1715, label: 'Bab Bhar' },
  { lat: 36.836, lng: 10.241, label: 'Le Lac' },
  { lat: 36.8181, lng: 10.305, label: 'La Goulette' },
  { lat: 36.8528, lng: 10.3236, label: 'Carthage' },
  { lat: 36.8625, lng: 10.1956, label: 'Ariana' },
]

const NAV_SECTIONS = [
  { id: 'offres', label: (min) => `Offres de location de voiture à partir de ${min} €` },
  { id: 'carte', label: () => 'Tunis : carte' },
  { id: 'faq', label: () => 'Questions fréquentes' },
]

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0 €'
  return `${Math.round(Number(value))} €`
}

function getLocalDateOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function calculateEstimatedTotal(pricePerDay, startDate, endDate) {
  if (!pricePerDay || !startDate || !endDate) return null
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null
  const days = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  return Math.round(days * Number(pricePerDay) * 100) / 100
}

function getCarLabel(car) {
  return car.name || car.model || 'Voiture'
}

function getReservationLabel(reservation) {
  return `${reservation.car_brand || 'Voiture'} ${reservation.car_model || ''}`.trim()
}

function normalizeDateOnly(value) {
  return typeof value === 'string' ? value.slice(0, 10) : value
}

function getProviderClass(brand) {
  const key = (brand || '').toLowerCase()
  if (key.includes('camel')) return 'provider-camelcar'
  if (key.includes('one')) return 'provider-one'
  if (key.includes('budget')) return 'provider-budget'
  if (key.includes('ok') || key.includes('mobility')) return 'provider-okmobility'
  return 'provider-default'
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function getAuthErrorMessage(message) {
  const messages = {
    'Wrong password': 'Mot de passe incorrect.',
    'User not found': 'Aucun compte ne correspond a cet email.',
    'Email and password are required': 'Email et mot de passe obligatoires.',
    'Name, email and password are required': 'Nom, email et mot de passe obligatoires.',
    'Email already exists': 'Cet email est deja utilise.',
  }

  return messages[message] || message || 'Une erreur est survenue.'
}

function App() {
  const [mode, setMode] = useState('login')
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [activeNav, setActiveNav] = useState('offres')
  const [showMorePrices, setShowMorePrices] = useState(false)

  const [token, setToken] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const urlToken = params.get('token')
      if (urlToken) {
        localStorage.setItem('car-rental-token', urlToken)
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname)
        return urlToken
      }
    } catch (e) {
      // ignore
    }
    return localStorage.getItem('car-rental-token') || ''
  })
  const [user, setUser] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const urlUser = params.get('user')
      if (urlUser) {
        const parsedUser = JSON.parse(decodeURIComponent(urlUser))
        localStorage.setItem('car-rental-user', JSON.stringify(parsedUser))
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname)
        return parsedUser
      }
    } catch (e) {
      // ignore in non-browser env
    }
    const raw = localStorage.getItem('car-rental-user')
    return raw ? JSON.parse(raw) : null
  })

  const [cars, setCars] = useState([])
  const [availableCars, setAvailableCars] = useState([])
  const [carsError, setCarsError] = useState('')
  const [searchForm, setSearchForm] = useState({
    location: 'Tunis',
    start_date: getLocalDateOffset(2),
    end_date: getLocalDateOffset(4),
    pickup_time: '10:00',
    return_time: '10:00',
    driver_age: true,
    different_return: false,
  })
  const [searchError, setSearchError] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  const [reservationForm, setReservationForm] = useState(initialReservationForm)
  const [reservationMessage, setReservationMessage] = useState('')
  const [reservationError, setReservationError] = useState('')
  const [reservationLoading, setReservationLoading] = useState(false)

  const [dashboardReservations, setDashboardReservations] = useState([])
  const [dashboardError, setDashboardError] = useState('')
  const [dashboardLoading, setDashboardLoading] = useState(false)

  const stickyNavRef = useRef(null)

  const activeCars = availableCars.length > 0 ? availableCars : cars

  const minPrice = useMemo(() => {
    if (activeCars.length === 0) return 27
    return Math.min(...activeCars.map((c) => Number(c.price_per_day) || 0))
  }, [activeCars])

  const mapMarkers = useMemo(() => {
    if (activeCars.length === 0) return []

    return MAP_LOCATIONS.map((location, index) => {
      const car = activeCars[index % activeCars.length]
      const price = Math.round(Number(car.price_per_day) || 0)
      return {
        ...location,
        price,
        priceLabel: formatPrice(price),
        carId: car.id,
      }
    })
  }, [activeCars])

  const selectedCar = useMemo(() => {
    return activeCars.find((car) => String(car.id) === String(reservationForm.car_id)) || null
  }, [activeCars, reservationForm.car_id])

  const estimatedTotal = selectedCar
    ? calculateEstimatedTotal(selectedCar.price_per_day, reservationForm.start_date, reservationForm.end_date)
    : null

  const maxMonthlyPrice = Math.max(...MONTHLY_PRICES.filter((m) => m.price).map((m) => m.price))
  const isAdmin = user?.role === 'admin'

  async function reloadCars() {
    setCarsError('')
    const data = await getCars(token)
    setCars(data)
    return data
  }

  function handleSessionExpired() {
    setToken('')
    setUser(null)
    setDashboardReservations([])
    setReservationMessage('')
    setReservationError('')
    setDashboardError('')
    setAuthError('Votre session a expire. Connectez-vous a nouveau.')
    setMode('login')
    setShowAuthModal(true)
  }

  useEffect(() => {
    if (token) {
      localStorage.setItem('car-rental-token', token)
    } else {
      localStorage.removeItem('car-rental-token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('car-rental-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('car-rental-user')
    }
  }, [user])

  useEffect(() => {
    reloadCars().catch((error) => {
      if (isAuthError(error)) {
        handleSessionExpired()
        return
      }
      setCarsError(error.message)
    })
  }, [])

  useEffect(() => {
    async function loadDashboard() {
      if (!token) {
        setDashboardReservations([])
        return
      }
      setDashboardLoading(true)
      setDashboardError('')
      try {
        const data = await getMyReservations(token)
        setDashboardReservations(data)
      } catch (error) {
        if (isAuthError(error)) {
          handleSessionExpired()
          return
        }
        setDashboardError(error.message)
      } finally {
        setDashboardLoading(false)
      }
    }
    loadDashboard()
  }, [token])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveNav(entry.target.id)
          }
        })
      },
      { rootMargin: '-120px 0px -60% 0px', threshold: 0.1 },
    )

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const payload = mode === 'register'
        ? authForm
        : { email: authForm.email, password: authForm.password }
      const data = mode === 'register' ? await register(payload) : await login(payload)
      setToken(data.token)
      setUser(data.user)
      setAuthForm(initialAuthForm)
      setMode('login')
      setShowAuthModal(false)
    } catch (error) {
      setAuthError(getAuthErrorMessage(error.message))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleSearchAvailability(event) {
    event.preventDefault()
    setSearchLoading(true)
    setSearchError('')
    try {
      const data = await getAvailableCars(searchForm.start_date, searchForm.end_date)
      setAvailableCars(data)
      if (data.length > 0) {
        setReservationForm({
          car_id: String(data[0].id),
          start_date: searchForm.start_date,
          end_date: searchForm.end_date,
        })
      }
      scrollToSection('offres')
    } catch (error) {
      setSearchError(error.message)
      setAvailableCars([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleReservationSubmit(event) {
    event.preventDefault()
    if (!token) {
      setShowReservationModal(false)
      setShowAuthModal(true)
      return
    }
    setReservationLoading(true)
    setReservationError('')
    setReservationMessage('')
    try {
      const data = await createReservation(
        {
          car_id: Number(reservationForm.car_id),
          start_date: reservationForm.start_date,
          end_date: reservationForm.end_date,
        },
        token,
      )
      setReservationMessage(`Réservation confirmée. Total : ${formatPrice(data.total_price)}`)
      const reservations = await getMyReservations(token)
      setDashboardReservations(reservations)
    } catch (error) {
      if (isAuthError(error)) {
        handleSessionExpired()
        return
      }
      setReservationError(error.message)
    } finally {
      setReservationLoading(false)
    }
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    setDashboardReservations([])
    setReservationMessage('')
    setReservationError('')
  }

  function openReservation(car) {
    setReservationForm({
      car_id: String(car.id),
      start_date: searchForm.start_date,
      end_date: searchForm.end_date,
    })
    setReservationMessage('')
    setReservationError('')
    setShowReservationModal(true)
  }

  // If the logged in user is an admin, render only the admin dashboard full-screen.
  if (isAdmin) {
    return (
      <div className="ss-app ss-app--admin">
        <AdminPanel
          token={token}
          cars={cars}
          onSessionExpired={handleSessionExpired}
          onRefresh={async () => {
            await reloadCars()
            setAvailableCars([])
          }}
          inline
        />
      </div>
    )
  }

  return (
    <div className="ss-app">
      <header className="ss-header">
        <div className="ss-header-bar">
          <div className="ss-header-left">
            <div className="ss-logo">
              <img src="/halouma-logo.png" alt="Halouma Travel" className="ss-logo-img" />
            </div>
            <nav className="ss-main-nav">
              <button type="button" className="ss-nav-tab active">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>
                Voitures
              </button>
            </nav>
          </div>
          <div className="ss-header-utils">
            <button
              type="button"
              className="ss-login-btn"
              onClick={() => setShowAuthModal(true)}
            >
              {user ? user.name || user.email : 'Se connecter'}
            </button>
          </div>
        </div>
      </header>

      <section className="ss-hero">
        <div className="ss-hero-overlay" />
        <div className="ss-hero-content">
          <h1 className="ss-hero-title">Tunis, Tunisie : location de voiture</h1>

          <div className="ss-search-widget">
            <div className="ss-search-tabs">
              <button type="button" className="ss-search-tab active">Louer une voiture</button>
              <button type="button" className="ss-search-tab">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 5.6L10 2 12.5 5.6h-5zM12.5 18.4L10 22l-2.5-3.6h5zM5.6 7.5L2 10l3.6 2.5V7.5zM18.4 12.5L22 10l-3.6-2.5v5zM7.5 16.5L10 20l2.5-3.5h-5zM16.5 7.5V12.5L20 10l-3.5-2.5z" /></svg>
                Organiser un road trip
              </button>
            </div>

            <form className="ss-search-form" onSubmit={handleSearchAvailability}>
              <div className="ss-search-fields">
                <label className="ss-field">
                  <span className="ss-field-label">Lieu de prise en charge</span>
                  <input
                    type="text"
                    value={searchForm.location}
                    onChange={(e) => setSearchForm({ ...searchForm, location: e.target.value })}
                  />
                </label>
                <label className="ss-field">
                  <span className="ss-field-label">Date de prise en charge</span>
                  <input
                    type="date"
                    value={searchForm.start_date}
                    onChange={(e) => setSearchForm({ ...searchForm, start_date: e.target.value })}
                  />
                </label>
                <label className="ss-field ss-field-sm">
                  <span className="ss-field-label">Heure</span>
                  <input
                    type="time"
                    value={searchForm.pickup_time}
                    onChange={(e) => setSearchForm({ ...searchForm, pickup_time: e.target.value })}
                  />
                </label>
                <label className="ss-field">
                  <span className="ss-field-label">Date de retour</span>
                  <input
                    type="date"
                    value={searchForm.end_date}
                    onChange={(e) => setSearchForm({ ...searchForm, end_date: e.target.value })}
                  />
                </label>
                <label className="ss-field ss-field-sm">
                  <span className="ss-field-label">Heure</span>
                  <input
                    type="time"
                    value={searchForm.return_time}
                    onChange={(e) => setSearchForm({ ...searchForm, return_time: e.target.value })}
                  />
                </label>
                <button className="ss-search-btn" type="submit" disabled={searchLoading}>
                  {searchLoading ? 'Recherche...' : 'Rechercher'}
                </button>
              </div>

              <div className="ss-search-options">
                <label className="ss-checkbox">
                  <input
                    type="checkbox"
                    checked={searchForm.driver_age}
                    onChange={(e) => setSearchForm({ ...searchForm, driver_age: e.target.checked })}
                  />
                  <span className="ss-checkmark" />
                  Conducteur âgé entre 25 et 70 ans
                </label>
                <label className="ss-checkbox">
                  <input
                    type="checkbox"
                    checked={searchForm.different_return}
                    onChange={(e) => setSearchForm({ ...searchForm, different_return: e.target.checked })}
                  />
                  <span className="ss-checkmark" />
                  Retour véhicule dans une autre agence
                </label>
              </div>
              {searchError && <p className="ss-error">{searchError}</p>}
            </form>
          </div>
        </div>
      </section>

      {!isAdmin && (
        <div className="ss-container">
          <nav className="ss-breadcrumbs">
            <a href="#/">Accueil</a>
            <span>&gt;</span>
            <a href="#/">Location de voiture</a>
            <span>&gt;</span>
            <a href="#/">Tunisie</a>
            <span>&gt;</span>
            <span>Tunis</span>
          </nav>

        <div className="ss-feature-cards">
          <article className="ss-feature-card">
            <div className="ss-feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" /></svg>
            </div>
            <h3>Comparez les locations de voiture proposées par des prestataires de confiance</h3>
            <p>Comparez les offres de location de voiture de plus de 1 700 agences dans le monde entier.</p>
          </article>
          <article className="ss-feature-card">
            <div className="ss-feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
            </div>
            <h3>Tunis : faites de belles économies sur la location de voiture</h3>
            <p>Que vous partiez en vacances ou en voyage d&apos;affaires, trouvez la voiture idéale.</p>
          </article>
          <article className="ss-feature-card">
            <div className="ss-feature-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" /></svg>
            </div>
            <h3>Tunis : recherchez une location de voiture à proximité</h3>
            <p>Comparez les offres de location de voiture à l&apos;aéroport ou en centre-ville.</p>
          </article>
        </div>
      </div>
      )}

      <nav className="ss-sticky-nav" ref={stickyNavRef}>
        <div className="ss-sticky-nav-inner">
          <div className="ss-sticky-links">
            {NAV_SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={activeNav === id ? 'active' : ''}
                onClick={() => scrollToSection(id)}
              >
                {label(minPrice)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ss-reserve-btn"
            onClick={() => {
              if (activeCars[0]) openReservation(activeCars[0])
              else scrollToSection('offres')
            }}
          >
            Réserver
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5H7z" /></svg>
          </button>
        </div>
      </nav>

      <div className="ss-container">
        <section id="offres" className="ss-section">
          <h2 className="ss-section-title">Tunis : trouvez une location de voiture pas chère</h2>

          {carsError && <p className="ss-error">{carsError}</p>}

          <div className="ss-car-grid">
            {activeCars.map((car, index) => (
              <article className="ss-car-card" key={car.id} onClick={() => openReservation(car)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openReservation(car)}>
                <div className="ss-car-image">
                  {car.image_url
                    ? <img src={car.image_url} alt={`${car.brand} ${getCarLabel(car)}`} />
                    : <div className="ss-car-placeholder" />}
                  <div className={`ss-provider-logo ${getProviderClass(car.brand)}`}>
                    {car.provider || car.brand}
                  </div>
                </div>
                <div className="ss-car-info">
                  <div className="ss-car-details">
                    <h3>{car.brand} {getCarLabel(car)}</h3>
                    <p className="ss-car-subtype">{CATEGORIES[index % CATEGORIES.length]} • {SUBTYPES[index % SUBTYPES.length]}</p>
                    <div className="ss-car-specs">
                      <span className="ss-spec-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                        {PASSENGERS[index % PASSENGERS.length]}
                      </span>
                      <span className="ss-spec-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 6h-2V4c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v2H3c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM7 4h6v2H7V4zm10 15H3V8h14v11z" /></svg>
                        {LUGGAGE[index % LUGGAGE.length]}
                      </span>
                    </div>
                  </div>
                  <div className="ss-car-price">
                    <span className="ss-price-from">À partir de</span>
                    <span className="ss-price-value">{formatPrice(car.price_per_day)}</span>
                    <span className="ss-price-period">par jour</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="ss-info-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
          <p>Les prix pour la location de voiture dans cette ville (Tunis) sont les plus bas trouvés au cours des 30 prochains jours et sont sujets à modification.</p>
        </div>

        <section id="prix" className="ss-section ss-price-section">
          <h2 className="ss-section-title">Tunis : quelle est la période la moins chère pour louer une voiture dans cette ville ?</h2>

          <div className="ss-price-layout">
            <div className="ss-price-chart">
              {MONTHLY_PRICES.map((item) => (
                <div className="ss-chart-row" key={item.month}>
                  <span className="ss-chart-month">{item.month}</span>
                  {item.price ? (
                    <div className="ss-chart-bar-track">
                      <div
                        className="ss-chart-bar"
                        style={{ width: `${(item.price / maxMonthlyPrice) * 100}%` }}
                      >
                        <button type="button" className="ss-chart-pill">
                          {item.price} € par jour &gt;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="ss-chart-find">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" /></svg>
                      Trouver des prix
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="ss-show-more"
                onClick={() => setShowMorePrices(!showMorePrices)}
              >
                Afficher plus
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={showMorePrices ? 'M7 14l5-5 5 5H7z' : 'M7 10l5 5 5-5H7z'} /></svg>
              </button>
            </div>

            <div className="ss-price-summary">
              <p>
                Nos données indiquent que le mois le moins cher pour louer une voiture dans cette ville (Tunis) est <strong>janvier</strong>. Le prix est d&apos;environ <strong>32 €</strong> par jour en janvier, contre une moyenne annuelle de <strong>51 €</strong> par jour.
              </p>
              <div className="ss-price-stats">
                <div className="ss-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" /></svg>
                  <div>
                    <span>Mois le moins cher (moyenne)</span>
                    <strong>janvier • 32 €</strong>
                  </div>
                </div>
                <div className="ss-stat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" /></svg>
                  <div>
                    <span>Prix moyen annuel</span>
                    <strong>51 €</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="carte" className="ss-section">
          <h2 className="ss-section-title">Tunis : sélectionnez votre lieu de prise en charge</h2>
          <p className="ss-section-desc">
            Il y a 24 prestataires de location de voiture dans cette ville : Tunis. Consultez la carte ci-dessous pour trouver le lieu de prise en charge le plus pratique.
          </p>

          <MapView
            markers={mapMarkers}
            onMarkerClick={(carId) => {
              const car = activeCars.find((c) => String(c.id) === String(carId))
              if (car) openReservation(car)
            }}
          />
        </section>

        <section id="faq" className="ss-section ss-faq">
          <h2 className="ss-section-title">Questions fréquentes</h2>
          <details className="ss-faq-item" open>
            <summary>Quel est le prix moyen d&apos;une location de voiture à Tunis ?</summary>
            <p>Le prix moyen d&apos;une location de voiture à Tunis est d&apos;environ 51 € par jour, avec des offres à partir de {minPrice} €.</p>
          </details>
          <details className="ss-faq-item">
            <summary>Quels documents faut-il pour louer une voiture à Tunis ?</summary>
            <p>Vous aurez besoin d&apos;un permis de conduire valide, d&apos;une pièce d&apos;identité et d&apos;une carte de crédit au nom du conducteur principal.</p>
          </details>
          <details className="ss-faq-item">
            <summary>Puis-je louer une voiture à l&apos;aéroport de Tunis-Carthage ?</summary>
            <p>Oui, de nombreux prestataires proposent la prise en charge directement à l&apos;aéroport de Tunis-Carthage.</p>
          </details>
        </section>
      </div>

      {isAdmin && (
        <div className="ss-container">
          <AdminPanel
            token={token}
            cars={cars}
            onSessionExpired={handleSessionExpired}
            onRefresh={async () => {
              await reloadCars()
              setAvailableCars([])
            }}
            inline
          />
        </div>
      )}

      <footer className="ss-footer">
        <div className="ss-footer-inner">
          <div className="ss-footer-brand">
            <img src="/halouma-logo.png" alt="Halouma Travel" className="ss-footer-logo" />
            <p className="ss-footer-tagline">Louez. Roulez. Profitez.</p>
            <p className="ss-footer-desc">
              Halouma Travel vous accompagne pour trouver la meilleure location de voiture à Tunis et partout en Tunisie.
            </p>
          </div>

          <div className="ss-footer-links">
            <div className="ss-footer-col">
              <h3>Location</h3>
              <button type="button" onClick={() => scrollToSection('offres')}>Nos offres</button>
              <button type="button" onClick={() => scrollToSection('carte')}>Lieux de prise en charge</button>
            </div>
            <div className="ss-footer-col">
              <h3>Destinations</h3>
              <span>Tunis</span>
              <span>Sfax</span>
              <span>Sousse</span>
              <span>Djerba</span>
            </div>
            <div className="ss-footer-col">
              <h3>Aide</h3>
              <button type="button" onClick={() => scrollToSection('faq')}>Questions fréquentes</button>
              <button type="button" onClick={() => setShowAuthModal(true)}>Mon compte</button>
              <span>Conditions générales</span>
              <span>Politique de confidentialité</span>
            </div>
            <div className="ss-footer-col">
              <h3>Contact</h3>
              <a href="mailto:contact@haloumatravel.tn">contact@haloumatravel.tn</a>
              <a href="tel:+21670123456">+216 70 123 456</a>
              <span>Avenue Habib Bourguiba, Tunis</span>
              <span>Lun – Sam : 8h – 20h</span>
            </div>
          </div>
        </div>

        <div className="ss-footer-bottom">
          <p>&copy; {new Date().getFullYear()} Halouma Travel. Tous droits réservés.</p>
        </div>
      </footer>

      {showAuthModal && (
        <div className="ss-modal-overlay" onClick={() => setShowAuthModal(false)} role="presentation">
          <div className="ss-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Connexion">
            <button type="button" className="ss-modal-close" onClick={() => setShowAuthModal(false)}>×</button>
            <h2>{mode === 'login' ? 'Se connecter' : 'Créer un compte'}</h2>
            <div className="ss-toggle-group">
              <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Connexion</button>
              <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Inscription</button>
            </div>
            <form className="ss-modal-form" onSubmit={handleAuthSubmit}>
              {mode === 'register' && (
                <label>
                  Nom
                  <input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} placeholder="Amina Benali" />
                </label>
              )}
              <label>
                Email
                <input type="email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} placeholder="vous@exemple.com" />
              </label>
              <label>
                Mot de passe
                <input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} placeholder="••••••••" />
              </label>
              {authError && <p className="ss-error">{authError}</p>}
              <button type="submit" className="ss-search-btn" disabled={authLoading}>
                {authLoading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              </button>
            </form>

            <div className="ss-social-login">
              <div className="ss-social-divider">
                <span>ou continuer avec</span>
              </div>
              <div className="ss-social-buttons">
                <button type="button" className="ss-social-btn ss-google-btn" onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04-2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
                <button type="button" className="ss-social-btn ss-facebook-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook (bientôt)
                </button>
              </div>
            </div>
            {user && (
              <div className="ss-user-bar">
                <span>Connecté : <strong>{user.name || user.email}</strong></span>
                <button type="button" onClick={handleLogout}>Déconnexion</button>
              </div>
            )}
            {token && dashboardReservations.length > 0 && (
              <div className="ss-reservations-preview">
                <h3>Mes réservations ({dashboardReservations.length})</h3>
                {dashboardLoading && <p>Chargement...</p>}
                {dashboardError && <p className="ss-error">{dashboardError}</p>}
                {dashboardReservations.slice(0, 3).map((r) => (
                  <div key={r.id} className="ss-reservation-item">
                    <strong>{getReservationLabel(r)}</strong>
                    <span>{normalizeDateOnly(r.start_date)} → {normalizeDateOnly(r.end_date)}</span>
                    <span>{formatPrice(r.total_price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showReservationModal && (
        <div className="ss-modal-overlay" onClick={() => setShowReservationModal(false)} role="presentation">
          <div className="ss-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Réservation">
            <button type="button" className="ss-modal-close" onClick={() => setShowReservationModal(false)}>×</button>
            <h2>Réserver une voiture</h2>
            <form className="ss-modal-form" onSubmit={handleReservationSubmit}>
              <label>
                Voiture
                <select
                  value={reservationForm.car_id}
                  onChange={(e) => setReservationForm({ ...reservationForm, car_id: e.target.value })}
                >
                  <option value="">Sélectionner</option>
                  {activeCars.map((car) => (
                    <option key={car.id} value={car.id}>
                      {car.brand} {getCarLabel(car)} — {formatPrice(car.price_per_day)}/jour
                    </option>
                  ))}
                </select>
              </label>
              <div className="ss-form-row">
                <label>
                  Date de début
                  <input type="date" value={reservationForm.start_date} onChange={(e) => setReservationForm({ ...reservationForm, start_date: e.target.value })} />
                </label>
                <label>
                  Date de fin
                  <input type="date" value={reservationForm.end_date} onChange={(e) => setReservationForm({ ...reservationForm, end_date: e.target.value })} />
                </label>
              </div>
              <div className="ss-summary">
                <div><span>Voiture</span><strong>{selectedCar ? `${selectedCar.brand} ${getCarLabel(selectedCar)}` : '—'}</strong></div>
                <div><span>Total estimé</span><strong>{estimatedTotal === null ? '—' : formatPrice(estimatedTotal)}</strong></div>
              </div>
              {reservationMessage && <p className="ss-success">{reservationMessage}</p>}
              {reservationError && <p className="ss-error">{reservationError}</p>}
              <button type="submit" className="ss-search-btn" disabled={reservationLoading}>
                {reservationLoading ? 'Réservation...' : 'Confirmer la réservation'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
