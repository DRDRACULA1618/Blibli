import { initStore, store } from './store.js';
import { DEFAULT_LOCATION_RADIUS_METERS, destroyMap, mountVendorMap } from './map.js';
import {
  addStepOneView,
  addStepThreeView,
  addStepTwoView,
  contributionsView,
  favoritesView,
  loadingView,
  mapView,
  modalView,
  nearbyView,
  profileView,
  successView,
  welcomeView
} from './views.js';
import {
  ABIDJAN_CENTER,
  compressImage,
  directionsUrl,
  getQueryParam,
  go,
  haversineMeters,
  normalizePhone,
  routeParts,
  vendorStatus
} from './utils.js';

const app = document.querySelector('#app');

const ui = {
  selectedVendorId: null,
  search: '',
  filter: 'all',
  filteredCount: 0,
  modal: null,
  pendingAction: null,
  toast: null,
  mapController: null,
  installPrompt: null,
  autoLocationAttempted: false
};

let toastTimer = null;

function showToast(message, tone = 'default') {
  ui.toast = { message, tone, id: Date.now() };
  const id = ui.toast.id;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (ui.toast?.id === id) {
      ui.toast = null;
      render();
    }
  }, 3200);
}

function filteredVendors(state) {
  const query = ui.search.trim().toLowerCase();
  return state.vendors.filter((vendor) => {
    const haystack = `${vendor.title} ${vendor.area} ${vendor.landmark}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);
    const status = vendorStatus(vendor).key;
    const matchesFilter = ui.filter === 'all' || status === ui.filter;
    return matchesSearch && matchesFilter;
  });
}

function currentRoute() {
  const parts = routeParts();
  if (!parts.length) {
    return localStorage.getItem('blibli-welcome-seen') ? ['map'] : ['welcome'];
  }
  return parts;
}

function toastView() {
  if (!ui.toast) return '';
  const symbol = ui.toast.tone === 'error' ? '!' : ui.toast.tone === 'success' ? '✓' : 'i';
  return `<div class="toast toast--${ui.toast.tone}" role="status"><span>${symbol}</span><p>${ui.toast.message}</p></div>`;
}

function render() {
  const state = store.get();
  destroyMap();
  ui.mapController = null;

  if (!state.ready) {
    app.innerHTML = loadingView();
    return;
  }

  const [screen, param] = currentRoute();
  let html = '';

  if (screen === 'welcome') {
    html = welcomeView();
  } else if (screen === 'map') {
    const vendors = filteredVendors(state);
    ui.filteredCount = vendors.length;
    html = mapView(state, ui);
  } else if (screen === 'nearby') {
    html = nearbyView(state, ui);
  } else if (screen === 'favorites') {
    html = favoritesView(state, ui);
  } else if (screen === 'add') {
    const step = param || '1';
    html = step === '2' ? addStepTwoView(state) : step === '3' ? addStepThreeView(state) : addStepOneView(state);
  } else if (screen === 'success') {
    html = successView(state, param);
  } else if (screen === 'profile') {
    html = profileView(state);
  } else if (screen === 'contributions') {
    html = contributionsView(state);
  } else {
    html = mapView(state, ui);
  }

  app.innerHTML = `${html}${modalView(ui.modal, state)}${toastView()}`;
  afterRender(screen, param);
}

async function afterRender(screen, param) {
  const state = store.get();
  if (screen === 'map') {
    const vendors = filteredVendors(state);
    ui.mapController = await mountVendorMap(document.querySelector('#vendor-map'), vendors, {
      center: state.userLocation ? [state.userLocation.lat, state.userLocation.lng] : ABIDJAN_CENTER,
      zoom: state.userLocation ? 14 : 12,
      userLocation: state.userLocation,
      locationRadiusMeters: DEFAULT_LOCATION_RADIUS_METERS,
      fitUserLocation: Boolean(state.userLocation),
      locationPaddingTop: 150,
      selectedVendorId: ui.selectedVendorId,
      onSelect(vendorId) {
        ui.selectedVendorId = vendorId;
        render();
      }
    });

    if (!ui.autoLocationAttempted && ui.mapController?.locate) {
      ui.autoLocationAttempted = true;
      try {
        const position = await ui.mapController.locate();
        store.setUserLocation(position);
      } catch (error) {
        showToast(error.message || 'Position indisponible.', 'error');
      }
    }
  }

  if (screen === 'add' && (param || '1') === '1') {
    const draft = state.draft;
    ui.mapController = await mountVendorMap(document.querySelector('#add-location-map'), state.vendors, {
      center: [draft.lat, draft.lng],
      zoom: 14,
      selectedPosition: { lat: draft.lat, lng: draft.lng },
      selectable: true,
      onSelect(vendorId) {
        ui.selectedVendorId = vendorId;
        go('map');
      },
      onPositionChange(position) {
        store.updateDraft(position, { notify: false });
        const line = document.querySelector('.coordinate-line span');
        if (line) line.textContent = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
      }
    });
  }
}

function closeModal() {
  ui.modal = null;
  render();
}

function requireAuth(action, payload = {}) {
  if (store.get().profile) {
    executeAction(action, payload);
    return;
  }
  ui.pendingAction = { action, payload };
  ui.modal = { type: 'auth' };
  render();
}

function runPendingAction() {
  const pending = ui.pendingAction;
  ui.pendingAction = null;
  if (pending) executeAction(pending.action, pending.payload);
}

function executeAction(action, payload = {}) {
  if (action === 'confirm-presence') {
    store.confirmPresence(payload.vendorId);
    ui.selectedVendorId = payload.vendorId;
    ui.modal = null;
    showToast('Présence confirmée. Merci pour la communauté !', 'success');
    return;
  }
  if (action === 'open-report') {
    ui.modal = { type: 'report', vendorId: payload.vendorId };
    render();
    return;
  }
  if (action === 'publish-vendor') {
    startPublish();
  }
}

function startPublish() {
  const state = store.get();
  const draft = state.draft;
  const nearby = state.vendors
    .map((vendor) => ({ vendor, distance: haversineMeters(draft, vendor) }))
    .filter(({ distance }) => distance <= 80)
    .sort((a, b) => a.distance - b.distance)[0];

  if (nearby) {
    ui.modal = { type: 'duplicate', vendorId: nearby.vendor.id, distance: nearby.distance };
    render();
    return;
  }
  finalPublish(false);
}

function finalPublish(force) {
  const vendor = store.publishDraft({ force });
  ui.modal = null;
  ui.selectedVendorId = vendor.id;
  go(`success/${vendor.id}`);
}

async function locateAndSave({ draft = false } = {}) {
  try {
    if (!ui.mapController?.locate) throw new Error('La carte n’est pas encore prête.');
    const position = await ui.mapController.locate();
    if (draft) {
      store.updateDraft(position, { notify: false });
      const line = document.querySelector('.coordinate-line span');
      if (line) line.textContent = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
    } else {
      store.setUserLocation(position);
    }
    showToast('Position mise à jour.', 'success');
  } catch (error) {
    showToast(error.message || 'Position indisponible.', 'error');
  }
}

async function locateForList() {
  try {
    const position = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Géolocalisation indisponible.'));
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
        () => reject(new Error('Autorise la localisation pour trier les résultats.')),
        { enableHighAccuracy: true, timeout: 9000 }
      );
    });
    store.setUserLocation(position);
    showToast('Liste triée depuis ta position.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function shareApp() {
  const data = {
    title: 'BliBli — Banane braisée',
    text: 'Trouve et signale une vendeuse de banane braisée près de toi à Abidjan.',
    url: location.href.split('#')[0] + '#/map'
  };
  if (navigator.share) {
    navigator.share(data).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(data.url).then(() => showToast('Lien copié.', 'success'));
  } else {
    showToast('Copie le lien depuis la barre d’adresse.', 'default');
  }
}

app.addEventListener('click', (event) => {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;
  const vendorId = actionElement.dataset.vendorId;

  if (actionElement.tagName === 'BUTTON') event.preventDefault();

  if (action === 'enter-app') {
    localStorage.setItem('blibli-welcome-seen', '1');
    go('map');
  } else if (action === 'open-auth') {
    ui.modal = { type: 'auth' };
    render();
  } else if (action === 'close-modal') {
    ui.modal = null;
    ui.pendingAction = null;
    render();
  } else if (action === 'close-vendor') {
    ui.selectedVendorId = null;
    render();
  } else if (action === 'open-vendor') {
    if (event.target.closest('[data-action="toggle-favorite"]')) return;
    ui.selectedVendorId = vendorId;
    render();
  } else if (action === 'toggle-favorite') {
    event.stopPropagation();
    store.toggleFavorite(vendorId);
  } else if (action === 'directions') {
    const vendor = store.get().vendors.find((item) => item.id === vendorId);
    if (vendor) window.open(directionsUrl(vendor), '_blank', 'noopener,noreferrer');
  } else if (action === 'confirm-presence') {
    requireAuth('confirm-presence', { vendorId });
  } else if (action === 'open-report') {
    requireAuth('open-report', { vendorId });
  } else if (action === 'cycle-filter') {
    ui.filter = ui.filter === 'all' ? 'recent' : ui.filter === 'recent' ? 'confirm' : 'all';
    render();
  } else if (action === 'locate-me') {
    locateAndSave();
  } else if (action === 'locate-list') {
    locateForList();
  } else if (action === 'locate-draft') {
    locateAndSave({ draft: true });
  } else if (action === 'add-next-1') {
    go('add/2');
  } else if (action === 'publish-vendor') {
    requireAuth('publish-vendor');
  } else if (action === 'demo-login') {
    const provider = actionElement.dataset.provider || 'demo';
    store.login({ provider, pseudonym: provider === 'apple' ? 'MembreBliBli' : 'BabiFood225' });
    ui.modal = null;
    showToast('Connexion réussie dans le prototype.', 'success');
    runPendingAction();
  } else if (action === 'confirm-duplicate') {
    store.confirmPresence(vendorId);
    store.clearDraft();
    ui.modal = null;
    ui.selectedVendorId = vendorId;
    go('map');
    showToast('Le point existant a été confirmé.', 'success');
  } else if (action === 'force-publish') {
    finalPublish(true);
  } else if (action === 'share-app') {
    shareApp();
  } else if (action === 'logout') {
    store.logout();
    showToast('Tu es déconnecté.', 'default');
  } else if (action === 'open-delete-account') {
    ui.modal = { type: 'delete-account' };
    render();
  } else if (action === 'delete-account') {
    store.deleteAccount();
    ui.modal = null;
    showToast('Compte supprimé et contributions anonymisées.', 'success');
  } else if (action === 'show-about' || action === 'profile-settings') {
    ui.modal = { type: 'about' };
    render();
  } else if (action === 'install-app') {
    if (ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt.userChoice.finally(() => {
        ui.installPrompt = null;
      });
    } else {
      showToast('Dans ton navigateur, utilise « Ajouter à l’écran d’accueil ».', 'default');
    }
  }
});

app.addEventListener('submit', (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === 'map-search-form') {
    ui.search = new FormData(form).get('query')?.toString() || '';
    render();
    return;
  }

  if (form.id === 'vendor-details-form') {
    const data = new FormData(form);
    const phone = normalizePhone(data.get('phone')?.toString() || '');
    const phoneConsent = data.get('phoneConsent') === 'on';
    if (phone && !phoneConsent) {
      showToast('Confirme que la vendeuse a autorisé la transmission de son numéro.', 'error');
      return;
    }
    store.updateDraft({
      area: data.get('area')?.toString() || '',
      landmark: data.get('landmark')?.toString() || '',
      price: data.get('price')?.toString().replace(/\D/g, '') || '',
      period: data.get('period')?.toString() || 'Je ne sais pas',
      phone,
      phoneConsent
    });
    go('add/3');
    return;
  }

  if (form.id === 'email-login-form') {
    const data = new FormData(form);
    store.login({
      provider: 'email',
      email: data.get('email')?.toString() || '',
      pseudonym: data.get('pseudonym')?.toString() || ''
    });
    ui.modal = null;
    showToast('Profil créé dans le prototype.', 'success');
    runPendingAction();
    return;
  }

  if (form.id === 'report-form') {
    const data = new FormData(form);
    store.reportProblem(
      form.dataset.vendorId,
      data.get('reason')?.toString() || 'other',
      data.get('details')?.toString() || ''
    );
    ui.modal = null;
    showToast('Signalement envoyé à la modération.', 'success');
  }
});

app.addEventListener('change', async (event) => {
  if (event.target.id !== 'vendor-photo') return;
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) {
    showToast('Choisis une image de moins de 8 Mo.', 'error');
    return;
  }

  const form = event.target.closest('form');
  if (form) {
    const data = new FormData(form);
    store.updateDraft(
      {
        area: data.get('area')?.toString() || '',
        landmark: data.get('landmark')?.toString() || '',
        price: data.get('price')?.toString() || '',
        period: data.get('period')?.toString() || 'Soir',
        phone: data.get('phone')?.toString() || '',
        phoneConsent: data.get('phoneConsent') === 'on'
      },
      { notify: false }
    );
  }

  try {
    const photo = await compressImage(file);
    store.updateDraft({ photo });
    showToast('Photo ajoutée.', 'success');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

app.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    const card = event.target.closest('[data-action="open-vendor"]');
    if (card) {
      ui.selectedVendorId = card.dataset.vendorId;
      render();
    }
  }
});

window.addEventListener('hashchange', () => {
  const vendorId = getQueryParam('vendor');
  if (vendorId) {
    ui.selectedVendorId = vendorId;
    history.replaceState(null, '', `${location.pathname}${location.search}#/map`);
  }
  render();
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (ui.modal) closeModal();
  else if (ui.selectedVendorId) {
    ui.selectedVendorId = null;
    render();
  }
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  ui.installPrompt = event;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker', error));
  });
}

store.subscribe(render);
app.innerHTML = loadingView();

try {
  await initStore();
  const vendorId = getQueryParam('vendor');
  if (vendorId) ui.selectedVendorId = vendorId;
  render();
} catch (error) {
  console.error(error);
  app.innerHTML = `<main class="fatal-error"><h1>Impossible de charger BliBli</h1><p>Lance le projet avec <code>npm run dev</code> plutôt qu’en ouvrant directement le fichier HTML.</p><button onclick="location.reload()">Réessayer</button></main>`;
}
