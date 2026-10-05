import {
  escapeHtml,
  formatDistance,
  formatPrice,
  haversineMeters,
  relativeTime,
  vendorStatus
} from './utils.js';

const iconPaths = {
  back: '<path d="M15 18l-6-6 6-6"/><path d="M9 12h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  locate: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  map: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15 9l-2 4-4 2 2-4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 00-.1-7.8z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
  route: '<path d="M4 19c0-4 4-4 4-8s4-4 4-8M14 5h6v6"/><path d="M20 5l-7 7"/>',
  flag: '<path d="M5 22V4m0 1h11l-2 4 2 4H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="2.5"/>',
  camera: '<path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="3"/>',
  check: '<path d="M5 12l4 4L19 6"/>',
  warning: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 18h.01"/>',
  logout: '<path d="M10 17l5-5-5-5M15 12H3M15 4h5v16h-5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/>',
  phone: '<path d="M6 3h4l2 5-3 2a16 16 0 007 7l2-3 5 2v4c0 1-1 2-2 2C11 22 2 13 2 4c0-1 1-1 2-1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  chevron: '<path d="M9 18l6-6-6-6"/>',
  share: '<circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 11l8-5M8 13l8 5"/>'
};

export function icon(name, size = 22, className = '') {
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
}

function navItem(path, label, iconName, active) {
  return `<a class="nav-item${active ? ' is-active' : ''}" href="#/${path}" aria-label="${label}">${icon(iconName, 21)}<span>${label}</span></a>`;
}

export function bottomNav(active = 'map') {
  return `
    <nav class="bottom-nav" aria-label="Navigation principale">
      ${navItem('map', 'Carte', 'map', active === 'map')}
      ${navItem('nearby', 'Autour de moi', 'compass', active === 'nearby')}
      <a class="nav-add${active === 'add' ? ' is-active' : ''}" href="#/add/1" aria-label="Signaler une vendeuse">${icon('plus', 28)}<span>Signaler</span></a>
      ${navItem('favorites', 'Favoris', 'heart', active === 'favorites')}
      ${navItem('profile', 'Profil', 'user', active === 'profile')}
    </nav>`;
}

function header(title, { back = '', action = '' } = {}) {
  return `
    <header class="app-header">
      ${back ? `<a class="icon-button" href="#/${back}" aria-label="Retour">${icon('back')}</a>` : '<span class="header-spacer"></span>'}
      <h1>${escapeHtml(title)}</h1>
      ${action || '<span class="header-spacer"></span>'}
    </header>`;
}

function statusBadge(vendor, compact = false) {
  const status = vendorStatus(vendor);
  return `<div class="status-block status-block--${status.key}${compact ? ' is-compact' : ''}">
    <span class="status-dot"></span>
    <div><strong>${status.label}</strong>${compact ? '' : `<small>${status.detail}</small>`}</div>
  </div>`;
}

export function welcomeView() {
  return `
    <main class="welcome-screen">
      <div class="welcome-overlay"></div>
      <div class="welcome-content">
        <img class="welcome-logo" src="./assets/logo-light.svg" alt="BliBli" />
        <div class="welcome-copy">
          <h1>Où est la banane braisée&nbsp;?</h1>
          <p>Trouve une vendeuse de banane braisée près de toi et aide la communauté à garder la carte à jour.</p>
        </div>
        <div class="welcome-actions">
          <button class="button button--primary button--wide" data-action="enter-app">Découvrir la carte <span aria-hidden="true">→</span></button>
          <button class="button button--glass button--wide" data-action="open-auth">Se connecter</button>
          <small>La consultation et l’itinéraire sont accessibles sans compte.</small>
        </div>
      </div>
    </main>`;
}

