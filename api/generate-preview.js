const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/previews', express.static('previews'));
app.use('/cards', express.static('cards'));

// Создаем папки если не существуют
async function ensureDirectories() {
    try {
        await fs.mkdir('previews', { recursive: true });
        await fs.mkdir('cards', { recursive: true });
        console.log('✅ Directories created');
    } catch (error) {
        console.log('📁 Directories already exist');
    }
}

// API для генерации превью
app.post('/api/generate-preview', async (req, res) => {
    try {
        const { cardId, cardData, previewImage } = req.body;
        
        if (!cardId) {
            return res.status(400).json({ success: false, error: 'cardId required' });
        }
        
        console.log('🎨 Generating preview for card:', cardId);
        
        let imageUrl = '';
        
        // Сохраняем изображение превью
        if (previewImage && previewImage.startsWith('data:image/')) {
            try {
                const base64Data = previewImage.replace(/^data:image\/\w+;base64,/, '');
                const imageBuffer = Buffer.from(base64Data, 'base64');
                const filename = `previews/${cardId}.jpg`;
                
                await fs.writeFile(filename, imageBuffer);
                imageUrl = `https://${req.headers.host}/previews/${cardId}.jpg`;
                console.log('✅ Preview image saved:', filename);
            } catch (error) {
                console.error('❌ Error saving image:', error);
            }
        }
        
        // Генерируем мета-страницу
        const metaPage = generateMetaPage(cardId, cardData, imageUrl);
        await fs.writeFile(`cards/${cardId}.html`, metaPage);
        console.log('✅ Meta page created');
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            shareUrl: `https://${req.headers.host}/cards/${cardId}.html`,
            cardViewUrl: `https://${req.headers.host}/card-viewer.html?id=${cardId}`
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Генерация HTML страницы с мета-тегами
function generateMetaPage(cardId, cardData, imageUrl) {
    const greeting = cardData?.greeting || 'Поздравительная открытка от CardGift';
    const title = greeting.substring(0, 60).replace(/"/g, '&quot;');
    const description = "Красивая персональная открытка создана с помощью CardGift";
    
    if (!imageUrl) {
        imageUrl = `https://${req.headers.host}/assets/default-preview.jpg`;
    }
    
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://${req.headers.host}/cards/${cardId}.html">
    <meta property="og:site_name" content="CardGift">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <title>${title}</title>
    <style>
        body { 
            margin: 0; 
            background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%); 
            color: #fff; 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px 20px; 
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .loading { 
            font-size: 18px;
            background: rgba(0,0,0,0.8);
            padding: 30px;
            border-radius: 15px;
            border: 2px solid #FFD700;
        }
        .spinner {
            border: 4px solid rgba(255, 215, 0, 0.3);
            border-top: 4px solid #FFD700;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        setTimeout(function() {
            window.location.href = '/card-viewer.html?id=${cardId}';
        }, 2000);
    </script>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <h1>🎁 Загрузка открытки...</h1>
        <p>Перенаправление через 2 секунды...</p>
    </div>
</body>
</html>`;
}

// Запуск сервера
app.listen(PORT, async () => {
    await ensureDirectories();
    console.log(`🚀 Preview API server running on port ${PORT}`);
    console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate-preview`);
});

module.exports = app;
