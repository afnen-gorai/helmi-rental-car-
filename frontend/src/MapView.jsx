import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TUNIS_CENTER = [36.82, 10.2]
const DEFAULT_ZOOM = 12

function createPriceIcon(priceLabel) {
  return L.divIcon({
    className: 'ss-leaflet-marker-container',
    html: `<span class="ss-leaflet-marker">${priceLabel}</span>`,
    iconSize: [1, 1],
    iconAnchor: [0, 0],
  })
}

function ExploreControl() {
  const map = useMap()

  useEffect(() => {
    const control = new L.Control({ position: 'bottomright' })

    control.onAdd = () => {
      const wrapper = L.DomUtil.create('div', 'ss-map-explore-wrap')
      const button = L.DomUtil.create('button', 'ss-map-explore', wrapper)
      button.type = 'button'
      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z" />
        </svg>
        Explorer sur la carte
      `
      L.DomEvent.disableClickPropagation(wrapper)
      button.addEventListener('click', () => map.setView(TUNIS_CENTER, DEFAULT_ZOOM))
      return wrapper
    }

    control.addTo(map)
    return () => control.remove()
  }, [map])

  return null
}

export default function MapView({ markers, onMarkerClick }) {
  const markerIcons = useMemo(() => {
    return markers.reduce((acc, marker) => {
      acc[marker.carId] = createPriceIcon(marker.priceLabel)
      return acc
    }, {})
  }, [markers])

  return (
    <div className="ss-map-container">
      <MapContainer
        center={TUNIS_CENTER}
        zoom={DEFAULT_ZOOM}
        className="ss-map-leaflet"
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />

        {markers.map((marker) => (
          <Marker
            key={marker.carId}
            position={[marker.lat, marker.lng]}
            icon={markerIcons[marker.carId]}
            eventHandlers={{
              click: () => onMarkerClick?.(marker.carId),
            }}
          />
        ))}

        <ExploreControl />
      </MapContainer>
    </div>
  )
}
