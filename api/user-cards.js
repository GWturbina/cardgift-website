// ЗАМЕНИТЬ user-cards.js полностью:
const cards = global.cards || (global.cards = new Map());

export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        console.log('📊 Total cards in system:', cards.size);
        
        const { userId, walletAddress } = req.query;
        console.log('🔍 Looking for cards by userId:', userId, 'wallet:', walletAddress);
        
        // Получаем все карты пользователя
        const userCards = Array.from(cards.entries())
            .filter(([id, data]) => {
                const matchUserId = data.userId === userId;
                const matchWallet = data.walletAddress === walletAddress;
                console.log(`Card ${id}: userId match=${matchUserId}, wallet match=${matchWallet}`);
                return matchUserId || matchWallet;
            })
            .map(([id, data]) => {
                const greeting = data.greetingText?.split('\n')[0] || 'Открытка';
                const title = greeting.length > 50 ? greeting.substring(0, 50) + '...' : greeting;
                
                return {
                    cardId: id,
                    id: id, // Дублируем для совместимости
                    title: title,
                    preview: `https://cardgift.bnb/api/og-image?id=${id}`,
                    previewUrl: `https://cardgift.bnb/api/og-image?id=${id}`,
                    shareUrl: `https://cardgift.bnb/api/save-card?id=${id}`,
                    style: data.style || 'classic',
                    hasMedia: !!(data.backgroundImage || data.videoUrl),
                    views: data.views || 0,
                    clicks: data.clicks || 0,
                    createdAt: data.createdAt || Date.now(),
                    greetingText: data.greetingText || '',
                    userId: data.userId,
                    walletAddress: data.walletAddress
                };
            });

        console.log('📊 Found user cards:', userCards.length);
        userCards.forEach(card => {
            console.log(`  - ${card.cardId}: ${card.title}`);
        });

        // Сортируем по дате создания (новые сначала)
        userCards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        res.status(200).json({
            success: true,
            cards: userCards,
            total: userCards.length,
            userId: userId,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ Error in user-cards:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch user cards',
            cards: [],
            total: 0
        });
    }
}
