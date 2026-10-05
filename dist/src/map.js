import { ABIDJAN_CENTER, clamp, vendorStatus } from './utils.js';

let activeMap = null;
let activeFallbackCleanup = null;

const CITY_BOUNDS = {
  minLat: 5.27,
  maxLat: 5.43,
  minLng: -4.16,
  maxLng: -3.92
};

function waitForLeaflet(timeout = 1600) {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.L || Date.now() - started > timeout) {
        clearInterval(timer);
        resolve(window.L || null);
      }
    }, 80);
  });
}

export function destroyMap() {
  if (activeMap) {
    try {
      activeMap.remove();
    } catch {
      // La vue a peut-être déjà remplacé le conteneur.
    }
    activeMap = null;
  }
  if (activeFallbackCleanup) {
    activeFallbackCleanup();
    activeFallbackCleanup = null;
  }
}

function markerHtml(vendor, selected = false) {
  const status = vendorStatus(vendor);
  return `
    <button class="map-pin map-pin--${status.key}${selected ? ' is-selected' : ''}" aria-label="${vendor.title}">
      <span class="map-pin__flame">🔥</span>
      <span class="map-pin__banana">🍌</span>
    </button>`;
}

function positionHtml() {
  return `<span class="draft-pin"><span>🔥</span></span>`;
}

function fallbackPosition(lat, lng) {
  const x = ((lng - CITY_BOUNDS.minLng) / (CITY_BOUNDS.maxLng - CITY_BOUNDS.minLng)) * 100;
  const y = (1 - (lat - CITY_BOUNDS.minLat) / (CITY_BOUNDS.maxLat - CITY_BOUNDS.minLat)) * 100;
  return { x: clamp(x, 4, 96), y: clamp(y, 5, 95) };
}

function fallbackCoordinates(event, container) {
  const rect = container.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  return {
    lat: CITY_BOUNDS.minLat + (1 - y) * (CITY_BOUNDS.maxLat - CITY_BOUNDS.minLat),
    lng: CITY_BOUNDS.minLng + x * (CITY_BOUNDS.maxLng - CITY_BOUNDS.minLng)
  };
}

function mountFallback(container, vendors, options) {
  container.innerHTML = `
    <div class="fallback-map" role="application" aria-label="Carte simplifiée d'Abidjan">
      <div class="fallback-map__water fallback-map__water--one"></div>
      <div class="fallback-map__water fallback-map__water--two"></div>
      <span class="fallback-map__label" style="left:43%;top:43%">ABIDJAN</span>
      <span class="fallback-map__label" style="left:24%;top:31%">YOPOUGON</span>
      <span class="fallback-map__label" style="left:56%;top:22%">COCODY</span>
      <span class="fallback-map__label" style="left:47%;top:60%">TREICHVILLE</span>
      <span class="fallback-map__label" style="left:66%;top:67%">MARCORY</span>
      <div class="fallback-map__markers"></div>
      ${options.selectable ? '<div class="fallback-map__hint">Touchez la carte pour placer le point</div>' : ''}
    </div>`;

  const mapElement = container.querySelector('.fallback-map');
  const markerLayer = container.querySelector('.fallback-map__markers');

  const renderMarkers = () => {
    markerLayer.innerHTML = '';
    for (const vendor of vendors) {
      const pos = fallbackPosition(vendor.lat, vendor.lng);
      const wrapper = document.createElement('div');
      wrapper.className = 'fallback-marker';
      wrapper.style.left = `${pos.x}%`;
      wrapper.style.top = `${pos.y}%`;
      wrapper.innerHTML = markerHtml(vendor, vendor.id === options.selectedVendorId);
      wrapper.querySelector('button')?.addEventListener('click', (event) => {
        event.stopPropagation();
        options.onSelect?.(vendor.id);
      });
      markerLayer.appendChild(wrapper);
    }

    if (options.selectedPosition) {
      const pos = fallbackPosition(options.selectedPosition.lat, options.selectedPosition.lng);
      const wrapper = document.createElement('div');
      wrapper.className = 'fallback-marker fallback-marker--draft';
      wrapper.style.left = `${pos.x}%`;
      wrapper.style.top = `${pos.y}%`;
      wrapper.innerHTML = positionHtml();
      markerLayer.appendChild(wrapper);
    }
  };

  renderMarkers();

  const clickHandler = (event) => {
    if (!options.selectable || event.target.closest('.fallback-marker')) return;
    const coordinates = fallbackCoordinates(event, mapElement);
    options.selectedPosition = coordinates;
    options.onPositionChange?.(coordinates);
    renderMarkers();
  };
  mapElement.addEventListener('click', clickHandler);
  activeFallbackCleanup = () => mapElement.removeEventListener('click', clickHandler);

  return {
    locate() {
      return locateBrowser(options.onPositionChange);
    },
    setPosition(position) {
      options.selectedPosition = position;
      renderMarkers();
    }
  };
}

function locateBrowser(onPositionChange) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La géolocalisation n’est pas disponible sur cet appareil.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        onPositionChange?.(position);
        resolve(position);
      },
      () => reject(new Error('Position non disponible. Vérifie l’autorisation de localisation.')),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60_000 }
    );
  });
}

export async function mountVendorMap(container, vendors, options = {}) {
  if (!container) return null;
  destroyMap();

  const config = {
    center: options.center || ABIDJAN_CENTER,
    zoom: options.zoom || 12,
    selectedVendorId: options.selectedVendorId || null,
    selectedPosition: options.selectedPosition || null,
    selectable: Boolean(options.selectable),
    onSelect: options.onSelect,
    onPositionChange: options.onPositionChange
  };

  const L = await waitForLeaflet();
  if (!document.body.contains(container)) return null;
  if (!L) {
    return mountFallback(container, vendors, config);
  }

  const map = L.map(container, {
    zoomControl: false,
    attributionControl: true,
    tap: true
  }).setView(config.center, config.zoom);
  activeMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  for (const vendor of vendors) {
    const icon = L.divIcon({
      className: 'leaflet-blibli-marker',
      html: markerHtml(vendor, vendor.id === config.selectedVendorId),
      iconSize: [48, 58],
      iconAnchor: [24, 54]
    });
    const marker = L.marker([vendor.lat, vendor.lng], { icon }).addTo(map);
    marker.on('click', () => config.onSelect?.(vendor.id));
  }

  let draftMarker = null;
  const setPosition = (position, { center = true } = {}) => {
    config.selectedPosition = position;
    if (draftMarker) draftMarker.remove();
    const icon = L.divIcon({
      className: 'leaflet-blibli-marker',
      html: positionHtml(),
      iconSize: [50, 60],
      iconAnchor: [25, 55]
    });
    draftMarker = L.marker([position.lat, position.lng], { icon }).addTo(map);
    if (center) map.panTo([position.lat, position.lng]);
  };

  if (config.selectedPosition) setPosition(config.selectedPosition, { center: false });

  if (config.selectable) {
    map.on('click', ({ latlng }) => {
      const position = { lat: latlng.lat, lng: latlng.lng };
      setPosition(position, { center: false });
      config.onPositionChange?.(position);
    });
  }

  setTimeout(() => map.invalidateSize(), 120);

  return {
    map,
    setPosition,
    locate() {
      return locateBrowser((position) => {
        setPosition(position);
        config.onPositionChange?.(position);
      });
    },
    centerOn(position, zoom = 15) {
      map.setView([position.lat, position.lng], zoom);
    }
  };
}
