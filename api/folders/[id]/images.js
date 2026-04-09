import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../../lib/db.js';
import cloudinary from '../../lib/cloudinary.js';
import crypto from 'crypto';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Missing folder id' });

    let objectId;
    try {
        objectId = new ObjectId(id);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid folder id' });
    }

    try {
        const { image, caption } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        const { db } = await connectToDatabase();
        const collection = db.collection('folders');

        const folder = await collection.findOne({ _id: objectId });
        if (!folder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: `qr-manager/folders/${id}`,
            resource_type: 'image',
        });

        const imageEntry = {
            id: crypto.randomUUID(),
            filename: uploadResult.original_filename,
            originalName: uploadResult.original_filename + '.' + uploadResult.format,
            path: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            caption: (caption || '').trim(),
            size: uploadResult.bytes || 0,
            createdAt: new Date().toISOString()
        };

        // Push image to folder's images array
        await collection.updateOne(
            { _id: objectId },
            { $push: { images: imageEntry } }
        );

        return res.json({ success: true, data: imageEntry });
    } catch (err) {
        console.error('Folder image upload error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
