const events = [
    { title: 'EXPERIENCE. Ludovico Einaudi та Max Richter', category: 'concert' },
    { title: 'Виступ Романа Скорпіона', category: 'concert' },
    { title: 'Концерт гурту OKS', category: 'concert' },
    { title: 'Кіносеанс «Film»', category: 'cinema' },
];

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