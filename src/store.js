import { ABIDJAN_CENTER, seedDate, uid } from './utils.js';

const STORAGE_KEY = 'blibli-demo-v1';
const listeners = new Set();

const blankDraft = () => ({
  lat: ABIDJAN_CENTER[0],
  lng: ABIDJAN_CENTER[1],
  area: '',
  landmark: '',
  price: '',
  period: 'Soir',
  photo: '',
  phone: '',
  phoneConsent: false
});

let state = {
  ready: false,
  vendors: [],
  favorites: [],
  contributions: [],
  reports: [],
  profile: null,
  draft: blankDraft(),
  userLocation: null
};

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        vendors: state.vendors,
        favorites: state.favorites,
        contributions: state.contributions,
        reports: state.reports,
        profile: state.profile,
        userLocation: state.userLocation
      })
    );
  } catch (error) {
    console.warn('Stockage local indisponible', error);
  }
}

function notify() {
  for (const listener of listeners) listener(state);
}

function hydrateSeed(seed) {
  return seed.map((vendor) => ({
    ...vendor,
    lastSeenAt: seedDate(vendor),
    createdAt: vendor.createdAt || new Date().toISOString(),
    absenceReports: vendor.absenceReports || 0
  }));
}

export async function initStore() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }

  const response = await fetch('./data/vendors.json');
  const seed = hydrateSeed(await response.json());

  if (saved?.vendors?.length) {
    const savedIds = new Set(saved.vendors.map((vendor) => vendor.id));
    const missingSeed = seed.filter((vendor) => !savedIds.has(vendor.id));
    state = {
      ...state,
      ...saved,
      vendors: [...saved.vendors, ...missingSeed],
      favorites: saved.favorites || [],
      contributions: saved.contributions || [],
      reports: saved.reports || [],
      draft: blankDraft(),
      ready: true
    };
  } else {
    state = { ...state, vendors: seed, ready: true };
    persist();
  }
  notify();
  return state;
}

export const store = {
  get() {
    return state;
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  update(patch, { save = false } = {}) {
    state = { ...state, ...patch };
    if (save) persist();
    notify();
  },

  updateDraft(patch, { notify: shouldNotify = true } = {}) {
    state = { ...state, draft: { ...state.draft, ...patch } };
    if (shouldNotify) notify();
  },

  clearDraft() {
    state = { ...state, draft: blankDraft() };
    notify();
  },

  setUserLocation(location) {
    state = { ...state, userLocation: location };
    persist();
    notify();
  },

  toggleFavorite(vendorId) {
    const has = state.favorites.includes(vendorId);
    state = {
      ...state,
      favorites: has
        ? state.favorites.filter((id) => id !== vendorId)
        : [...state.favorites, vendorId]
    };
    persist();
    notify();
  },

  login({ provider = 'email', email = '', pseudonym = '' } = {}) {
    const generated = pseudonym.trim() || (email ? email.split('@')[0] : 'BabiFood225');
    const existingId = state.profile?.id;
    const profile = {
      id: existingId || uid('user'),
      pseudonym: generated.slice(0, 24),
      email: email || null,
      provider,
      joinedAt: state.profile?.joinedAt || new Date().toISOString(),
      trustLevel: 'Nouveau membre'
    };
    state = { ...state, profile };
    persist();
    notify();
    return profile;
  },

  logout() {
    state = { ...state, profile: null };
    persist();
    notify();
  },

  deleteAccount() {
    const profileId = state.profile?.id;
    state = {
      ...state,
      profile: null,
      vendors: state.vendors.map((vendor) =>
        vendor.createdBy === profileId ? { ...vendor, createdBy: 'deleted-user' } : vendor
      ),
      reports: state.reports.map((item) =>
        item.userId === profileId ? { ...item, userId: 'deleted-user', userLabel: 'Compte supprimé' } : item
      ),
      contributions: state.contributions.map((item) =>
        item.userId === profileId ? { ...item, userId: 'deleted-user', userLabel: 'Compte supprimé' } : item
      )
    };
    persist();
    notify();
  },

  confirmPresence(vendorId) {
    const timestamp = new Date().toISOString();
    state = {
      ...state,
      vendors: state.vendors.map((vendor) =>
        vendor.id === vendorId
          ? {
              ...vendor,
              lastSeenAt: timestamp,
              confirmations: Number(vendor.confirmations || 0) + 1,
              absenceReports: 0
            }
          : vendor
      ),
      contributions: [
        {
          id: uid('contrib'),
          type: 'presence_confirmation',
          vendorId,
          userId: state.profile?.id,
          userLabel: state.profile?.pseudonym,
          createdAt: timestamp,
          status: 'accepted'
        },
        ...state.contributions
      ]
    };
    persist();
    notify();
  },

  reportProblem(vendorId, reason, details = '') {
    const report = {
      id: uid('report'),
      vendorId,
      reason,
      details,
      userId: state.profile?.id,
      userLabel: state.profile?.pseudonym,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    state = {
      ...state,
      reports: [report, ...state.reports],
      vendors: state.vendors.map((vendor) =>
        vendor.id === vendorId && reason === 'absent_now'
          ? { ...vendor, absenceReports: Number(vendor.absenceReports || 0) + 1 }
          : vendor
      ),
      contributions: [
        {
          ...report,
          type: 'problem_report'
        },
        ...state.contributions
      ]
    };
    persist();
    notify();
    return report;
  },

  publishDraft({ force = false } = {}) {
    const draft = state.draft;
    const id = uid('vendor');
    const label = draft.landmark.trim() || draft.area.trim() || 'Nouvel emplacement';
    const vendor = {
      id,
      title: `Banane braisée — ${label}`,
      name: null,
      area: draft.area.trim() || 'Abidjan',
      landmark: draft.landmark.trim() || 'Repère non renseigné',
      lat: Number(draft.lat),
      lng: Number(draft.lng),
      price: Number(draft.price) || null,
      period: draft.period || 'Je ne sais pas',
      lastSeenAt: new Date().toISOString(),
      confirmations: 1,
      absenceReports: 0,
      photo: draft.photo || './assets/vendor-generic.svg',
      tags: ['Nouveau point'],
      phone: draft.phone || null,
      phoneStatus: draft.phone ? 'proposed' : 'none',
      phoneConsentDeclared: Boolean(draft.phone && draft.phoneConsent),
      createdBy: state.profile?.id,
      createdAt: new Date().toISOString(),
      moderationStatus: force ? 'pending_duplicate_review' : 'pending'
    };
    const contribution = {
      id: uid('contrib'),
      type: 'vendor_created',
      vendorId: id,
      userId: state.profile?.id,
      userLabel: state.profile?.pseudonym,
      createdAt: vendor.createdAt,
      status: 'pending'
    };
    state = {
      ...state,
      vendors: [vendor, ...state.vendors],
      contributions: [contribution, ...state.contributions],
      draft: blankDraft()
    };
    persist();
    notify();
    return vendor;
  },

  resetDemo() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};
