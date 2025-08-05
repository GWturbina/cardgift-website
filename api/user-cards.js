// Используем глобальный объект для хранения (как в save-card.js)
global.cards = global.cards || new Map();
const cards = global.cards;

export default async function handler(req, res) {
    // ✅ CORS HEADERS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        console.log(`🔍 Searching cards for user: ${userId}`);
        console.log(`📊 Total cards in memory: ${cards.size}`);
        
        // ✅ ПОЛУЧАЕМ ВСЕ КАРТЫ ПОЛЬЗОВАТЕЛЯ ИЗ ГЛОБАЛЬНОЙ ПАМЯТИ
        const userCards = [];
        
        for (let [cardId, cardData] of cards.entries()) {
            // Проверяем принадлежность карты пользователю
            if (cardData.userId === userId || cardId.includes(userId.replace('USER_', ''))) {
                userCards.push({
                    cardId: cardId,
                    id: cardId,
                    title: cardData.greeting?.split('\n')[0] || cardData.title || 'Untitled Card',
                    preview: cardData.previewUrl || cardData.thumbnailUrl,
                    previewUrl: cardData.previewUrl,
                    thumbnailUrl: cardData.previewUrl,
                    views: cardData.views || 0,
                    clicks: cardData.clicks || 0,
                    viewCount: cardData.views || 0,
                    clickCount: cardData.clicks || 0,
                    createdAt: cardData.createdAt || Date.now(),
                    userId: cardData.userId || userId,
                    greeting: cardData.greeting
                });
            }
        }
        
        // Сортируем по дате создания (новые первыми)
        userCards.sort((a, b) => b.createdAt - a.createdAt);
        
        console.log(`✅ Found ${userCards.length} cards for user ${userId}`);
        
        return res.status(200).json(userCards);
        
    } catch (error) {
        console.error('❌ Error fetching user cards:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            totalCards: cards.size
        });
    }
}
