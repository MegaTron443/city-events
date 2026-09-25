const staticCard = document.querySelectorAll('.card');
if (staticCard) {
    staticCard.forEach(card => card.remove());
}

const categoryDictionary = {
    concert: 'Концерт',
    cinema: 'Кіно',
    theatre: 'Театр',
    exhibition: 'Виставка'
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

renderEvents(events);

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