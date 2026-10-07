const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      events: [
        { 
          id: 1,
          title: 'Кіносеанс «Film»', 
          category: 'cinema', 
          img: 'placeholder.jpg', 
          date: '2026-10-18' 
        },
        { 
          id: 2,
          title: 'EXPERIENCE. Ludovico Einaudi та Max Richter', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-15' 
        },
        { 
          id: 3,
          title: 'Виступ Романа Скорпіона', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-16' 
        },
        { 
          id: 4,
          title: 'Концерт гурту OKS', 
          category: 'concert', 
          img: 'placeholder.jpg', 
          date: '2026-10-17' 
        },
      ],
      selectedCategory: 'all',
      selectedEvent: null,
      isLoading: false,
      errorMessage: ''
    };
  },
  computed: {
    filteredEvents() {
      if (this.selectedCategory === 'all') {
        return this.events;
      }
      return this.events.filter(item => item.category === this.selectedCategory);
    }
  },
  methods: {
    handleSelectEvent(event) {
      this.selectedEvent = event;
    },
    setCategory(category) {
      this.selectedCategory = category;
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

        const apiEvents = data.map((item, index) => ({
          id: Date.now() + index,
          title: item.localName || item.name,
          category: 'exhibition',
          img: 'placeholder.jpg',
          date: item.date
        }));

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
        id: Date.now(),
        title: form.elements.title.value.trim(),
        category: form.elements.category.value,
        img: 'placeholder.jpg',
        date: form.elements.date.value
      };

      this.events.push(newEvent);
      form.reset();
    }
  },
  mounted() {
    this.loadEvents();
  }
});

app.component('EventCard', {
  props: {
    title: { type: String, required: true },
    category: { type: String, required: true },
    date: { type: String, required: true },
    img: { type: String, default: 'placeholder.jpg' }
  },
  emits: ['select'],
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