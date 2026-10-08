const DB_NAME = 'CityEventsDB';
const DB_VERSION = 1;
const STORE_NAME = 'savedEvents';
const STORAGE_KEY = 'city_events_favorites';
const MIGRATION_FLAG_KEY = 'events_migrated_to_idb';
const API_URL = '/api/events';

function saveToLocalStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Помилка збереження в localStorage:', error);
  }
}

function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    return rawData ? JSON.parse(rawData) : [];
  } catch (error) {
    return [];
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB не підтримується'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function migrateLocalStorageToIndexedDB() {
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;
  try {
    const existing = await getAllItems();
    const local = loadFromLocalStorage();
    if (existing.length === 0 && local.length > 0) {
      for (const item of local) {
        await saveItem(item);
      }
    }
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (err) {
    console.error('Помилка міграції:', err);
  }
}

function getEventTiming(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
  const MAX_DAYS = 30;

  let progress = 5;
  if (diffDays <= 0) progress = 100;
  else if (diffDays < MAX_DAYS) progress = Math.round((1 - diffDays / MAX_DAYS) * 100);

  let label = `Через ${diffDays} дн.`;
  if (diffDays < 0) label = 'Подія вже відбулася';
  else if (diffDays === 0) label = 'Сьогодні';
  else if (diffDays === 1) label = 'Завтра';

  const day = targetDate.getDate();
  const month = targetDate.toLocaleDateString('uk-UA', { month: 'long' });

  return { diffDays, progress, label, day, month };
}

const categoryDictionary = {
  concert: 'Концерт',
  cinema: 'Кіно',
  theatre: 'Театр',
  exhibition: 'Виставка',
  holliday: 'Свято'
};

let cachedEvents = [];
let selectedCategory = 'all';

function generateEventCardHTML(event, isFav = false) {
  const { progress, label, day, month } = getEventTiming(event.date);
  const catLabel = categoryDictionary[event.category] || event.category;

  return `
    <article class="card ${event.category}" data-id="${event.id}">
      <div class="card-image-wrap">
        <button 
          type="button" 
          class="btn-fav-toggle ${isFav ? 'active' : ''}" 
          title="${isFav ? 'Видалити з обраного' : 'Додати в обране'}"
          data-fav-id="${event.id}">
          ★
        </button>
        <img src="assets/img/${event.img || 'placeholder.jpg'}" alt="Афіша: ${event.title}">
        <span class="badge ${event.category}">${catLabel}</span>
      </div>
      <div class="event-progress-wrap" role="progressbar" aria-valuemin="0" aria-valuemax="100">
        <div class="event-progress-bar" style="width: ${progress}%;"></div>
      </div>
      <div class="card-body">
        <time class="event-date" datetime="${event.date}">
          <span class="day">${day}</span>
          <span class="month">${month}</span>
        </time>
        <div class="event-info">
          <h3 class="event-title">${event.title}</h3>
          <p class="days-remaining">${label}</p>
        </div>
      </div>
      <div class="card-actions">
            <a href="#/events/${event.id}" data-link class="btn-refresh btn-card-details">
              Детальніше
            </a>
      </div>
    </article>
  `;
}

async function renderHomeView(params, container) {
  const savedFavorites = await getAllItems();
  const favIds = new Set(savedFavorites.map(item => String(item.id)));

  container.innerHTML = `
    <section id="events-section">
      <div id="category-filter" class="filter-buttons">
        <button type="button" class="filter-btn ${selectedCategory === 'all' ? 'active' : ''}" data-cat="all">Усі</button>
        <button type="button" class="filter-btn ${selectedCategory === 'concert' ? 'active' : ''}" data-cat="concert">Концерт</button>
        <button type="button" class="filter-btn ${selectedCategory === 'cinema' ? 'active' : ''}" data-cat="cinema">Кіно</button>
        <button type="button" class="filter-btn ${selectedCategory === 'theatre' ? 'active' : ''}" data-cat="theatre">Театр</button>
        <button type="button" class="filter-btn ${selectedCategory === 'exhibition' ? 'active' : ''}" data-cat="exhibition">Виставка</button>
        <button type="button" class="filter-btn ${selectedCategory === 'holliday' ? 'active' : ''}" data-cat="holliday">Свято</button>
        <button type="button" class="filter-btn filter-btn-fav ${selectedCategory === 'favorites' ? 'active' : ''}" data-cat="favorites">
          ⭐ Обрані (${savedFavorites.length})
        </button>
      </div>

      <h2>Додати подію</h2>
      <form id="event-form">
        <div class="form-group">
          <label for="event-title">Назва події:</label>
          <input type="text" id="event-title" name="title" required pattern=".{3,}" placeholder="Введіть щонайменше 3 символи">
        </div>
        <div class="form-group">
          <label for="event-category">Категорія:</label>
          <select id="event-category" name="category" required>
            <option value="" disabled selected>Оберіть категорію</option>
            <option value="concert">Концерт</option>
            <option value="cinema">Кіно</option>
            <option value="theatre">Театр</option>
            <option value="exhibition">Виставка</option>
            <option value="holliday">Свято</option>
          </select>
        </div>
        <div class="form-group">
          <label for="event-date">Дата події:</label>
          <input type="date" id="event-date" name="date" required>
        </div>
        <button type="submit" id="submit-btn">Додати подію</button>
      </form>
    </section>

    <section id="events">
      <h2>Події</h2>
      <div class="events-header-actions">
        <p id="events-count">Кількість подій: 0</p>
        <button type="button" id="reload-btn" class="btn-refresh">Оновити</button>
      </div>
      <div id="events-list" class="cards"></div>
    </section>
  `;

  const cardsContainer = container.querySelector('#events-list');
  const countEl = container.querySelector('#events-count');

  function renderList() {
    let list = cachedEvents;
    if (selectedCategory === 'favorites') {
      list = cachedEvents.filter(e => favIds.has(String(e.id)));
    } else if (selectedCategory !== 'all') {
      list = cachedEvents.filter(e => e.category === selectedCategory);
    }

    list = [...list].sort((a, b) => new Date(a.date) - new Date(b.date));
    countEl.textContent = `Кількість подій: ${list.length}`;

    if (list.length === 0) {
      cardsContainer.innerHTML = `<p class="empty-state">Подій у цій категорії не знайдено.</p>`;
      return;
    }

    cardsContainer.innerHTML = list.map(item => generateEventCardHTML(item, favIds.has(String(item.id)))).join('');
  }

  async function fetchEventsFromAPI() {
    cardsContainer.innerHTML = `<p class="loading-state">Завантаження подій із мережі...</p>`;
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Помилка сервера');
      const data = await response.json();

      cachedEvents = data;
      renderList();
    } catch (err) {
      cardsContainer.innerHTML = `<p class="error-banner">Не вдалося завантажити події з API.</p>`;
    }
  }

  container.querySelector('#category-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    selectedCategory = btn.dataset.cat;
    container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderList();
  });

  container.querySelector('#event-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const newEvent = {
      id: `custom-${Date.now()}`,
      title: form.elements.title.value.trim(),
      category: form.elements.category.value,
      img: 'placeholder.jpg',
      date: form.elements.date.value,
      location: 'Головний зал'
    };
    cachedEvents.unshift(newEvent);
    form.reset();
    renderList();
  });

  container.querySelector('#reload-btn').addEventListener('click', fetchEventsFromAPI);

  cardsContainer.addEventListener('click', async (e) => {
    const starBtn = e.target.closest('.btn-fav-toggle');
    if (!starBtn) return;
    e.stopPropagation();

    const id = starBtn.dataset.favId;
    const event = cachedEvents.find(item => String(item.id) === String(id));
    if (!event) return;

    if (favIds.has(String(id))) {
      await deleteItem(id);
      favIds.delete(String(id));
      starBtn.classList.remove('active');
    } else {
      await saveItem({
        id: event.id,
        name: event.title,
        date: event.date,
        location: event.location || 'Головний зал'
      });
      favIds.add(String(id));
      starBtn.classList.add('active');
    }

    const favCounterBtn = container.querySelector('.filter-btn-fav');
    if (favCounterBtn) favCounterBtn.textContent = `⭐ Обрані (${favIds.size})`;
    if (selectedCategory === 'favorites') renderList();
  });

  if (cachedEvents.length === 0) {
    await fetchEventsFromAPI();
  } else {
    renderList();
  }
}