export function mapView(state, ui) {
  const selected = state.vendors.find((vendor) => vendor.id === ui.selectedVendorId);
  return `
    <main class="app-screen map-screen">
      <header class="map-topbar">
        <div class="brand-row">
          <img src="./assets/logo.svg" alt="BliBli" class="brand-logo" />
          <button class="icon-button icon-button--soft" data-action="share-app" aria-label="Partager BliBli">${icon('share')}</button>
        </div>
        <form class="search-bar" id="map-search-form">
          ${icon('search', 20)}
          <input name="query" value="${escapeHtml(ui.search || '')}" placeholder="Rechercher un quartier, un lieu…" aria-label="Rechercher" />
          <button type="button" class="search-filter" data-action="cycle-filter" aria-label="Changer le filtre">${icon('filter', 20)}</button>
        </form>
        <div class="map-filter-label">${ui.filter === 'recent' ? 'Présentes récemment' : ui.filter === 'confirm' ? 'À confirmer' : 'Tous les emplacements'}</div>
      </header>
      <div id="vendor-map" class="map-canvas" aria-label="Carte des vendeuses"></div>
      <button class="floating-locate" data-action="locate-me" aria-label="Me localiser">${icon('locate')}</button>
      <div class="map-count"><strong>${ui.filteredCount ?? state.vendors.length}</strong> point${(ui.filteredCount ?? state.vendors.length) > 1 ? 's' : ''} visible${(ui.filteredCount ?? state.vendors.length) > 1 ? 's' : ''}</div>
      ${bottomNav('map')}
      ${selected ? vendorSheet(selected, state) : ''}
    </main>`;
}

export function vendorSheet(vendor, state) {
  const favorite = state.favorites.includes(vendor.id);
  return `
    <div class="sheet-scrim" data-action="close-vendor"></div>
    <article class="vendor-sheet" aria-label="Fiche de ${escapeHtml(vendor.title)}">
      <div class="sheet-handle"></div>
      <button class="sheet-close" data-action="close-vendor" aria-label="Fermer">${icon('close', 20)}</button>
      <div class="vendor-hero">
        <img src="${escapeHtml(vendor.photo)}" alt="Illustration du point de vente" />
        <button class="hero-favorite${favorite ? ' is-active' : ''}" data-action="toggle-favorite" data-vendor-id="${vendor.id}" aria-label="${favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}">${icon('heart', 21)}</button>
      </div>
      <div class="vendor-sheet__body">
        <h2>${escapeHtml(vendor.title)}</h2>
        <p class="vendor-location">${icon('pin', 17)} ${escapeHtml(vendor.landmark)}</p>
        ${statusBadge(vendor)}
        <div class="info-grid">
          <div class="info-tile">${icon('clock', 19)}<span><small>Horaires habituels</small><strong>${escapeHtml(vendor.period || 'Variables')}</strong></span></div>
          <div class="info-tile">${icon('info', 19)}<span><small>Prix indicatif</small><strong>${formatPrice(vendor.price)}</strong></span></div>
          <div class="info-tile">${icon('check', 19)}<span><small>Communauté</small><strong>${Number(vendor.confirmations || 0)} confirmation${Number(vendor.confirmations || 0) > 1 ? 's' : ''}</strong></span></div>
        </div>
        ${vendor.phoneStatus === 'verified' && vendor.phone ? `<a class="phone-card" href="tel:${escapeHtml(vendor.phone)}">${icon('phone')}<span>Appeler la vendeuse</span></a>` : ''}
        ${vendor.phoneStatus === 'proposed' ? `<div class="phone-pending">${icon('phone', 18)}<span><strong>Numéro proposé — à vérifier</strong><small>Le numéro n’est pas affiché tant que la vendeuse ne l’a pas confirmé.</small></span></div>` : ''}
        <button class="button button--orange button--wide button--large" data-action="confirm-presence" data-vendor-id="${vendor.id}">${icon('eye', 21)} Je la vois ici maintenant</button>
        <div class="action-row">
          <button class="button button--primary button--grow" data-action="directions" data-vendor-id="${vendor.id}">${icon('route', 19)} Itinéraire</button>
          <button class="button button--outline button--grow" data-action="toggle-favorite" data-vendor-id="${vendor.id}">${icon('heart', 19)} ${favorite ? 'Dans les favoris' : 'Ajouter aux favoris'}</button>
        </div>
        <button class="text-button text-button--danger" data-action="open-report" data-vendor-id="${vendor.id}">${icon('flag', 18)} Signaler un problème</button>
      </div>
    </article>`;
}

