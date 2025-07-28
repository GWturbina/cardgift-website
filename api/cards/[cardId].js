export default async function handler(req, res) {
    const { cardId } = req.query;
    
    if (!cardId) {
        return res.status(400).json({ error: 'No card ID' });
    }
    
    // Пытаемся получить данные карты из localStorage через куки или параметры
    // Для упрощения - генерируем базовые мета-теги
    const title = `🎉 Персональная открытка ${cardId.substring(0, 8)}`;
    const description = 'Красивая открытка создана специально для вас в CardGift';
    const imageUrl = `https://${req.headers.host}/api/og-image?id=${cardId}`;
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:url" content="https://${req.headers.host}/cards/${cardId}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <title>${title}</title>
    <script>
        // Перенаправляем на card-viewer через 1 секунду
        setTimeout(() => {
            window.location.href = "/card-viewer.html?id=${cardId}";
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
    res.status(200).send(html);
}
