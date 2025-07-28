export default function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'No card ID provided' });
    }
    
    // Генерируем мета-теги для превью
    const title = `🎉 Персональная открытка ${id.substring(0, 8)}`;
    const description = 'Красивая открытка создана специально для вас в CardGift';
    const imageUrl = `https://${req.headers.host}/api/og-image?id=${id}`;
    const cardUrl = `https://${req.headers.host}/card-viewer.html?id=${id}`;
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${imageUrl}">
        <meta property="og:url" content="${cardUrl}">
        <meta property="og:type" content="website">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${imageUrl}">
        <script>
            window.location.href = "/card-viewer.html?id=${id}";
        </script>
    </head>
    <body>
        <p>Перенаправление...</p>
    </body>
    </html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
