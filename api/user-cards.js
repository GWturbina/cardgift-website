const { DOMAIN_CONFIG } = require('../js/config.js');
const { getCard, formatCard } = require('../js/cardService.js');

// Глобальное хранилище карт
const cards = global.cards || (global.cards = new Map());

module.exports = function handler(req, res) {
    // CORS настройки
    res.setHeader('Access-Control-Allow-Origin', DOMAIN_CONFIG.BASE_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('📊 Total cards in system:', cards.size);
        
        const { userId, walletAddress, level, countOnly } = req.query;
        const userLevel = parseInt(level) || 0;
        
        console.log('🔍 Looking for cards:', { userId, userLevel, walletAddress, countOnly });
        
        let userCards = [];
        
        if (userLevel === 6) {
            // AUTHOR - видит ВСЕ карты в системе
            userCards = Array.from(cards.entries()).map(([id, data]) => ({
                ...formatCard(id, data),
                isOwner: data.userId === userId || data.actualCreator === userId
            }));
            console.log('👑 AUTHOR access - showing ALL cards:', userCards.length);
            
        } else if (userLevel === 5) {
            // MANAGER - видит свои + команды
            userCards = Array.from(cards.entries())
                .filter(([id, data]) => {
                    return data.userId === userId || 
                           data.actualCreator === userId ||
                           isInTeam(data.actualCreator, userId);
                })
                .map(([id, data]) => formatCard(id, data));
            console.log('👔 MANAGER access - own + team cards:', userCards.length);
            
        } else {
            // USER, MINI_ADMIN, ADMIN, SUPER_ADMIN, GUEST - только свои
            userCards = Array.from(cards.entries())
                .filter(([id, data]) => {
                    const matchUserId = data.userId === userId;
                    const matchCreator = data.actualCreator === userId;
                    const matchWallet = data.walletAddress === walletAddress;
                    
                    console.log(`Card ${id}:`, {
                        userId: data.userId,
                        actualCreator: data.actualCreator,
                        walletAddress: data.walletAddress,
                        matchUserId,
                        matchCreator,
                        matchWallet
                    });
                    
                    return matchUserId || matchCreator || matchWallet;
                })
                .map(([id, data]) => formatCard(id, data));
            console.log('👤 USER access - own cards only:', userCards.length);
        }
        
        // Если запрашивается только количество
        if (countOnly === 'true') {
            return res.status(200).json({
                success: true,
                total: userCards.length
            });
        }
        
        // Сортируем по дате создания (новые сначала)
        userCards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        // Логируем каждую найденную карту
        userCards.forEach((card, index) => {
            console.log(`Found card ${index + 1}:`, {
                id: card.cardId,
                title: card.title?.substring(0, 30) + '...',
                userId: card.userId,
                actualCreator: card.actualCreator
            });
        });

        res.status(200).json({
            success: true,
            cards: userCards,
            total: userCards.length,
            userLevel: userLevel,
            userId: userId,
            cardsInSystem: cards.size,
            accessType: getAccessType(userLevel),
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('❌ Error in user-cards:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch user cards',
            cards: [],
            total: 0,
            cardsInSystem: 0
        });
    }
};

// Вспомогательные функции
function isInTeam(creatorId, managerId) {
    // Логика проверки команды - упрощенная версия
    // В реальности здесь будет проверка реферальной структуры
    return false; // Заглушка
}

function getAccessType(level) {
    if (level === 6) return 'AUTHOR_ALL';
    if (level === 5) return 'MANAGER_TEAM';
    return 'USER_OWN';
}
