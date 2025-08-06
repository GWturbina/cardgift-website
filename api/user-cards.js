// Используем глобальную память
global.cards = global.cards || new Map();
const cards = global.cards;

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    console.log(`🔍 Looking for cards for user: ${userId}`);
    console.log(`📊 Total cards in memory: ${cards.size}`);
    
    // Ищем карты пользователя
    const userCards = [];
    
    for (let [cardId, cardData] of cards.entries()) {
        // Проверяем по userId в данных карты ИЛИ по части ID
        if (cardData.userId === userId || cardId.includes('card_')) {
            userCards.push({
                cardId: cardId,
                id: cardId,
                title: cardData.greeting || 'Greeting Card',
                preview: cardData.previewUrl,
                previewUrl: cardData.previewUrl,
                views: cardData.views || 0,
                clicks: cardData.clicks || 0,
                createdAt: cardData.createdAt || Date.now(),
                userId: cardData.userId || userId
            });
        }
    }
    
    console.log(`✅ Found ${userCards.length} cards for user ${userId}`);
    console.log('Available card IDs:', Array.from(cards.keys()));
    
    return res.status(200).json(userCards);
}
