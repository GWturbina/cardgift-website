const cards = global.cards || (global.cards = new Map());

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const allCards = Array.from(cards.entries()).map(([id, data]) => {
            const greeting = data.greetingText?.split('\n')[0] || 'Открытка';
            const title = greeting.length > 50 ? greeting.substring(0, 50) + '...' : greeting;
            
            return {
                cardId: id,
                title: title,
                preview: `https://cardgift.bnb/api/og-image?id=${id}`,
                shareUrl: `https://cardgift.bnb/api/save-card?id=${id}`,
                style: data.style || 'classic',
                hasMedia: !!(data.backgroundImage || data.videoUrl),
                views: data.views || 0,
                clicks: data.clicks || 0,
                createdAt: data.createdAt || Date.now()
            };
        });

        // Сортируем по дате создания (новые сначала)
        allCards.sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({
            success: true,
            cards: allCards,
            total: allCards.length
        });

    } catch (error) {
        console.error('Error fetching user cards:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch cards' 
        });
    }
}