function vendorListCard(vendor, state, distance = '') {
  const favorite = state.favorites.includes(vendor.id);
  return `
    <article class="vendor-list-card" data-action="open-vendor" data-vendor-id="${vendor.id}" tabindex="0">
      <img src="${escapeHtml(vendor.photo)}" alt="" />
      <div class="vendor-list-card__body">
        <div class="vendor-list-card__top">
          <h3>${escapeHtml(vendor.title)}</h3>
          <button class="mini-icon${favorite ? ' is-active' : ''}" data-action="toggle-favorite" data-vendor-id="${vendor.id}" aria-label="Favori">${icon('heart', 18)}</button>
        </div>
        <p>${icon('pin', 15)} ${escapeHtml(vendor.area)}</p>
        <p>${formatPrice(vendor.price)}${distance ? ` · ${distance}` : ''}</p>
        ${statusBadge(vendor, true)}
      </div>
    </article>`;
}

export function nearbyView(state, ui) {
  const origin = state.userLocation || { lat: 5.3364, lng: -4.0267 };
  const vendors = [...state.vendors]
    .map((vendor) => ({ ...vendor, distance: haversineMeters(origin, vendor) }))
    .sort((a, b) => a.distance - b.distance);
  return `
    <main class="app-screen list-screen">
      ${header('Autour de moi', { action: `<button class="icon-button" data-action="locate-list" aria-label="Actualiser ma position">${icon('locate')}</button>` })}
      <section class="screen-intro">
        <p>${state.userLocation ? 'Triées à partir de ta dernière position.' : 'Distance approximative depuis le centre d’Abidjan.'}</p>
      </section>
      <section class="card-list">
        ${vendors.map((vendor) => vendorListCard(vendor, state, formatDistance(vendor.distance))).join('')}
      </section>
      ${bottomNav('nearby')}
      ${ui.selectedVendorId ? vendorSheet(state.vendors.find((vendor) => vendor.id === ui.selectedVendorId), state) : ''}
    </main>`;
}

export function favoritesView(state, ui) {
  const vendors = state.vendors.filter((vendor) => state.favorites.includes(vendor.id));
  return `
    <main class="app-screen list-screen">
      ${header('Mes favoris')}
      ${vendors.length ? `<section class="card-list">${vendors.map((vendor) => vendorListCard(vendor, state)).join('')}</section>` : `
        <section class="empty-state">
          <div class="empty-icon">♡</div>
          <h2>Aucun favori pour le moment</h2>
          <p>Ajoute les emplacements que tu veux retrouver facilement.</p>
          <a class="button button--primary" href="#/map">Explorer la carte</a>
        </section>`}
      ${bottomNav('favorites')}
      ${ui.selectedVendorId ? vendorSheet(state.vendors.find((vendor) => vendor.id === ui.selectedVendorId), state) : ''}
    </main>`;
}

function stepper(active) {
  return `<div class="stepper" aria-label="Étape ${active} sur 3">
    ${[1, 2, 3].map((step) => `<span class="step${step === active ? ' is-active' : ''}${step < active ? ' is-done' : ''}">${step < active ? icon('check', 14) : step}</span>${step < 3 ? '<i></i>' : ''}`).join('')}
  </div>`;
}

