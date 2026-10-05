export const ABIDJAN_CENTER = [5.3364, -4.0267];

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function uid(prefix = 'id') {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function seedDate(item) {
  if (item.lastSeenAt) return item.lastSeenAt;
  const hours = Number(item.lastSeenHoursAgo || 0) + Number(item.lastSeenDaysAgo || 0) * 24;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function relativeTime(dateValue) {
  if (!dateValue) return 'date inconnue';
  const date = new Date(dateValue);
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 45) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

export function vendorStatus(vendor) {
  const ageHours = (Date.now() - new Date(vendor.lastSeenAt).getTime()) / 3_600_000;
  if (ageHours <= 6) {
    return {
      key: 'recent',
      label: 'Présente récemment',
      detail: `Vue ${relativeTime(vendor.lastSeenAt)}`,
      color: 'green'
    };
  }
  if (ageHours <= 24 * 14) {
    return {
      key: 'confirm',
      label: 'Présence à confirmer',
      detail: `Dernière observation ${relativeTime(vendor.lastSeenAt)}`,
      color: 'orange'
    };
  }
  return {
    key: 'dormant',
    label: 'Emplacement ancien',
    detail: `Dernière observation ${relativeTime(vendor.lastSeenAt)}`,
    color: 'gray'
  };
}

export function formatPrice(price) {
  const amount = Number(price);
  if (!amount) return 'Prix non renseigné';
  return `≈ ${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

export function haversineMeters(a, b) {
  const toRad = (n) => (n * Math.PI) / 180;
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return earth * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0).replace('.', ',')} km`;
}

export function directionsUrl(vendor) {
  const destination = encodeURIComponent(`${vendor.lat},${vendor.lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function normalizePhone(value = '') {
  return value.replace(/[^+\d]/g, '').slice(0, 16);
}

export function getQueryParam(name) {
  const hash = location.hash || '';
  const query = hash.includes('?') ? hash.split('?')[1] : '';
  return new URLSearchParams(query).get(name);
}

export function routeParts() {
  const raw = (location.hash || '#/').replace(/^#\/?/, '').split('?')[0];
  return raw.split('/').filter(Boolean);
}

export function go(path) {
  location.hash = `#/${path.replace(/^\//, '')}`;
}

export function compressImage(file, maxWidth = 1000, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Le fichier sélectionné n’est pas une image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire cette image.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Image invalide.'));
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
