// Хранилище карт в памяти
const cards = new Map();

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
        console.log('✅ Карта сохранена:', cardId);
        
        return res.json({ 
            success: true, 
            cardId: cardId,
            message: 'Card saved successfully' 
        });
        
    } else if (method === 'GET') {
        const { id, preview } = query;
        
        if (preview === 'true') {
            // Генерация HTML с превью
            const cardData = cards.get(id);
            const greeting = cardData?.greeting || 'Поздравительная открытка';
            const lines = greeting.split('\n').filter(l => l.trim());
            const title = lines[0] || 'Персональная открытка';
            const description = lines[1] || 'Создано специально для вас в CardGift';
            
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://${req.headers.host}/api/og-image?id=${id}">
    <meta property="og:url" content="https://${req.headers.host}/card-viewer.html?id=${id}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="https://${req.headers.host}/api/og-image?id=${id}">
    <title>${title}</title>
    <script>
        setTimeout(() => {
            window.location.href = "/card-viewer.html?id=${id}";
        }, 1000);
    </script>
</head>
<body>
    <div style="text-align:center; margin:50px; font-family:Arial;">
        <h1>🎁 Загрузка открытки...</h1>
        <p>Перенаправление...</p>
    </div>
</body>
</html>`;
            
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        } else {
            // Получение данных карты  
            const cardData = cards.get(id);
            if (cardData) {
                return res.json({ success: true, data: cardData });
            } else {
                return res.json({ success: false, error: 'Card not found' });
            }
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