export function addStepOneView(state) {
  const draft = state.draft;
  return `
    <main class="app-screen form-screen">
      ${header('Signaler une vendeuse', { back: 'map' })}
      ${stepper(1)}
      <section class="form-heading">
        <h2>Où se trouve la vendeuse&nbsp;?</h2>
        <p>Déplace le marqueur si nécessaire ou utilise ta position actuelle.</p>
      </section>
      <div id="add-location-map" class="add-map"></div>
      <div class="location-panel">
        <button class="button button--outline button--wide" data-action="locate-draft">${icon('locate', 19)} Utiliser ma position actuelle</button>
        <div class="coordinate-line">${icon('pin', 17)} <span>${Number(draft.lat).toFixed(5)}, ${Number(draft.lng).toFixed(5)}</span></div>
        <button class="button button--primary button--wide button--large" data-action="add-next-1">Continuer</button>
      </div>
      ${bottomNav('add')}
    </main>`;
}

export function addStepTwoView(state) {
  const draft = state.draft;
  const periods = ['Matin', 'Midi', 'Après-midi', 'Soir', 'Horaires variables', 'Je ne sais pas'];
  return `
    <main class="app-screen form-screen form-screen--scroll">
      ${header('Signaler une vendeuse', { back: 'add/1' })}
      ${stepper(2)}
      <section class="form-heading">
        <h2>Quelques informations</h2>
        <p>Elles sont facultatives, mais utiles à la communauté.</p>
      </section>
      <form id="vendor-details-form" class="form-card">
        <label class="photo-picker">
          <input id="vendor-photo" type="file" accept="image/*" capture="environment" hidden />
          ${draft.photo ? `<img src="${escapeHtml(draft.photo)}" alt="Aperçu de la photo" />` : `<span class="photo-picker__icon">${icon('camera', 28)}</span>`}
          <span><strong>${draft.photo ? 'Changer la photo' : 'Ajouter une photo'}</strong><small>Facultatif · demande son accord avant de montrer son visage</small></span>
        </label>
        <label class="field"><span>Commune ou quartier</span><input name="area" value="${escapeHtml(draft.area)}" placeholder="Ex. Cocody Angré" /></label>
        <label class="field"><span>Repère</span><input name="landmark" value="${escapeHtml(draft.landmark)}" placeholder="Ex. devant la pharmacie, près du carrefour" /></label>
        <label class="field"><span>Prix approximatif <small>(facultatif)</small></span><div class="input-suffix"><input name="price" value="${escapeHtml(draft.price)}" inputmode="numeric" pattern="[0-9]*" placeholder="500" /><span>FCFA</span></div></label>
        <fieldset class="chip-fieldset">
          <legend>Quand est-elle généralement présente&nbsp;?</legend>
          <div class="choice-chips">${periods.map((period) => `<label><input type="radio" name="period" value="${escapeHtml(period)}" ${draft.period === period ? 'checked' : ''}/><span>${escapeHtml(period)}</span></label>`).join('')}</div>
        </fieldset>
        <div class="form-divider"></div>
        <label class="field"><span>Numéro de la vendeuse <small>(facultatif)</small></span><input name="phone" value="${escapeHtml(draft.phone)}" inputmode="tel" autocomplete="tel" placeholder="Ex. +225 07 00 00 00 00" /></label>
        <label class="checkbox-row"><input type="checkbox" name="phoneConsent" ${draft.phoneConsent ? 'checked' : ''}/><span>La vendeuse m’a autorisé à transmettre ce numéro à BliBli.</span></label>
        <div class="privacy-note">${icon('info', 18)}<span>Le numéro restera masqué avec le statut <strong>« Numéro proposé — à vérifier »</strong> tant que la vendeuse ne l’a pas confirmé.</span></div>
        <button class="button button--primary button--wide button--large" type="submit">Continuer</button>
      </form>
      ${bottomNav('add')}
    </main>`;
}

