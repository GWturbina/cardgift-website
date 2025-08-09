import { DOMAIN_CONFIG } from './config.js';

// Глобальное хранилище карт (до подключения БД)
const cards = global.cards || (global.cards = new Map());

/**
 * Сохранение карты (не затирает существующие поля)
 */
function saveCard(cardId, cardData) {
    console.log(`[CardService] saveCard called with ID: ${cardId}`);
    if (!cardId || typeof cardData !== 'object') {
        throw new Error('Missing or invalid cardId/cardData');
    }

    const existing = cards.get(cardId) || {};
    const now = Date.now();

    const newData = {
        ...existing,
        ...cardData,
        createdAt: existing.createdAt || now,
        updatedAt: now,
        views: existing.views || 0,
        clicks: existing.clicks || 0
    };

    cards.set(cardId, newData);

    const result = {
        cardId,
        shareUrl: `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.SAVE_CARD}?id=${cardId}`,
        previewImageUrl: `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.OG_IMAGE}?id=${cardId}`,
        message: 'Card saved successfully'
    };
    console.log(`[CardService] Card saved:`, result);
    return result;
}

/** Получение карты по ID */
function getCard(cardId) {
    console.log(`[CardService] getCard called with ID: ${cardId}`);
    return cards.get(cardId) || null;
}

/** Получение списка карт с фильтрацией и пагинацией */
function getCards({ userId, search, page = 1, limit = 20 } = {}) {
    console.log(`[CardService] getCards called with filters:`, { userId, search, page, limit });
    let result = Array.from(cards.entries()).map(([id, data]) => formatCard(id, data));

    if (userId) {
        result = result.filter(card => card.userId === userId);
    }

    if (search) {
        const searchLower = search.toLowerCase();
        result = result.filter(card =>
            card.title.toLowerCase().includes(searchLower) ||
            card.greetingText.toLowerCase().includes(searchLower)
        );
    }

    const total = result.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginated = result.slice(startIndex, endIndex);

    const response = {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        cards: paginated
    };
    console.log(`[CardService] getCards result:`, response);
    return response;
}

/** Полное форматирование карты */
function formatCard(id, data) {
    const greeting = data.greetingText?.split('\n')[0] || 'Открытка';
    const title = greeting.length > 50 ? greeting.substring(0, 50) + '...' : greeting;

    return {
        cardId: id,
        title,
        preview: `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.OG_IMAGE}?id=${id}`,
        shareUrl: `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.SAVE_CARD}?id=${id}`,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || null,
        views: data.views || 0,
        clicks: data.clicks || 0,
        greetingText: data.greetingText || '',
        userId: data.userId || '',
        actualCreator: data.actualCreator || '',
        style: data.style || 'classic',
        meta: data.meta || {},
        tags: data.tags || []
    };
}

/** Увеличение счетчика просмотров с проверками */
function incrementViews(cardId) {
    console.log(`[CardService] incrementViews called with ID: ${cardId}`);
    if (!cards.has(cardId)) {
        console.warn(`[CardService] incrementViews: Card not found`);
        return false;
    }
    const card = cards.get(cardId);
    card.views = (card.views || 0) + 1;
    cards.set(cardId, card);
    console.log(`[CardService] incrementViews: New views count: ${card.views}`);
    return true;
}

/** Проверка принадлежности к одной команде */
function isInTeam(creatorId, managerId) {
    // Заглушка для будущей реализации
    return false;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saveCard,
        getCard,
        getCards,
        formatCard,
        incrementViews,
        isInTeam
    };
}

// Экспорт для браузера
if (typeof window !== 'undefined') {
    window.CardService = {
        saveCard,
        getCard,
        getCards,
        formatCard,
        incrementViews,
        isInTeam
    };
}
