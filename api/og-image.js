const cards = global.cards || (global.cards = new Map());

export default async function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).send('Missing card ID');
    }

    try {
        const cardData = cards.get(id);
        
        if (!cardData) {
            // Возвращаем дефолтное превью
            const defaultSvg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="1200" height="630" fill="url(#bg)"/>
                <text x="600" y="280" text-anchor="middle" fill="white" font-size="48" font-weight="bold">CardGift</text>
                <text x="600" y="350" text-anchor="middle" fill="#FFD700" font-size="32">Открытка не найдена</text>
                <text x="600" y="400" text-anchor="middle" fill="#FFD700" font-size="24">ID: ${id}</text>
            </svg>`;
            
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.status(200).send(defaultSvg);
        }

        // Извлекаем данные карты
        const greeting = cardData.greetingText?.split('\n')[0] || 'Поздравительная открытка';
        const userName = cardData.userName || '';
        const style = cardData.style || 'classic';
        
        // Цвета в зависимости от стиля
        const styleColors = {
            classic: { from: '#FFD700', to: '#FFA500' },
            sunset: { from: '#FF7E5F', to: '#FEB47B' },
            ocean: { from: '#667eea', to: '#764ba2' },
            space: { from: '#2C3E50', to: '#4A6741' }
        };
        
        const colors = styleColors[style] || styleColors.classic;
        
        const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:${colors.from};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${colors.to};stop-opacity:1" />
                </linearGradient>
            </defs>
            <rect width="1200" height="630" fill="url(#bg)"/>
            <text x="600" y="200" text-anchor="middle" fill="white" font-size="64" font-weight="bold">🎉</text>
            <text x="600" y="320" text-anchor="middle" fill="white" font-size="42" font-weight="bold">${greeting.length > 40 ? greeting.substring(0, 40) + '...' : greeting}</text>
            ${userName ? `<text x="600" y="380" text-anchor="middle" fill="#FFD700" font-size="28">Для: ${userName}</text>` : ''}
            <text x="600" y="500" text-anchor="middle" fill="white" font-size="32" font-weight="bold">CardGift</text>
            <text x="600" y="540" text-anchor="middle" fill="#FFD700" font-size="18">Нажмите, чтобы открыть</text>
        </svg>`;

        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).send(svg);

    } catch (error) {
        console.error('OG Image generation error:', error);
        res.status(500).send('Error generating image');
    }
}
