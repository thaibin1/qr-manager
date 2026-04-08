import cloudinary from './lib/cloudinary.js';
import { connectToDatabase } from './lib/db.js';

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

    try {
        const { image, label, note } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        // Upload to Cloudinary (base64)
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'qr-manager',
            resource_type: 'image',
        });

        const { db } = await connectToDatabase();
        const collection = db.collection('accounts');

        const newAccount = {
            type: 'custom',
            bankCode: '',
            bankBin: '',
            bankName: '',
            bankLogo: '',
            accountNo: '',
            accountName: '',
            defaultAmount: '',
            defaultNote: '',
            qrUrl: '',
            qrImagePath: uploadResult.secure_url,
            cloudinaryId: uploadResult.public_id,
            label: label || 'QR Tùy chỉnh',
            note: note || '',
            createdAt: new Date().toISOString()
        };

        const result = await collection.insertOne(newAccount);
        newAccount._id = result.insertedId;
        newAccount.id = result.insertedId.toString();

        return res.json({ success: true, data: newAccount });
    } catch (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
