/* ===========================
   CONSTANTS & DATA
   =========================== */
const STORAGE_KEY = 'packgo-data';

const CATEGORIES = ['Documents', 'Clothing', 'Toiletries', 'Electronics', 'Health', 'Misc'];

const CATEGORY_ICONS = {
  Documents:   '📋',
  Clothing:    '👕',
  Toiletries:  '🧴',
  Electronics: '🔌',
  Health:      '💊',
  Misc:        '🎒',
};

const STAMPS = ['✈️', '🗺️', '🏔️', '🌊', '🌍', '🏕️', '🎭', '🗼'];

const DEFAULT_TEMPLATE = [
  { id: 1,  text: 'Passport & ID',       category: 'Documents'   },
  { id: 2,  text: 'Travel insurance',    category: 'Documents'   },
  { id: 3,  text: 'Flight tickets',      category: 'Documents'   },
  { id: 4,  text: 'T-shirts (×3)',       category: 'Clothing'    },
  { id: 5,  text: 'Underwear (×5)',      category: 'Clothing'    },
  { id: 6,  text: 'Socks (×5)',          category: 'Clothing'    },
  { id: 7,  text: 'Toothbrush & paste',  category: 'Toiletries'  },
  { id: 8,  text: 'Deodorant',           category: 'Toiletries'  },
  { id: 9,  text: 'Charger & adapter',   category: 'Electronics' },
  { id: 10, text: 'Headphones',          category: 'Electronics' },
];

/* ===========================
   STATE
   =========================== */
let state = {
  template: [],
  trips: [],
  activeTripId: null,
  currentView: 'trips',
};

/* ===========================
   PERSISTENCE
   =========================== */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.template = saved.template || JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
      state.trips    = saved.trips    || [];
    } else {
      state.template = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
      state.trips    = [];
    }
  } catch {
    state.template = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
    state.trips    = [];
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      template: state.template,
      trips:    state.trips,
    }));
  } catch {}
}

/* ===========================
   UTILITIES
   =========================== */
function genId() {
  return Date.now() + Math.random();
}

function randomStamp() {
  return STAMPS[Math.floor(Math.random() * STAMPS.length)];
}

function groupByCategory(items) {
  const groups = {};
  items.forEach(item => {
    const cat = item.category || 'Misc';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return groups;
}

function getProgress(items) {
  if (!items.length) return 0;
  return Math.round((items.filter(i => i.checked).length / items.length) * 100);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  } catch { return ''; }
}

function formatDateLong(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  } catch { return ''; }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ===========================
   VIEW SWITCHING
   =========================== */
function switchView(viewName) {
  state.currentView = viewName;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + viewName).classList.add('active');

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  const tripTab = document.getElementById('tripTab');
  if (viewName === 'trip' && state.activeTripId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (trip) {
      tripTab.textContent = trip.stamp + ' ' + trip.name;
      tripTab.classList.remove('hidden');
      tripTab.classList.add('active');
    }
  } else {
    tripTab.classList.add('hidden');
    tripTab.classList.remove('active');
  }
}

/* ===========================
   RENDER: TRIPS LIST
   =========================== */
function renderTrips() {
  const list  = document.getElementById('tripsList');
  const empty = document.getElementById('tripsEmpty');

  list.innerHTML = '';

  if (state.trips.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  state.trips.forEach(trip => {
    const progress = getProgress(trip.items);
    const isDone   = progress === 100;

    const card = document.createElement('div');
    card.className = 'trip-card';
    card.innerHTML = `
      <div class="trip-card-inner">
        <div class="trip-card-body">
          <div class="trip-card-title-row">
            <span class="trip-card-stamp">${trip.stamp}</span>
            <div>
              <div class="trip-card-name">${escHtml(trip.name)}</div>
              ${trip.date ? `<div class="trip-card-date">${formatDate(trip.date)}</div>` : ''}
            </div>
          </div>
          <div class="trip-card-progress">
            <div class="progress-labels">
              <span>${trip.items.filter(i => i.checked).length} / ${trip.items.length} packed</span>
              <span class="progress-pct ${isDone ? 'done' : ''}">${isDone ? '✓ Ready!' : progress + '%'}</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill ${isDone ? 'done' : ''}" style="width:${progress}%"></div>
            </div>
          </div>
        </div>
        <button class="delete-btn trip-delete-btn" data-id="${trip.id}" title="Delete trip">✕</button>
      </div>
    `;

    card.addEventListener('click', e => {
      if (e.target.closest('.trip-delete-btn')) return;
      openTrip(trip.id);
    });

    card.querySelector('.trip-delete-btn').addEventListener('click', e => {
      e.stopPropagation();
      deleteTrip(trip.id);
    });

    list.appendChild(card);
  });
}

/* ===========================
   RENDER: TEMPLATE
   =========================== */
function renderTemplate() {
  const container = document.getElementById('templateList');
  const empty     = document.getElementById('templateEmpty');
  const subtitle  = document.getElementById('templateSubtitle');

  const groups  = groupByCategory(state.template);
  const numCats = Object.keys(groups).length;

  subtitle.textContent = `This list is cloned whenever you start a new trip. ${state.template.length} items across ${numCats} ${numCats === 1 ? 'category' : 'categories'}.`;

  container.innerHTML = '';

  if (state.template.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  Object.entries(groups).forEach(([cat, items]) => {
    const block = document.createElement('div');
    block.className = 'category-block card';
    block.style.padding = '0';

    block.innerHTML = `
      <div class="category-block-header">
        <span class="category-block-title">${CATEGORY_ICONS[cat] || '📦'} ${escHtml(cat)}</span>
        <span class="category-block-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="category-block-items"></div>
    `;

    const itemsContainer = block.querySelector('.category-block-items');

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'template-item';
      row.innerHTML = `
        <span class="template-item-label">${escHtml(item.text)}</span>
        <button class="delete-btn" title="Remove">✕</button>
      `;
      row.querySelector('.delete-btn').addEventListener('click', () => {
        removeTemplateItem(item.id);
      });
      itemsContainer.appendChild(row);
    });

    container.appendChild(block);
  });
}

