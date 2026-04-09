import { connectToDatabase } from './lib/db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { db } = await connectToDatabase();
    const collection = db.collection('folders');

    try {
        // GET - Lấy tất cả folders
        if (req.method === 'GET') {
            const folders = await collection.find({}).sort({ createdAt: -1 }).toArray();
            // Normalize _id to id
            const normalized = folders.map(f => ({ ...f, id: f._id.toString() }));
            return res.json({ success: true, data: normalized });
        }

        // POST - Tạo folder mới
        if (req.method === 'POST') {
            const { name, owner, color } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({ success: false, message: 'Tên folder không được để trống' });
            }

            const newFolder = {
                name: name.trim(),
                owner: (owner || '').trim(),
                color: color || '#7c3aed',
                images: [],
                createdAt: new Date().toISOString()
            };

            const result = await collection.insertOne(newFolder);
            newFolder._id = result.insertedId;
            newFolder.id = result.insertedId.toString();

            return res.json({ success: true, data: newFolder });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (err) {
        console.error('Folders API Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
