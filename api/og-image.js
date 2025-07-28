export default function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'No card ID provided' });
    }
    
    // Генерируем простое SVG изображение для превью
    const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
        </defs>
        
        <!-- Фон -->
        <rect width="1200" height="630" fill="url(#bg)"/>
        
        <!-- Главный текст -->
        <text x="600" y="280" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="64" font-weight="bold">
            🎉 Поздравительная открытка
        </text>
        
        <!-- Подтекст -->
        <text x="600" y="350" text-anchor="middle" fill="#FFD700" font-family="Arial, sans-serif" font-size="32" font-weight="600">
            Создано специально для вас
        </text>
        
        <!-- ID карты -->
        <text x="600" y="420" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="24">
            ID: ${id.substring(0, 12)}...
        </text>
        
        <!-- Логотип -->
        <text x="600" y="520" text-anchor="middle" fill="#FFD700" font-family="Arial, sans-serif" font-size="36" font-weight="bold">
            CardGift
        </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Кеш на 1 час
    res.status(200).send(svg);
}