/* ===========================
   RENDER: TRIP DETAIL
   =========================== */
function renderTripDetail() {
  const trip = state.trips.find(t => t.id === state.activeTripId);
  if (!trip) return;

  document.getElementById('detailStamp').textContent = trip.stamp;
  document.getElementById('detailName').textContent  = trip.name;
  document.getElementById('detailDate').textContent  = trip.date ? formatDateLong(trip.date) : '';

  updateDetailProgress(trip);

  const container = document.getElementById('tripChecklist');
  const empty     = document.getElementById('tripEmpty');
  container.innerHTML = '';

  if (trip.items.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const groups = groupByCategory(trip.items);

  Object.entries(groups).forEach(([cat, items]) => {
    const checkedCount = items.filter(i => i.checked).length;
    const allDone      = checkedCount === items.length;

    const block = document.createElement('div');
    block.className = `category-block card${allDone ? ' all-done' : ''}`;
    block.style.padding = '0';

    block.innerHTML = `
      <div class="category-block-header${allDone ? ' done' : ''}">
        <span class="category-block-title${allDone ? ' done' : ''}">${CATEGORY_ICONS[cat] || '📦'} ${escHtml(cat)}</span>
        <span class="category-block-count${allDone ? ' done' : ''}">
          ${allDone ? '✓ Done' : `${checkedCount}/${items.length}`}
        </span>
      </div>
      <div class="category-block-items"></div>
    `;

    const itemsContainer = block.querySelector('.category-block-items');

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'check-item';

      const checkbox = document.createElement('div');
      checkbox.className = `checkbox${item.checked ? ' checked' : ''}`;
      checkbox.textContent = item.checked ? '✓' : '';
      checkbox.addEventListener('click', () => toggleItem(trip.id, item.id));

      const label = document.createElement('span');
      label.className = `check-label${item.checked ? ' checked' : ''}`;
      label.textContent = item.text;
      label.addEventListener('click', () => toggleItem(trip.id, item.id));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.title = 'Remove';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => removeTripItem(trip.id, item.id));

      row.appendChild(checkbox);
      row.appendChild(label);
      row.appendChild(delBtn);
      itemsContainer.appendChild(row);
    });

    container.appendChild(block);
  });
}

function updateDetailProgress(trip) {
  const progress = getProgress(trip.items);
  const isDone   = progress === 100;
  const packed   = trip.items.filter(i => i.checked).length;

  document.getElementById('detailPackedLabel').textContent = `${packed} of ${trip.items.length} packed`;

  const pctEl = document.getElementById('detailProgressPct');
  pctEl.textContent = isDone ? '✓ All set — have a great trip!' : `${progress}%`;
  pctEl.classList.toggle('done', isDone);

  const bar = document.getElementById('detailProgressBar');
  bar.style.width = progress + '%';
  bar.classList.toggle('done', isDone);
}

/* ===========================
   ACTIONS: TRIPS
   =========================== */
function openTrip(id) {
  state.activeTripId = id;
  renderTripDetail();
  switchView('trip');
}

function deleteTrip(id) {
  if (!confirm('Delete this trip? This cannot be undone.')) return;
  state.trips = state.trips.filter(t => t.id !== id);
  if (state.activeTripId === id) {
    state.activeTripId = null;
    switchView('trips');
  }
  saveState();
  renderTrips();
}

