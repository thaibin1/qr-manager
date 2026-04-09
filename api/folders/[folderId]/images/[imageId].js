import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../../lib/db.js';
import cloudinary from '../../../lib/cloudinary.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'DELETE') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { folderId, imageId } = req.query;
    if (!folderId || !imageId) {
        return res.status(400).json({ success: false, message: 'Missing folder or image id' });
    }

    let objectId;
    try {
        objectId = new ObjectId(folderId);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid folder id' });
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection('folders');

        const folder = await collection.findOne({ _id: objectId });
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        const image = (folder.images || []).find(img => img.id === imageId);
        if (!image) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }

        // Delete from Cloudinary
        if (image.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(image.cloudinaryId);
            } catch (e) {
                console.error('Cloudinary delete error:', e);
            }
        }

        // Remove image from folder's images array
        await collection.updateOne(
            { _id: objectId },
            { $pull: { images: { id: imageId } } }
        );

        return res.json({ success: true, message: 'Đã xoá ảnh' });
    } catch (err) {
        console.error('Delete image error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