export function addStepThreeView(state) {
  const draft = state.draft;
  return `
    <main class="app-screen form-screen form-screen--scroll">
      ${header('Signaler une vendeuse', { back: 'add/2' })}
      ${stepper(3)}
      <section class="form-heading">
        <h2>Tu as vu une vendeuse ici&nbsp;?</h2>
        <p>Ta contribution aidera les personnes à proximité.</p>
      </section>
      <section class="review-card">
        <div class="review-map-mini"><span class="review-pin">🔥</span><span>${Number(draft.lat).toFixed(4)}, ${Number(draft.lng).toFixed(4)}</span></div>
        <img src="${escapeHtml(draft.photo || './assets/vendor-generic.svg')}" alt="Aperçu" />
        <div class="review-card__body">
          <h3>Banane braisée — ${escapeHtml(draft.landmark || draft.area || 'Nouvel emplacement')}</h3>
          <p>${icon('pin', 17)} ${escapeHtml(draft.landmark || 'Repère non renseigné')}</p>
          <div class="review-facts">
            <span>${icon('clock', 17)} ${escapeHtml(draft.period)}</span>
            <span>${formatPrice(draft.price)}</span>
            ${draft.phone ? `<span class="orange-text">${icon('phone', 17)} À vérifier</span>` : ''}
          </div>
        </div>
      </section>
      <section class="publish-box">
        <button class="button button--primary button--wide button--large" data-action="publish-vendor">Publier l’emplacement</button>
        <p>${state.profile ? `La contribution sera associée à <strong>${escapeHtml(state.profile.pseudonym)}</strong>.` : 'Tu devras te connecter pour finaliser cette contribution.'}</p>
      </section>
      ${bottomNav('add')}
    </main>`;
}

export function successView(state, vendorId) {
  const vendor = state.vendors.find((item) => item.id === vendorId);
  return `
    <main class="success-screen">
      <div class="success-check">${icon('check', 54)}</div>
      <h1>Emplacement publié&nbsp;!</h1>
      <p>Merci pour ta contribution. Le point apparaît maintenant sur la carte.</p>
      <div class="success-status">
        <small>Statut actuel</small>
        <strong>🟠 Nouveau — à confirmer par la communauté</strong>
      </div>
      ${vendor?.phoneStatus === 'proposed' ? `<div class="phone-pending">${icon('phone', 18)}<span><strong>Numéro proposé — à vérifier</strong><small>Il reste masqué jusqu’à sa validation.</small></span></div>` : ''}
      <a class="button button--primary button--wide" href="#/map?vendor=${escapeHtml(vendorId || '')}">Voir sur la carte</a>
      <a class="text-button" href="#/add/1">Signaler un autre emplacement</a>
    </main>`;
}

function profileStats(state) {
  const userId = state.profile?.id;
  const own = state.contributions.filter((item) => item.userId === userId);
  return {
    additions: own.filter((item) => item.type === 'vendor_created').length,
    confirmations: own.filter((item) => item.type === 'presence_confirmation').length,
    reports: own.filter((item) => item.type === 'problem_report').length
  };
}

export function profileView(state) {
  if (!state.profile) {
    return `
      <main class="app-screen profile-screen">
        ${header('Mon profil')}
        <section class="profile-guest">
          <div class="profile-avatar profile-avatar--guest">${icon('user', 42)}</div>
          <h2>Contribue à la carte</h2>
          <p>Crée un compte pour ajouter une vendeuse, confirmer sa présence et suivre tes contributions.</p>
          <button class="button button--primary" data-action="open-auth">Se connecter ou créer un compte</button>
          <p class="tiny-note">La consultation et l’itinéraire restent libres.</p>
        </section>
        ${bottomNav('profile')}
      </main>`;
  }
  const stats = profileStats(state);
  return `
    <main class="app-screen profile-screen">
      ${header('Mon profil', { action: '<button class="icon-button" data-action="profile-settings" aria-label="Paramètres">⚙</button>' })}
      <section class="profile-card">
        <div class="profile-avatar">${escapeHtml(state.profile.pseudonym.slice(0, 1).toUpperCase())}</div>
        <div><h2>${escapeHtml(state.profile.pseudonym)}</h2><p>Membre depuis ${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(state.profile.joinedAt))}</p></div>
      </section>
      <section class="stats-grid">
        <div><strong>${stats.additions}</strong><span>Emplacements<br>ajoutés</span></div>
        <div><strong>${stats.confirmations}</strong><span>Présences<br>confirmées</span></div>
        <div><strong>${stats.reports}</strong><span>Signalements<br>effectués</span></div>
      </section>
      <section class="settings-list">
        <a href="#/contributions">${icon('flag')}<span>Mes contributions</span>${icon('chevron', 19)}</a>
        <a href="#/favorites">${icon('heart')}<span>Mes favoris</span>${icon('chevron', 19)}</a>
        <button data-action="install-app">${icon('plus')}<span>Installer BliBli</span>${icon('chevron', 19)}</button>
        <button data-action="show-about">${icon('info')}<span>À propos du prototype</span>${icon('chevron', 19)}</button>
        <button data-action="logout">${icon('logout')}<span>Se déconnecter</span>${icon('chevron', 19)}</button>
        <button class="danger-row" data-action="open-delete-account">${icon('trash')}<span>Supprimer mon compte</span>${icon('chevron', 19)}</button>
      </section>
      ${bottomNav('profile')}
    </main>`;
}