function createTrip(name, date) {
  const trip = {
    id:        genId(),
    name:      name.trim(),
    date:      date,
    stamp:     randomStamp(),
    createdAt: new Date().toISOString(),
    items:     state.template.map(item => ({ ...item, id: genId(), checked: false })),
  };
  state.trips.unshift(trip);
  saveState();
  renderTrips();
  openTrip(trip.id);
}

/* ===========================
   ACTIONS: TRIP ITEMS
   =========================== */
function toggleItem(tripId, itemId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;
  const item = trip.items.find(i => i.id === itemId);
  if (!item) return;
  item.checked = !item.checked;
  saveState();
  renderTripDetail();
  renderTrips();
}

function addTripItem(tripId, text, category) {
  if (!text.trim()) return;
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;
  trip.items.push({ id: genId(), text: text.trim(), category, checked: false });
  saveState();
  renderTripDetail();
}

function removeTripItem(tripId, itemId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;
  trip.items = trip.items.filter(i => i.id !== itemId);
  saveState();
  renderTripDetail();
  renderTrips();
}

/* ===========================
   ACTIONS: TEMPLATE
   =========================== */
function addTemplateItem(text, category) {
  if (!text.trim()) return;
  state.template.push({ id: genId(), text: text.trim(), category });
  saveState();
  renderTemplate();
}

function removeTemplateItem(id) {
  state.template = state.template.filter(i => i.id !== id);
  saveState();
  renderTemplate();
}

/* ===========================
   POPULATE CATEGORY SELECTS
   =========================== */
function populateCategorySelects() {
  ['templateCategorySelect', 'tripCategorySelect'].forEach(selectId => {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '';
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      sel.appendChild(opt);
    });
    sel.value = 'Misc';
  });
}

/* ===========================
   MODAL
   =========================== */
function openModal() {
  document.getElementById('modalDesc').textContent =
    `We'll copy your ${state.template.length}-item master template to get you started.`;
  document.getElementById('newTripNameInput').value = '';
  document.getElementById('newTripDateInput').value = '';
  document.getElementById('newTripModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('newTripNameInput').focus(), 50);
}

function closeModal() {
  document.getElementById('newTripModal').classList.add('hidden');
}

/* ===========================
   EVENT LISTENERS
   =========================== */
function bindEvents() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      if (v === 'trip' && state.activeTripId) {
        renderTripDetail();
        switchView('trip');
      } else if (v !== 'trip') {
        switchView(v);
        if (v === 'trips')    renderTrips();
        if (v === 'template') renderTemplate();
      }
    });
  });

  // Back button
  document.getElementById('backBtn').addEventListener('click', () => {
    renderTrips();
    switchView('trips');
  });

  // Open new trip modal
  document.getElementById('openNewTripBtn').addEventListener('click', openModal);
  document.getElementById('openNewTripBtn2').addEventListener('click', openModal);

  // Cancel / close modal
  document.getElementById('cancelTripBtn').addEventListener('click', closeModal);
  document.getElementById('newTripModal').addEventListener('click', e => {
    if (e.target === document.getElementById('newTripModal')) closeModal();
  });

  // Create trip
  document.getElementById('createTripBtn').addEventListener('click', () => {
    const name = document.getElementById('newTripNameInput').value.trim();
    const date = document.getElementById('newTripDateInput').value;
    if (!name) { document.getElementById('newTripNameInput').focus(); return; }
    closeModal();
    createTrip(name, date);
  });

  document.getElementById('newTripNameInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('createTripBtn').click();
  });

  // Add template item
  document.getElementById('addTemplateItemBtn').addEventListener('click', () => {
    const text = document.getElementById('templateItemInput').value;
    const cat  = document.getElementById('templateCategorySelect').value;
    addTemplateItem(text, cat);
    document.getElementById('templateItemInput').value = '';
    document.getElementById('templateItemInput').focus();
  });

  document.getElementById('templateItemInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addTemplateItemBtn').click();
  });

  // Add trip item
  document.getElementById('addTripItemBtn').addEventListener('click', () => {
    const text = document.getElementById('tripItemInput').value;
    const cat  = document.getElementById('tripCategorySelect').value;
    addTripItem(state.activeTripId, text, cat);
    document.getElementById('tripItemInput').value = '';
    document.getElementById('tripItemInput').focus();
  });

  document.getElementById('tripItemInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addTripItemBtn').click();
  });

  // Reset all
  document.getElementById('resetAllBtn').addEventListener('click', () => {
    if (!confirm('Reset everything? All trips and template changes will be lost.')) return;
    state.template     = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE));
    state.trips        = [];
    state.activeTripId = null;
    saveState();
    renderTrips();
    switchView('trips');
  });
}

/* ===========================
   INIT
   =========================== */
function init() {
  loadState();
  populateCategorySelects();
  bindEvents();
  renderTrips();
  switchView('trips');
}

document.addEventListener('DOMContentLoaded', init);