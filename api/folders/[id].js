import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Missing folder id' });

    const { db } = await connectToDatabase();
    const collection = db.collection('folders');

    let objectId;
    try {
        objectId = new ObjectId(id);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid folder id' });
    }

    try {
        // GET - Lấy folder theo id
        if (req.method === 'GET') {
            const folder = await collection.findOne({ _id: objectId });
            if (!folder) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
            }
            folder.id = folder._id.toString();
            return res.json({ success: true, data: folder });
        }

        // PUT - Cập nhật folder
        if (req.method === 'PUT') {
            const { name, owner, color } = req.body;
            const updateFields = { updatedAt: new Date().toISOString() };

            if (name !== undefined) updateFields.name = name.trim();
            if (owner !== undefined) updateFields.owner = owner.trim();
            if (color !== undefined) updateFields.color = color;

            const result = await collection.findOneAndUpdate(
                { _id: objectId },
                { $set: updateFields },
                { returnDocument: 'after' }
            );

            if (!result) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
            }

            const updated = result;
            updated.id = updated._id.toString();
            return res.json({ success: true, data: updated });
        }

        // DELETE - Xoá folder
        if (req.method === 'DELETE') {
            const folder = await collection.findOne({ _id: objectId });
            if (!folder) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
            }

            // Delete images from Cloudinary if any
            if (folder.images && folder.images.length > 0) {
                try {
                    const cloudinary = (await import('../lib/cloudinary.js')).default;
                    for (const img of folder.images) {
                        if (img.cloudinaryId) {
                            await cloudinary.uploader.destroy(img.cloudinaryId);
                        }
                    }
                } catch (e) {
                    console.error('Cloudinary cleanup error:', e);
                }
            }

            await collection.deleteOne({ _id: objectId });
            return res.json({ success: true, message: 'Đã xoá folder' });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (err) {
        console.error('Folder API Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