export function contributionsView(state) {
  const items = state.profile
    ? state.contributions.filter((item) => item.userId === state.profile.id)
    : [];
  const labels = {
    vendor_created: 'Emplacement ajouté',
    presence_confirmation: 'Présence confirmée',
    problem_report: 'Problème signalé'
  };
  return `
    <main class="app-screen list-screen">
      ${header('Mes contributions', { back: 'profile' })}
      ${items.length ? `<section class="timeline-list">${items.map((item) => {
        const vendor = state.vendors.find((entry) => entry.id === item.vendorId);
        return `<article><span class="timeline-dot"></span><div><strong>${labels[item.type] || 'Contribution'}</strong><p>${escapeHtml(vendor?.title || 'Emplacement')}</p><small>${relativeTime(item.createdAt)} · ${escapeHtml(item.status || 'enregistré')}</small></div></article>`;
      }).join('')}</section>` : `<section class="empty-state"><div class="empty-icon">＋</div><h2>Aucune contribution</h2><p>Signale une vendeuse ou confirme un point existant.</p><a class="button button--primary" href="#/add/1">Commencer</a></section>`}
    </main>`;
}

export function loadingView() {
  return `<main class="loading-screen"><img src="./assets/logo.svg" alt="BliBli"/><div class="loader"></div><p>Chargement de la carte…</p></main>`;
}

export function modalView(modal, state) {
  if (!modal) return '';
  if (modal.type === 'auth') return authModal();
  if (modal.type === 'report') {
    const vendor = state.vendors.find((item) => item.id === modal.vendorId);
    return reportModal(vendor);
  }
  if (modal.type === 'duplicate') {
    const vendor = state.vendors.find((item) => item.id === modal.vendorId);
    return duplicateModal(vendor, modal.distance);
  }
  if (modal.type === 'delete-account') return deleteAccountModal();
  if (modal.type === 'about') return aboutModal();
  return '';
}

function modalShell(content, label) {
  return `<div class="modal-layer" role="dialog" aria-modal="true" aria-label="${escapeHtml(label)}"><div class="modal-scrim" data-action="close-modal"></div><section class="modal-card"><button class="modal-close" data-action="close-modal" aria-label="Fermer">${icon('close')}</button>${content}</section></div>`;
}

function authModal() {
  return modalShell(`
    <img class="modal-logo" src="./assets/logo.svg" alt="BliBli" />
    <h2>Connecte-toi pour contribuer</h2>
    <p>Chaque ajout est associé à un profil afin de préserver la fiabilité de la carte. Ton identité ne sera pas affichée publiquement.</p>
    <div class="social-login">
      <button class="button button--outline button--wide" data-action="demo-login" data-provider="google"><span class="provider-logo">G</span> Continuer avec Google</button>
      <button class="button button--outline button--wide" data-action="demo-login" data-provider="apple"><span class="provider-logo provider-logo--apple">●</span> Continuer avec Apple</button>
    </div>
    <div class="or-line"><span>ou</span></div>
    <form id="email-login-form" class="email-login">
      <label class="field"><span>Pseudonyme public</span><input name="pseudonym" required maxlength="24" placeholder="Ex. BabiFood225" /></label>
      <label class="field"><span>Adresse e-mail</span><input name="email" required type="email" autocomplete="email" placeholder="toi@exemple.com" /></label>
      <button class="button button--primary button--wide" type="submit">Continuer avec l’e-mail</button>
    </form>
    <small class="legal-note">Prototype : les boutons sociaux simulent la connexion. Le backend Supabase est préparé dans le dépôt.</small>
  `, 'Connexion');
}

