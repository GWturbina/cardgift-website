const { getCard } = require('../js/cardService.js');

module.exports = async function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send(generateErrorSVG('Missing card ID'));
    }

    try {
        const cardData = getCard(id);

        if (!cardData) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=300'); // 5 минут для несуществующих
            return res.status(404).send(generateNotFoundSVG(id));
        }

        // Подготавливаем данные
        const greeting = escapeXML(cardData.greetingText?.split('\n')[0] || 'Поздравительная открытка');
        const userName = escapeXML(cardData.userName || '');
        const style = cardData.style || 'classic';

        // Обрезаем текст если слишком длинный
        const title = greeting.length > 40 ? greeting.substring(0, 40) + '...' : greeting;
        const userText = userName.length > 25 ? userName.substring(0, 25) + '...' : userName;

        // Получаем цвета для стиля
        const colors = getStyleColors(style);

        // Генерируем SVG
        const svg = generateCardSVG(title, userText, colors, style);

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 час для существующих карт
        res.status(200).send(svg);

    } catch (error) {
        console.error('❌ [og-image] Error:', error);
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=60'); // 1 минута для ошибок
        res.status(500).send(generateErrorSVG('Error generating image'));
    }
};

// Генерация основного SVG
function generateCardSVG(title, userName, colors, style) {
    const emoji = getStyleEmoji(style);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
    </filter>
</defs>

<!-- Фон -->
<rect width="1200" height="630" fill="url(#bg)"/>

<!-- Декоративные элементы -->
<circle cx="100" cy="100" r="50" fill="rgba(255,255,255,0.1)"/>
<circle cx="1100" cy="530" r="80" fill="rgba(255,255,255,0.05)"/>
<circle cx="200" cy="500" r="30" fill="rgba(255,255,255,0.1)"/>

<!-- Основной контент -->
<text x="600" y="200" text-anchor="middle" fill="white" font-size="72" font-weight="bold" filter="url(#shadow)">
    ${emoji}
</text>

<text x="600" y="320" text-anchor="middle" fill="white" font-size="42" font-weight="bold" filter="url(#shadow)">
    ${title}
</text>

${userName ? `<text x="600" y="380" text-anchor="middle" fill="#FFD700" font-size="28" font-weight="normal">
    Для: ${userName}
</text>` : ''}

<!-- Брендинг -->
<text x="600" y="500" text-anchor="middle" fill="white" font-size="32" font-weight="bold">
    CardGift
</text>
<text x="600" y="540" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="18">
    Нажмите, чтобы открыть открытку
</text>

<!-- Декоративная рамка -->
<rect x="20" y="20" width="1160" height="590" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="10"/>
</svg>`;
}

// SVG для несуществующей карты
function generateNotFoundSVG(cardId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<defs>
    <linearGradient id="errorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#ee5a52;stop-opacity:1" />
    </linearGradient>
</defs>
<rect width="1200" height="630" fill="url(#errorGrad)"/>
<text x="600" y="250" text-anchor="middle" fill="white" font-size="64" font-weight="bold">🔍</text>
<text x="600" y="350" text-anchor="middle" fill="white" font-size="42" font-weight="bold">Открытка не найдена</text>
<text x="600" y="400" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-size="24">ID: ${escapeXML(cardId)}</text>
<text x="600" y="500" text-anchor="middle" fill="white" font-size="32" font-weight="bold">CardGift</text>
</svg>`;
}

// SVG для ошибки
function generateErrorSVG(message) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#f44336"/>
<text x="600" y="280" text-anchor="middle" fill="white" font-size="64">❌</text>
<text x="600" y="380" text-anchor="middle" fill="white" font-size="36" font-weight="bold">${escapeXML(message)}</text>
</svg>`;
}

// Цвета для стилей
function getStyleColors(style) {
    const styles = {
        classic: { from: '#FFD700', to: '#FFA500' },
        sunset: { from: '#FF7E5F', to: '#FEB47B' },
        ocean: { from: '#667eea', to: '#764ba2' },
        space: { from: '#2C3E50', to: '#4A6741' },
        forest: { from: '#134E5E', to: '#71B280' },
        fire: { from: '#F2994A', to: '#F2C94C' }
    };
    return styles[style] || styles.classic;
}

// Эмодзи для стилей
function getStyleEmoji(style) {
    const emojis = {
        classic: '🎉',
        sunset: '🌅', 
        ocean: '🌊',
        space: '🌌',
        forest: '🌲',
        fire: '🔥'
    };
    return emojis[style] || '🎁';
}

// Экранирование XML символов
function escapeXML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