async function renderEventDetailsView(params, container) {
  const eventId = params.id;

  if (cachedEvents.length === 0) {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        cachedEvents = await response.json();
      }
    } catch (err) {
      console.error('Не вдалося завантажити дані для сторінки деталей:', err);
    }
  }
    
  let event = cachedEvents.find(e => String(e.id) === String(eventId));

  if (!event) {
    const saved = await getAllItems();
    event = saved.find(e => String(e.id) === String(eventId));
  }

  if (!event) {
    container.innerHTML = `
      <section class="event-details-card">
        <h2>Подію не знайдено</h2>
        <a href="#/" data-link class="btn-refresh btn-card-details">← На головну</a>
      </section>
    `;
    return;
  }

  const savedItems = await getAllItems();
  const isSaved = savedItems.some(i => String(i.id) === String(event.id));

  container.innerHTML = `
    <article class="event-details-card">
      <a href="#/" data-link class="btn-back-link">
        ← Назад до афіші
      </a>
      <h2>${event.title || event.name}</h2>
      <p><strong>Дата:</strong> ${event.date}</p>
      <p><strong>Локація:</strong> ${event.location || 'Головний зал'}</p>
      <p><strong>Категорія:</strong> ${event.category || 'Культурна подія'}</p>
      <div class="details-actions-wrap">
        <button type="button" class="btn-refresh" id="toggle-save-detail-btn">
          ${isSaved ? '★ Видалити з обраного' : '☆ Додати в обране'}
        </button>
      </div>
    </article>
  `;

  const btn = container.querySelector('#toggle-save-detail-btn');
  btn.addEventListener('click', async () => {
    const all = await getAllItems();
    const exists = all.some(i => String(i.id) === String(event.id));
    if (exists) {
      await deleteItem(event.id);
      btn.textContent = '☆ Додати в обране';
    } else {
      await saveItem({
        id: event.id,
        name: event.title || event.name,
        date: event.date,
        location: event.location || 'Головний зал'
      });
      btn.textContent = '★ Видалити з обраного';
    }
  });
}