function reportModal(vendor) {
  const reasons = [
    ['absent_now', "Elle n'est pas là actuellement"],
    ['gone', 'Cette vendeuse ne vient plus ici'],
    ['wrong_location', "L'emplacement est incorrect"],
    ['duplicate', "C'est un doublon"],
    ['bad_photo', 'La photo est inappropriée'],
    ['false_info', 'Les informations sont fausses']
  ];
  return modalShell(`
    <div class="modal-icon modal-icon--orange">${icon('flag', 28)}</div>
    <h2>Signaler un problème</h2>
    <p>${escapeHtml(vendor?.title || '')}</p>
    <form id="report-form" data-vendor-id="${escapeHtml(vendor?.id || '')}">
      <div class="radio-list">${reasons.map(([value, label]) => `<label><input type="radio" name="reason" value="${value}" required/><span>${escapeHtml(label)}</span></label>`).join('')}</div>
      <label class="field"><span>Détail facultatif</span><textarea name="details" rows="3" placeholder="Ajoute une précision utile à la modération…"></textarea></label>
      <button class="button button--primary button--wide" type="submit">Envoyer le signalement</button>
    </form>
  `, 'Signaler un problème');
}

function duplicateModal(vendor, distance) {
  return modalShell(`
    <div class="modal-icon modal-icon--orange">${icon('warning', 30)}</div>
    <h2>Un point existe déjà tout près</h2>
    <p><strong>${escapeHtml(vendor?.title || 'Emplacement existant')}</strong> se trouve à environ ${Math.round(distance || 0)} mètres.</p>
    <div class="duplicate-preview">${statusBadge(vendor || { lastSeenAt: new Date().toISOString() })}<span>${escapeHtml(vendor?.landmark || '')}</span></div>
    <button class="button button--primary button--wide" data-action="confirm-duplicate" data-vendor-id="${escapeHtml(vendor?.id || '')}">Oui, confirmer ce point</button>
    <button class="button button--outline button--wide" data-action="force-publish">Non, ajouter un autre point</button>
  `, 'Point proche détecté');
}

function deleteAccountModal() {
  return modalShell(`
    <div class="modal-icon modal-icon--danger">${icon('trash', 29)}</div>
    <h2>Supprimer ton compte&nbsp;?</h2>
    <p>Le profil et les informations de connexion seront supprimés de ce prototype. Les contributions déjà utiles à la carte seront anonymisées.</p>
    <button class="button button--danger button--wide" data-action="delete-account">Supprimer définitivement</button>
    <button class="button button--outline button--wide" data-action="close-modal">Annuler</button>
  `, 'Suppression du compte');
}

function aboutModal() {
  return modalShell(`
    <img class="modal-logo" src="./assets/logo.svg" alt="BliBli" />
    <h2>Premier jet fonctionnel</h2>
    <p>Cette version utilise le stockage local du navigateur. Elle démontre le parcours participatif avant le branchement de Supabase et la publication via Capacitor.</p>
    <ul class="about-list"><li>Consultation et itinéraire sans compte</li><li>Compte requis pour contribuer</li><li>Numéros masqués jusqu’à vérification</li><li>PWA installable et structure mobile-ready</li></ul>
    <button class="button button--primary button--wide" data-action="close-modal">Compris</button>
  `, 'À propos');
}
