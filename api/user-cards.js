// /api/user-cards.js
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'cardgift';

let cachedClient = null;

async function connectToDatabase() {
    if (cachedClient) {
        return cachedClient;
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    cachedClient = client;
    return client;
}

export default async function handler(req, res) {
    // ✅ CORS HEADERS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        // ✅ ПОДКЛЮЧАЕМСЯ К БАЗЕ ДАННЫХ
        const client = await connectToDatabase();
        const db = client.db(DATABASE_NAME);
        const collection = db.collection('cards');
        
        // ✅ ПОЛУЧАЕМ КАРТЫ ПОЛЬЗОВАТЕЛЯ
        const cards = await collection.find({ 
            userId: userId 
        }).sort({ 
            createdAt: -1 
        }).toArray();
        
        // ✅ ФОРМАТИРУЕМ ДАННЫЕ ДЛЯ DASHBOARD
        const formattedCards = cards.map(card => ({
            cardId: card.cardId,
            id: card.cardId,
            title: card.title || 'Untitled Card',
            preview: card.previewUrl || card.thumbnailUrl,
            previewUrl: card.previewUrl,
            thumbnailUrl: card.thumbnailUrl,
            views: card.views || 0,
            clicks: card.clicks || 0,
            viewCount: card.views || 0,
            clickCount: card.clicks || 0,
            createdAt: card.createdAt,
            userId: card.userId
        }));
        
        console.log(`✅ Found ${formattedCards.length} cards for user ${userId}`);
        
        return res.status(200).json(formattedCards);
        
    } catch (error) {
        console.error('❌ Error fetching user cards:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