async function renderSavedEventsView(params, container) {
  const items = await getAllItems();

  container.innerHTML = `
    <section>
      <h2>Збережені події</h2>
      <div id="saved-list" class="cards">
        ${items.length === 0 ? '<p class="empty-state">У вас немає збережених подій.</p>' : ''}
      </div>
    </section>
  `;

  const list = container.querySelector('#saved-list');
  if (items.length > 0) {
    list.innerHTML = items.map(item => `
      <article class="card card-saved">
        <h3 class="card-saved-title">${item.name || item.title}</h3>
        <p><strong>Дата:</strong> ${item.date}</p>
        <p><strong>Локація:</strong> ${item.location || 'Головний зал'}</p>
        <div class="card-saved-actions">
          <a href="#/events/${item.id}" data-link class="btn-refresh btn-link-action">Переглянути</a>
        </div>
      </article>
    `).join('');
  }
}

function renderNotFoundView(container) {
  container.innerHTML = `
    <section class="not-found-view">
      <h2>404 — Сторінку не знайдено</h2>
      <a href="#/" data-link class="btn-refresh btn-card-details">На головну</a>
    </section>
  `;
}

const routes = [
  { path: '/', view: renderHomeView },
  { path: '/events/:id', view: renderEventDetailsView },
  { path: '/saved', view: renderSavedEventsView }
];

function matchRoute(path) {
  const pathParts = path.split('/').filter(Boolean);
  for (const route of routes) {
    const routeParts = route.path.split('/').filter(Boolean);
    if (routeParts.length !== pathParts.length) continue;
    const params = {};

    const isMatch = routeParts.every((part, i) => {
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[i];
        return true;
      }
      return part === pathParts[i];
    });

    if (isMatch) return { view: route.view, params };
  }
  return null;
}

function navigate(path) {
  window.location.hash = path.startsWith('/') ? '#' + path : '#' + '/' + path;
}

async function router() {
  const appContainer = document.querySelector('#app');
  if (!appContainer) return;

  let currentPath = window.location.hash.slice(1);
  if (!currentPath) currentPath = '/';

  const match = matchRoute(currentPath);
  if (match) {
    appContainer.innerHTML = '';
    await match.view(match.params, appContainer);
  } else {
    renderNotFoundView(appContainer);
  }
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-link]');
  if (link) {
    event.preventDefault();
    const href = link.getAttribute('href');
    const path = href.startsWith('#') ? href.slice(1) : href;
    navigate(path);
  }
});

window.addEventListener('hashchange', router);

window.addEventListener('DOMContentLoaded', async () => {
  await migrateLocalStorageToIndexedDB();
  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    router();
  }
});