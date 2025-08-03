// api/cards.js
export default function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // Обработка сохранения карты
    const { cardId, cardData, preview } = req.body;
    
    // Здесь пока просто возвращаем успех
    // В будущем можно добавить реальное сохранение в БД
    res.status(200).json({
      success: true,
      cardId: cardId,
      message: 'Card saved successfully',
      totalCards: 1
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
