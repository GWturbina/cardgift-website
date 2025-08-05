// Используем глобальный объект для хранения
global.cards = global.cards || new Map();
const cards = global.cards;

// ✅ ФУНКЦИЯ ГЕНЕРАЦИИ ПРЕВЬЮ
function generatePreview(cardData) {
    try {
        // Создаем SVG превью (работает без Canvas)
        const greeting = cardData.greeting || 'Поздравительная открытка';
        const lines = greeting.split('\n').filter(l => l.trim());
        const title = lines[0] || 'Персональная открытка';
        const subtitle = lines[1] || 'Создано в CardGift';
        
        // Экранируем текст для SVG
        const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeSubtitle = subtitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Генерируем SVG превью
        const svg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2C3E50;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#34495E;stop-opacity:1" />
                </linearGradient>
            </defs>
            
            <!-- Фон -->
            <rect width="800" height="600" fill="url(#bg)"/>
            
            <!-- Рамка -->
            <rect x="20" y="20" width="760" height="560" fill="none" stroke="#FFD700" stroke-width="4" rx="20"/>
            
            <!-- Иконка -->
            <text x="400" y="150" text-anchor="middle" font-size="80" fill="#FFD700">🎁</text>
            
            <!-- Заголовок -->
            <text x="400" y="250" text-anchor="middle" font-size="48" font-weight="bold" fill="#FFD700" font-family="Arial, sans-serif">
                ${safeTitle.length > 20 ? safeTitle.substring(0, 20) + '...' : safeTitle}
            </text>
            
            <!-- Подзаголовок -->
            <text x="400" y="320" text-anchor="middle" font-size="32" fill="#FFFFFF" font-family="Arial, sans-serif">
                ${safeSubtitle.length > 30 ? safeSubtitle.substring(0, 30) + '...' : safeSubtitle}
            </text>
            
            <!-- Подпись -->
            <text x="400" y="520" text-anchor="middle" font-size="24" fill="#CCC" font-family="Arial, sans-serif">
                Created with CardGift
            </text>
        </svg>`;
        
        // Конвертируем SVG в Data URL
        const svgBase64 = Buffer.from(svg).toString('base64');
        const previewUrl = `data:image/svg+xml;base64,${svgBase64}`;
        
        console.log('✅ SVG превью сгенерировано для карты');
        return previewUrl;
        
    } catch (error) {
        console.error('❌ Ошибка генерации превью:', error);
        
        // Fallback превью
        const fallbackSvg = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
            <rect width="800" height="600" fill="#2C3E50"/>
            <text x="400" y="300" text-anchor="middle" font-size="48" fill="#FFD700" font-family="Arial">🎁 CardGift</text>
            <text x="400" y="350" text-anchor="middle" font-size="24" fill="#FFF" font-family="Arial">Greeting Card</text>
        </svg>`;
        
        const fallbackBase64 = Buffer.from(fallbackSvg).toString('base64');
        return `data:image/svg+xml;base64,${fallbackBase64}`;
    }
}

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
        // ✅ СОХРАНЕНИЕ КАРТЫ С ГЕНЕРАЦИЕЙ ПРЕВЬЮ
        const { cardId, cardData } = body;
        if (!cardId || !cardData) {
            return res.status(400).json({ error: 'Missing cardId or cardData' });
        }
        
        // ✅ ГЕНЕРИРУЕМ ПРЕВЬЮ
        const previewUrl = generatePreview(cardData);
        
        // ✅ ДОБАВЛЯЕМ ПРЕВЬЮ К ДАННЫМ КАРТЫ
        const cardToSave = {
            ...cardData,
            previewUrl: previewUrl,
            thumbnailUrl: previewUrl, // Для совместимости
            createdAt: Date.now(),
            views: 0,
            clicks: 0
        };
        
        // Сохраняем в глобальной памяти
        cards.set(cardId, cardToSave);
        console.log('✅ Карта сохранена с превью:', cardId, 'Всего карт:', cards.size);
        
        return res.json({ 
            success: true, 
            cardId: cardId,
            shareUrl: `${process.env.NEXT_PUBLIC_BASE_URL || `https://${req.headers.host}`}/api/save-card?id=${cardId}&preview=true`,
            previewUrl: previewUrl, // ✅ ВОЗВРАЩАЕМ ПРЕВЬЮ В ГЕНЕРАТОР
            message: 'Card saved successfully',
            totalCards: cards.size
        });
        
    } else if (method === 'GET') {
        const { id, preview } = query;
        
        if (!id) {
            return res.status(400).json({ error: 'Missing card ID' });
        }
        
        const cardData = cards.get(id);
        if (!cardData) {
            console.log('❌ Карта не найдена:', id, 'Доступные:', Array.from(cards.keys()).slice(0, 5));
            
            if (preview === 'true') {
                return res.status(404).send(`
                    <html><body style="text-align:center; margin:50px; font-family:Arial;">
                        <h1>❌ Карта не найдена</h1>
                        <p>ID: ${id}</p>
                        <p>Всего карт в системе: ${cards.size}</p>
                    </body></html>
                `);
            } else {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Card not found',
                    cardId: id,
                    totalCards: cards.size,
                    availableCards: Array.from(cards.keys()).slice(0, 5)
                });
            }
        }
        
        // ✅ УВЕЛИЧИВАЕМ СЧЕТЧИК ПРОСМОТРОВ
        cardData.views = (cardData.views || 0) + 1;
        cards.set(id, cardData); // Обновляем в памяти
        
        if (preview === 'true') {
            // ✅ ГЕНЕРАЦИЯ HTML С ПРЕВЬЮ ДЛЯ МЕССЕНДЖЕРОВ
            const greeting = cardData.greeting || 'Поздравительная открытка';
            const lines = greeting.split('\n').filter(l => l.trim());
            const title = lines[0] || 'Персональная открытка';
            const description = lines[1] || 'Создано специально для вас в CardGift';
            
            // Экранируем HTML
            const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const safeDescription = description.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            
            // ✅ ИСПОЛЬЗУЕМ СГЕНЕРИРОВАННОЕ ПРЕВЬЮ
            const imageUrl = cardData.previewUrl || `https://${req.headers.host}/api/og-image?id=${id}`;
            
            const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="https://${req.headers.host}/card-viewer.html?id=${id}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${imageUrl}">
    <title>${safeTitle}</title>
    
    <!-- ✅ СТИЛИ ДЛЯ КРАСИВОГО ПРЕВЬЮ -->
    <style>
        body { 
            margin: 0; 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #2C3E50, #34495E);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .card-preview {
            text-align: center;
            max-width: 600px;
            padding: 40px;
        }
        .card-icon { font-size: 80px; margin-bottom: 20px; }
        .card-title { font-size: 36px; color: #FFD700; margin-bottom: 15px; }
        .card-description { font-size: 18px; color: #CCC; margin-bottom: 30px; }
        .card-button {
            background: #FFD700;
            color: #000;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            transition: all 0.3s ease;
        }
        .card-button:hover { background: #FFA500; }
    </style>
    
    <script>
        // Автоматическое перенаправление через 3 секунды
        setTimeout(() => {
            window.location.href = "/card-viewer.html?id=${id}";
        }, 3000);
    </script>
</head>
<body>
    <div class="card-preview">
        <div class="card-icon">🎁</div>
        <h1 class="card-title">${safeTitle}</h1>
        <p class="card-description">${safeDescription}</p>
        <a href="/card-viewer.html?id=${id}" class="card-button">
            📱 Открыть открытку
        </a>
        <p style="color:#666; font-size:12px; margin-top: 20px;">
            Автоматическое перенаправление через 3 секунды...<br>
            ID: ${id} | Просмотров: ${cardData.views}
        </p>
    </div>
</body>
</html>`;
            
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(200).send(html);
            
        } else {
            // ✅ ВОЗВРАЩЕНИЕ JSON ДАННЫХ КАРТЫ
            console.log('✅ Карта найдена:', id, 'Просмотров:', cardData.views);
            return res.json({ 
                success: true, 
                data: cardData,
                views: cardData.views,
                previewUrl: cardData.previewUrl
            });
        }
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
}
