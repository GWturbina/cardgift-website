// Используем глобальный объект для хранения
global.cards = global.cards || new Map();
const cards = global.cards;

export default function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { method, query, body } = req;
    
    if (method === 'POST') {
        // Сохранение карты
        const { cardId, cardData } = body;
        if (!cardId || !cardData) {
            return res.status(400).json({ error: 'Missing cardId or cardData' });
        }
        
        cards.set(cardId, cardData);
        console.log('✅ Карта сохранена на сервере:', cardId, 'Всего карт:', cards.size);
        
        return res.json({ 
            success: true, 
            cardId: cardId,
            message: 'Card saved successfully',
            totalCards: cards.size
        });
        
    } else if (method === 'GET') {
        const { id, preview } = query;
        
        if (!id) {
            return res.status(400).json({ error: 'Missing card ID' });
        }
        
        if (preview === 'true') {
            // Генерация HTML с превью
            const cardData = cards.get(id);
            if (!cardData) {
                return res.status(404).html(`
                    <html><body><h1>Карта не найдена</h1><p>ID: ${id}</p></body></html>
                `);
            }
            
            const greeting = cardData.greeting || 'Поздравительная открытка';
            const lines = greeting.split('\n').filter(l => l.trim());
            const title = lines[0] || 'Персональная открытка';
            const description = lines[1] || 'Создано специально для вас в CardGift';
            
            // Экранируем HTML
            const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeDescription = description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="https://${req.headers.host}/api/og-image?id=${id}">
    <meta property="og:url" content="https://${req.headers.host}/card-viewer.html?id=${id}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="https://${req.headers.host}/api/og-image?id=${id}">
    <title>${safeTitle}</title>
    <script>
        setTimeout(() => {
            window.location.href = "/card-viewer.html?id=${id}";
        }, 1500);
    </script>
</head>
<body>
    <div style="text-align:center; margin:50px; font-family:Arial;">
        <h1>🎁 Загрузка открытки...</h1>
        <p>Перенаправление...</p>
        <p style="color:#666; font-size:12px;">ID: ${id}</p>
    </div>
</body>
</html>`;
            
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } else {
            // Получение данных карты  
            const cardData = cards.get(id);
            console.log('🔍 Поиск карты:', id, 'Найдена:', !!cardData, 'Всего карт:', cards.size);
            
            if (cardData) {
                return res.json({ success: true, data: cardData });
            } else {
                return res.json({ 
                    success: false, 
                    error: 'Card not found',
                    cardId: id,
                    totalCards: cards.size,
                    availableCards: Array.from(cards.keys()).slice(0, 5) // показываем первые 5 для отладки
                });
            }
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
