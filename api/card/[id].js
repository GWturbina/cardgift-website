const { DOMAIN_CONFIG } = require('../../js/config.js');
const { getCard } = require('../../js/cardService.js');

module.exports = function handler(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).send(generateErrorPage('Missing card ID'));
    }

    try {
        // Проверяем существование карты
        const card = getCard(id);
        
        if (!card) {
            return res.status(404).send(generateNotFoundPage(id));
        }

        // Генерируем страницу с мета-данными и перенаправлением
        const title = (card.greetingText?.split('\n')[0] || 'Открытка').substring(0, 60);
        const viewerUrl = `${DOMAIN_CONFIG.PAGES.VIEWER}?id=${id}`;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(`<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CardGift - ${escapeHTML(title)}</title>
    
    <!-- Базовые meta теги -->
    <meta name="description" content="Поздравительная открытка - ${escapeHTML(title)}">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${escapeHTML(title)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${DOMAIN_CONFIG.BASE_URL}/api/card/${id}">
    <meta property="og:image" content="${DOMAIN_CONFIG.BASE_URL}${DOMAIN_CONFIG.API.OG_IMAGE}?id=${id}">
    
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
        .card-info {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px auto;
            max-width: 500px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="loading">🎁 Загружается открытка...</div>
    <div class="card-info">
        <h1>${escapeHTML(title)}</h1>
        <p>Перенаправление на просмотр...</p>
    </div>
    
    <script>
        // Мгновенное перенаправление для API эндпоинта
        window.location.href = '${viewerUrl}';
    </script>
</body>
</html>`);

    } catch (error) {
        console.error('❌ [card/id] Error:', error);
        res.status(500).send(generateErrorPage('Internal server error'));
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
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f44336; 
            color: white; 
        }
    </style>
</head>
<body>
    <h1>❌ Ошибка</h1>
    <p>${escapeHTML(message)}</p>
    <script>
        setTimeout(() => {
            window.location.href = '${DOMAIN_CONFIG.PAGES.HOME}';
        }, 3000);
    </script>
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
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #ff9800; 
            color: white; 
        }
    </style>
</head>
<body>
    <h1>🔍 Открытка не найдена</h1>
    <p>Открытка с ID "${escapeHTML(cardId)}" не существует или была удалена.</p>
    <p>Перенаправление на главную страницу...</p>
    <script>
        setTimeout(() => {
            window.location.href = '${DOMAIN_CONFIG.PAGES.HOME}';
        }, 3000);
    </script>
</body>
</html>`;
}

function escapeHTML(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}
