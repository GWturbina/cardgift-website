import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { cardId, cardData } = req.body;
    
    if (!cardId) {
        return res.status(400).json({ error: 'cardId required' });
    }
    
    console.log('🎨 Creating preview for:', cardId);
    
    // Получаем текст из открытки
    const greeting = cardData?.greeting || 'Поздравительная открытка';
    const lines = greeting.split('\n').filter(l => l.trim());
    const title = lines[0] || 'Поздравительная открытка';
    const description = lines[1] || 'Создано специально для вас в CardGift';
    
    return res.json({
        success: true,
        cardId: cardId,
        title: title,
        description: description,
        shareUrl: `https://${req.headers.host}/cards/${cardId}.html`
    });
}
