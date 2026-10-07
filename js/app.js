const { createApp } = Vue;

const DB_NAME = 'CityEventsDB';
const DB_VERSION = 1;
const STORE_NAME = 'savedEvents';
const STORAGE_KEY = 'city_events_favorites';
const MIGRATION_FLAG_KEY = 'events_migrated_to_idb';
// Функція для зберігання в локальне сховище
function saveToLocalStorage(items) {
  try {
    const serializedData = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, serializedData);
  } catch (error) {
    console.error('Помилка збереження даних у localStorage:', error);
  }
}
// Функція для отримання даних з локального сховища
function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return [];
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Помилка читання або парсингу даних із localStorage:', error);
    return [];
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('Ваш браузер не підтримує IndexedDB'));
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

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(new Error('Не вдалося відкрити локальну базу даних IndexedDB. Перевірте дозволи сховища у вашому браузері.'));
    };
  });
}
// Функція для зберігання в IndexedDB
async function saveItem(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
// Функція для отримання даних з IndexedDB
async function getAllItems() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
// Функція для видалення даних з IndexedDB
async function deleteItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
// Функція для мігрування даних з Локального сховища в IndexedDB
async function migrateLocalStorageToIndexedDB() {
  const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
  if (isMigrated) return;

  try {
    const existingIDBItems = await getAllItems();
    const localItems = loadFromLocalStorage();

    if (existingIDBItems.length === 0 && localItems.length > 0) {
      for (const item of localItems) {
        await saveItem(item);
      }
      console.log(`Міграція успішна: перенесено ${localItems.length} записів.`);
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (error) {
    console.error('Помилка під час міграції даних:', error);
  }
}

const app = createApp({
  data() {
    return {
      events: [
        { 
          id: 'manual-1',
          title: 'Кіносеанс «Film»', 
          category: 'cinema', 
          img: 'placeholder.jpg', 
          date: '2026-10-18',
          location: 'Кінотеатр «Центр»'
        },
        { 
          id: 'manual-2',
          title: 'EXPERIENCE. Ludovico Einaudi та Max Richter', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-15',
          location: 'Філармонія'
        },
        { 
          id: 'manual-3',
          title: 'Виступ Романа Скорпіона', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-16',
          location: 'Палац Спорту'
        },
        { 
          id: 'manual-4',
          title: 'Концерт гурту OKS', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-17',
          location: 'Клубний зал'
        },
      ],
      favorites: [],
      selectedCategory: 'all',
      selectedEvent: null,
      isLoading: false,
      errorMessage: ''
    };
  },
  computed: {
    filteredEvents() {
      if (this.selectedCategory === 'favorites') {
        const favoriteIds = new Set(this.favorites.map(fav => fav.id));
        return this.events.filter(item => favoriteIds.has(item.id));
      }
      if (this.selectedCategory === 'all') {
        return this.events;
      }
      return this.events.filter(item => item.category === this.selectedCategory);
    }
  },
  methods: {
    isFavorite(eventId) {
      return this.favorites.some(item => item.id === eventId);
    },

    async refreshFavorites() {
      try {
        this.favorites = await getAllItems();
      } catch (error) {
        console.error('Не вдалося завантажити обрані події з IndexedDB:', error);
      }
    },

    async toggleFavorite(event) {
      try {
        if (this.isFavorite(event.id)) {
          await deleteItem(event.id);
        } else {
          const itemToSave = {
            id: event.id,
            name: event.title || event.name,
            date: event.date,
            location: event.location || 'Головний зал'
          };
          await saveItem(itemToSave);
        }
        await this.refreshFavorites();
      } catch (error) {
        console.error('Помилка при зміні стану в IndexedDB:', error);
      }
    },

    setCategory(category) {
      this.selectedCategory = category;
    },

    handleSelectEvent(event) {
      this.selectedEvent = event;
    },

    async loadEvents() {
      const EVENTS_API_URL = 'https://date.nager.at/api/v3/PublicHolidays/2026/UA';
      this.isLoading = true;
      this.errorMessage = '';

      try {
        const response = await fetch(EVENTS_API_URL);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Дані про події не знайдено');
          }
          throw new Error(`Помилка сервера: ${response.status}`);
        }

        const data = await response.json();

        const apiEvents = data.map((item) => {
          const title = item.localName || item.name;
          const stableId = `holiday-${item.date}-${title.toLowerCase().replace(/\s+/g, '-')}`;

          return {
            id: stableId,
            title: title,
            category: 'holliday',
            img: 'placeholder.jpg', 
            date: item.date,    
            location: 'Головна сцена'
          };
        });

        this.events = apiEvents;
      } catch (error) {
        console.error('Технічні деталі помилки:', error);
        this.errorMessage = error.message.includes('Дані про події не знайдено')
          ? 'Дані про події не знайдено'
          : 'Не вдалося завантажити події. Перевірте зʼєднання або спробуйте пізніше.';
        this.events = [];
      } finally {
        this.isLoading = false;
      }
    },

    handleAddEvent(event) {
      const form = event.target;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const newEvent = {
        id: `custom-${Date.now()}`,
        title: form.elements.title.value.trim(),
        category: form.elements.category.value,
        img: 'placeholder.jpg',
        date: form.elements.date.value,
        location: 'Головний зал'
      };

      this.events.push(newEvent);
      form.reset();
    }
  },
  async mounted() {
  try {
    await migrateLocalStorageToIndexedDB();

    await this.refreshFavorites();
  } catch (error) {
    console.error('Збій ініціалізації сховища IndexedDB:', error);
    this.errorMessage = error.message || 'IndexedDB недоступна. Збереження подій тимчасово не працює.';
  }

  await this.loadEvents();
}
});

app.component('EventCard', {
  props: {
    id: { type: [Number, String], required: true },
    title: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    img: { type: String, default: 'placeholder.jpg' },
    isFavorite: { type: Boolean, default: false }
  },
  emits: ['select', 'toggle-favorite'],
  computed: {
    daysUntilEvent() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const targetDate = new Date(this.date);
      targetDate.setHours(0, 0, 0, 0);

      const diffTime = targetDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'Подія вже відбулася';
      if (diffDays === 0) return 'Сьогодні';
      if (diffDays === 1) return 'Завтра';
      return `Через ${diffDays} дн.`;
    },
    formattedDate() {
      const dateObj = new Date(this.date);
      return {
        day: dateObj.getDate(),
        month: dateObj.toLocaleDateString('uk-UA', { month: 'long' })
      };
    },
    categoryLabel() {
      const categoryDictionary = {
        concert: 'Концерт',
        cinema: 'Кіно',
        theatre: 'Театр',
        exhibition: 'Виставка',
        holliday: 'Свято'
      };
      return categoryDictionary[this.category] || this.category;
    }
  },
  template: `
    <article :class="['card', category]" @click="$emit('select')" style="cursor: pointer;">
      <div class="card-image-wrap">
        <button 
          type="button" 
          :class="['btn-fav-toggle', { active: isFavorite }]"
          :title="isFavorite ? 'Видалити з обраного' : 'Додати в обране'"
          @click.stop="$emit('toggle-favorite')">
          ★
        </button>
        <img :src="'assets/img/' + img" :alt="'Афіша: ' + title">
        <span :class="['badge', category]">{{ categoryLabel }}</span>
      </div>
      <div class="card-body">
        <time class="event-date" :datetime="date">
          <span class="day">{{ formattedDate.day }}</span>
          <span class="month">{{ formattedDate.month }}</span>
        </time>
        <div class="event-info">
          <h3 class="event-title">{{ title }}</h3>
          <p class="days-remaining" style="font-size: 0.85rem; color: #6b7280; margin-top: 4px;">
            {{ daysUntilEvent }}
          </p>
        </div>
      </div>
    </article>
  `
});

app.mount('.layout-container');

/* 
Стару функцію рендеру замінено Vue.

const staticCard = document.querySelectorAll('.card');
if (staticCard) {
    staticCard.forEach(card => card.remove());
}

const listContainer = document.querySelector('#events-list');
const eventsCount = document.querySelector('#events-count');

function renderEvents(eventsList) {
    listContainer.innerHTML = '';

    eventsList.forEach(event => {
        const card = document.createElement('article');
        
        card.classList.add('card', event.category);
        card.dataset.category = event.category;
        const label = categoryDictionary[event.category] || event.category;

        const { day, month } = parseEventDate(event.date);

        card.innerHTML = `
            <div class="card-image-wrap">
                <img src="assets/img/${event.img}" alt="Афіша: ${event.title}">
                <span class="badge ${event.category}">${label}</span>
            </div>
            <div class="card-body">
                <time class="event-date" datetime="${event.date}">
                    <span class="day">${day}</span>
                    <span class="month">${month}</span>
                </time>
                <h3 class="event-title">${event.title}</h3>
            </div>
        `;

        listContainer.appendChild(card);
        if (eventsCount) {
            eventsCount.textContent = `Кількість подій: ${eventsList.length}`;
        }
    });
}
*/