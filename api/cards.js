const { DOMAIN_CONFIG } = require('../js/config.js');
const { saveCard, getCards } = require('../js/cardService.js');

module.exports = async function handler(req, res) {
    // CORS настройка
    res.setHeader('Access-Control-Allow-Origin', DOMAIN_CONFIG.BASE_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const { userId, search, page, limit } = req.query;
            console.log('📋 [cards API] GET request:', { userId, search, page, limit });
            
            // cardService УЖЕ все делает: фильтрует, сортирует, пагинирует
            const result = getCards({ userId, search, page, limit });
            
            return res.status(200).json({
                success: true,
                ...result,  // total, page, limit, cards
                timestamp: Date.now()
            });
        }

        if (req.method === 'POST') {
            const { cardId, cardData } = req.body;
            console.log('💾 [cards API] POST request:', { cardId, cardData: cardData ? 'present' : 'missing' });
            
            // Валидация
            if (!cardId || !cardData) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing cardId or cardData'
                });
            }

            if (!cardData.greetingText || typeof cardData.greetingText !== 'string') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or missing greetingText'
                });
            }

            // Санитизация
            const sanitizedData = {
                ...cardData,
                greetingText: sanitizeInput(cardData.greetingText),
                userName: sanitizeInput(cardData.userName || ''),
                marqueeText: sanitizeInput(cardData.marqueeText || ''),
                ctaButtonText: sanitizeInput(cardData.ctaButtonText || '')
            };

            // Сохранение через cardService
            const result = saveCard(cardId, sanitizedData);
            
            return res.status(200).json({
                success: true,
                ...result
            });
        }

        // Неподдерживаемый метод
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('❌ [cards API] Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Единственная вспомогательная функция
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
