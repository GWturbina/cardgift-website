// Используем глобальный объект для хранения
const cards = global.cards || (global.cards = new Map());

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'POST') {
            const { cardId, cardData } = req.body;
            
            if (!cardId || !cardData) {
                return res.status(400).json({ error: 'Missing cardId or cardData' });
            }

            console.log('💾 Saving card:', cardId, 'for user:', cardData.userId);

            // Сохраняем карту с полными данными
            cards.set(cardId, {
                ...cardData,
                createdAt: Date.now(),
                views: 0,
                clicks: 0
            });

            // ✅ ДОБАВЛЕНА ПРОВЕРКА СОХРАНЕНИЯ:
            console.log('💾 Card saved:', cardId);
            console.log('📊 Total cards after save:', cards.size);
            console.log('🔍 Can retrieve:', !!cards.get(cardId));

            const shareUrl = `https://cardgift.bnb/api/save-card?id=${cardId}`;
            const previewUrl = `https://cardgift.bnb/api/og-image?id=${cardId}`;

            res.status(200).json({
                success: true,
                cardId: cardId,
                shareUrl: shareUrl,
                previewImageUrl: previewUrl,
                message: 'Card saved successfully'
            });

        } else if (req.method === 'GET') {
            const { id } = req.query;
            
            if (!id) {
                return res.status(400).send('Missing card ID');
            }

            const cardData = cards.get(id);
            
            if (!cardData) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Карта не найдена</title>
                        <script>
                            setTimeout(() => {
                                window.location.href = '/card-viewer.html?id=${id}';
                            }, 2000);
                        </script>
                    </head>
                    <body>
                        <h1>Карта не найдена, перенаправление...</h1>
                    </body>
                    </html>
                `);
            }

            // Увеличиваем счетчик просмотров
            cardData.views = (cardData.views || 0) + 1;
            cards.set(id, cardData);

            const title = cardData.greetingText?.split('\n')[0] || 'Поздравительная открытка';
            const description = cardData.greetingText?.split('\n').slice(1).join(' ') || 'Создано в CardGift';
            const imageUrl = `https://cardgift.bnb/api/og-image?id=${id}`;
            const pageUrl = `https://cardgift.bnb/api/save-card?id=${id}`;

            // Возвращаем HTML с мета-тегами и автопереадресацией
            res.setHeader('Content-Type', 'text/html');
            res.status(200).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${title}</title>
                    <meta name="description" content="${description}">
                    
                    <!-- Open Graph -->
                    <meta property="og:title" content="${title}">
                    <meta property="og:description" content="${description}">
                    <meta property="og:image" content="${imageUrl}">
                    <meta property="og:image:width" content="1200">
                    <meta property="og:image:height" content="630">
                    <meta property="og:url" content="${pageUrl}">
                    <meta property="og:type" content="website">
                    
                    <!-- Twitter -->
                    <meta name="twitter:card" content="summary_large_image">
                    <meta name="twitter:title" content="${title}">
                    <meta name="twitter:description" content="${description}">
                    <meta name="twitter:image" content="${imageUrl}">
                    
                    <script>
                        // Автопереадресация через 1 секунду
                        setTimeout(() => {
                            window.location.href = '/card-viewer.html?id=${id}';
                        }, 1000);
                    </script>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px; 
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .loading { font-size: 24px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="loading">🎁 Открывается ваша открытка...</div>
                    <h1>${title}</h1>
                    <p>${description}</p>
                </body>
                </html>
            `);
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
