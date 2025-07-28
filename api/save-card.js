// Временное хранение карт в памяти (для демо)
const cards = new Map();

export default function handler(req, res) {
    if (req.method === 'POST') {
        // Сохранение карты
        const { cardId, cardData } = req.body;
        cards.set(cardId, cardData);
        
        console.log('✅ Карта сохранена:', cardId);
        return res.json({ success: true });
        
    } else if (req.method === 'GET') {
        // Получение карты
        const { id } = req.query;
        const cardData = cards.get(id);
        
        if (cardData) {
            return res.json({ success: true, data: cardData });
        } else {
            return res.json({ success: false, error: 'Card not found' });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
