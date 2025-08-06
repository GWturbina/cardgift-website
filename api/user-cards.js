global.cards = global.cards || new Map();

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const allCards = Array.from(global.cards.entries()).map(([id, data]) => ({
        cardId: id,
        title: 'Greeting Card',
        preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzRDQUY1MCIvPjx0ZXh0IHg9IjEwMCIgeT0iNTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIj5DYXJkPC90ZXh0Pjwvc3ZnPg==',
        views: 0,
        clicks: 0,
        createdAt: Date.now()
    }));
    
    return res.json(allCards);
}
