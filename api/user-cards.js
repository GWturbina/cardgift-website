// ИСПРАВЛЕННАЯ ВЕРСИЯ user-cards.js:
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
        console.log('📊 User-cards API: Total cards in system:', cards.size);
        
        // Вывод первых 5 ключей для диагностики
        const firstKeys = Array.from(cards.keys()).slice(0, 5);
        console.log('🔑 First card keys in global.cards:', firstKeys);
        
        const { userId, walletAddress } = req.query;
        console.log('🔍 Looking for cards by userId:', userId, 'wallet:', walletAddress);
        
        // Проверка структуры global.cards
        if (cards.size === 0) {
            console.warn('⚠️ WARNING: global.cards is empty! Check if save-card.js is using the same storage.');
        }
        
        // Получаем все карты пользователя
        const userCards = Array.from(cards.entries())
            .filter(([id, data]) => {
                // Проверяем соответствие userId или walletAddress
                const matchUserId = data.userId === userId;
                const matchWallet = walletAddress && data.walletAddress === walletAddress;
                console.log(`Card ${id}: userId match=${matchUserId}, wallet match=${matchWallet || 'N/A'}`);
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
                    hasMedia: !!(data.backgroundImage || data.videoUrl || data.mediaUrl),
                    views: data.views || 0,
                    clicks: data.clicks || 0,
                    createdAt: data.createdAt || Date.now(),
                    greetingText: data.greetingText || '',
                    userId: data.userId,
                    walletAddress: data.walletAddress
                };
            });

        console.log('📊 Found user cards:', userCards.length);
        
        if (userCards.length > 0) {
            console.log('📝 Cards details:');
            userCards.forEach(card => {
                console.log(`  - ${card.cardId}: ${card.title}`);
            });
        } else {
            // Проверка наличия ЛЮБЫХ карт у ЛЮБЫХ пользователей
            const allCards = Array.from(cards.entries());
            if (allCards.length > 0) {
                console.log('📝 There are cards in the system, but none for this user. Example card IDs:');
                allCards.slice(0, 3).forEach(([id, data]) => {
                    console.log(`  - ${id} (userId: ${data.userId})`);
                });
            }
        }

        // Сортируем по дате создания (новые сначала)
        userCards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        res.status(200).json({
            success: true,
            cards: userCards,
            total: userCards.length,
            userId: userId,
            cardsInSystem: cards.size, // Добавляем информацию о количестве карт в системе
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
