
const { DOMAIN_CONFIG } = require('../js/config.js');
const { saveCard, getCard, incrementViews } = require('../js/cardService.js');

module.exports = async function handler(req, res) {
    // CORS настройки
    res.setHeader('Access-Control-Allow-Origin', DOMAIN_CONFIG.BASE_URL);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'POST') {
            const { cardId, cardData } = req.body;
            console.log('💾 [save-card] POST request:', { cardId, cardData: cardData ? 'present' : 'missing' });
            
            if (!cardId || !cardData) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing cardId or cardData' 
                });
            }
            
            const result = saveCard(cardId, cardData);
            return res.status(200).json({
                success: true,
                ...result
            });
        }

        if (req.method === 'GET') {
            const { id } = req.query;
            console.log('🔍 [save-card] GET request for card:', id);
            
            if (!id) {
                return res.status(400).send(generateErrorPage('Missing card ID'));
            }

            const card = getCard(id);
            if (!card) {
                return res.status(404).send(generateNotFoundPage(id));
            }

            // Увеличиваем счетчик просмотров
            incrementViews(id);

            // Подготавливаем данные для meta тегов
            const title = (card.greetingText?.split('\n')[0] || 'Поздравительная открытка').substring(0, 60);
            const description = (card.greetingText?.split('\n').slice(1).join(' ') || 'Создано в CardGift').substring(0, 160);
            const imageUrl = `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.OG_IMAGE}?id=${id}`;
            const pageUrl = `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.SAVE_CARD}?id=${id}`;
            const viewerUrl = `${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.PAGES.VIEWER}?id=${id}`;

            const html = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="CardGift">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            margin: 0;
        }
        .loading { 
            font-size: 24px; 
            margin: 20px 0; 
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .card-preview {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="loading">🎁 Открывается ваша открытка...</div>
    <div class="card-preview">
        <h1>${title}</h1>
        <p>${description}</p>
    </div>
    <script>
        // Красивое перенаправление с задержкой
        setTimeout(() => {
            window.location.href = '${viewerUrl}';
        }, 1000);
    </script>
</body>
</html>`;

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(html);
        }

        return res.status(405).json({ 
            success: false,
            error: 'Method not allowed' 
        });
        
    } catch (error) {
        console.error('❌ [save-card] Error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Internal server error' 
        });
    }
};

// Вспомогательные функции
function generateErrorPage(message) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Ошибка - CardGift</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f44336; color: white; }
    </style>
</head>
<body>
    <h1>❌ Ошибка</h1>
    <p>${message}</p>
    <script>setTimeout(() => window.location.href = '${DOMAIN_CONFIG.PAGES.HOME}', 3000);</script>
</body>
</html>`;
}

function generateNotFoundPage(cardId) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Открытка не найдена - CardGift</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ff9800; color: white; }
    </style>
</head>
<body>
    <h1>🔍 Открытка не найдена</h1>
    <p>Открытка с ID "${cardId}" не существует или была удалена.</p>
    <script>setTimeout(() => window.location.href = '${DOMAIN_CONFIG.PAGES.HOME}', 3000);</script>
</body>
</html>`;
}
