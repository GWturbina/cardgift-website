export default async function handler(req, res) {
    const { id } = req.query;
    
    if (!id) {
        return res.status(400).json({ error: 'No card ID' });
    }
    
    // Здесь будем получать данные карты и генерировать HTML с мета-тегами
    const title = `🎉 Персональная открытка ${id.substring(0, 8)}`;
    const description = 'Красивая открытка создана специально для вас в CardGift';
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="https://${req.headers.host}/api/og-image?id=${id}">
    <script>
        window.location.href = "/card-viewer.html?id=${id}";
    </script>
</head>
<body><p>Перенаправление...</p></body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
}
