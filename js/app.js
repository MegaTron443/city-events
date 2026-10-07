const staticCard = document.querySelectorAll('.card');
const form = document.querySelector('#event-form');
const EVENTS_API_URL = 'https://date.nager.at/api/v3/PublicHolidays/2026/UA';

if (staticCard) {
    staticCard.forEach(card => card.remove());
}

const categoryDictionary = {
    concert: 'Концерт',
    cinema: 'Кіно',
    theatre: 'Театр',
    exhibition: 'Виставка',
    holliday: 'Свято'
};

const events = [
    { 
        title: 'Кіносеанс «Film»', 
        category: 'cinema', 
        img: 'placeholder.jpg', 
        date: '2026-10-18' 
    },
    { 
        title: 'EXPERIENCE. Ludovico Einaudi та Max Richter', 
        category: 'concert', 
        img: 'placeholder.jpg', 
        date: '2026-10-15' 
    },
    { 
        title: 'Виступ Романа Скорпіона', 
        category: 'concert', 
        img: 'placeholder.jpg', 
        date: '2026-10-16' 
    },
    { 
        title: 'Концерт гурту OKS', 
        category: 'concert', 
        img: 'placeholder.jpg', 
        date: '2026-10-17' 
    },
];

const reloadBtn = document.querySelector('#reload-btn');

// Функція для отримування даних через API
async function loadEvents() {
    const loadingIndicator = document.querySelector('#loading-indicator');
    const errorMessage = document.querySelector('#error-message');

    try {
        if (reloadBtn) reloadBtn.disabled = true;
        if (errorMessage) {
        errorMessage.hidden = true;
        errorMessage.textContent = '';
        }
        if (loadingIndicator) {
        loadingIndicator.hidden = false;
    }

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

    events.length = 0;
    events.push(...apiEvents);
    renderEvents(events);

    } catch (error) {
        console.error('Технічні деталі помилки:', error);

        if (errorMessage) {
        errorMessage.hidden = false;
        errorMessage.textContent = error.message.includes('Дані про події не знайдено')
            ? 'Дані про події не знайдено'
            : 'Не вдалося завантажити події. Перевірте зʼєднання або спробуйте пізніше.';
        }

        if (listContainer) listContainer.innerHTML = '';
        if (eventsCount) eventsCount.textContent = 'Кількість подій: 0';
    } finally {
        if (loadingIndicator) {
        loadingIndicator.hidden = true;
        }
        if (reloadBtn) reloadBtn.disabled = false;
    }
}

loadEvents();

if (reloadBtn) {
  reloadBtn.addEventListener('click', () => {
    loadEvents();
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const title = event.target.elements.title.value.trim();
  const category = event.target.elements.category.value;
  const date = event.target.elements.date.value;

  const newEvent = {
    id: Date.now(),
    title: title,
    category: category,
    img: 'placeholder.jpg', // Додаємо заглушку для фото, щоб нова картка не ламалася
    date: date
  };

  events.push(newEvent);
  renderEvents(events);
  form.reset();
});

const titleInput = document.querySelector('#event-title');

titleInput.addEventListener('input', () => {
  titleInput.setCustomValidity('');

  const value = titleInput.value.trim();

  if (value.length > 0 && value.length < 3) {
    titleInput.setCustomValidity('Назва події повинна містити щонайменше 3 символи!');
  }
});

titleInput.addEventListener('invalid', () => {
  if (titleInput.validity.valueMissing) {
    titleInput.setCustomValidity('Будь ласка, заповніть це поле!');
  } else if (titleInput.validity.patternMismatch || titleInput.value.trim().length < 3) {
    titleInput.setCustomValidity('Назва події повинна містити щонайменше 3 символи!');
  }
});

const filterContainer = document.querySelector('#category-filter');

filterContainer.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const selectedCategory = button.dataset.category;

  if (selectedCategory === 'all') {
    renderEvents(events);
  } else {
    const filteredEvents = events.filter((item) => item.category === selectedCategory);
    renderEvents(filteredEvents);
  }
});

const listContainer = document.querySelector('#events-list');
const eventsCount = document.querySelector('#events-count');

function parseEventDate(dateString) {
    const dateObj = new Date(dateString);
    const day = dateObj.getDate();
    const month = dateObj.toLocaleDateString('uk-UA', { month: 'long' });
    return { day, month };
}
// Функція для рендерингу подій на сторінці
function renderEvents(eventsList) {
    listContainer.innerHTML = '';

    eventsList.forEach(event => {
        const card = document.createElement('article');
        
        // Додаємо класи та атрибут даних для категорії
        card.classList.add('card', event.category);
        card.dataset.category = event.category;
        // Бейдж категорії події
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
        // Оновлюємо лічильник подій
        if (eventsCount) {
            eventsCount.textContent = `Кількість подій: ${eventsList.length}`;
        }
    });
}

// Функція для відображення подій за категорією
function displayEventsByCategory(eventsList, targetCategory) {
    for (const e of eventsList) {
        if (e.category === targetCategory) {
            console.log(`- ${e.title}`);
        } else {
            continue;
        }
    }
}

displayEventsByCategory(events, 'concert');

// Приймає текст та максимальну довжину n, додає трикрапку, якщо текст довший за ліміт
const shorten = (text, n) => text.length > n ? text.slice(0, n) + '...' : text;

const sampleTitle = events[0].title;
console.log('Оригінальний заголовок:', sampleTitle);
console.log('Скорочений (до 20 символів):', shorten(sampleTitle, 20));
console.log('Скорочений (до 60 символів):', shorten(sampleTitle, 60));