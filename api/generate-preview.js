export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { cardData, previewImage, cardId } = req.body;
        
        console.log('📨 Получены данные карты:', cardId);
        
        // TODO: Здесь сохранить previewImage в облачное хранилище
        // Пока возвращаем base64 как URL
        const previewUrl = `https://${req.headers.host}/preview.html?id=${cardId}&img=${encodeURIComponent(previewImage)}`;
        
        return res.status(200).json({
            success: true,
            imageUrl: previewImage, // Base64 изображение
            shareUrl: previewUrl,
            cardId: cardId
        });
        
    } catch (error) {
        console.error('❌ Ошибка API:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}
