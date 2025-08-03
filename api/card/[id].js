// api/card/[id].js
export default function handler(req, res) {
  const { id } = req.query;
  
  // Пока возвращаем простую HTML страницу
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CardGift - ${id}</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1>Card: ${id}</h1>
      <p>Card viewer coming soon...</p>
      <script>
        // Перенаправляем на card-viewer.html
        window.location.href = '/card-viewer.html?id=${id}';
      </script>
    </body>
    </html>
  `);
}
