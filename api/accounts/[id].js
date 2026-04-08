import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Missing account ID' });

    const { db } = await connectToDatabase();
    const collection = db.collection('accounts');

    try {
        let objectId;
        try {
            objectId = new ObjectId(id);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid ID format' });
        }

        // PUT - Cập nhật tài khoản
        if (req.method === 'PUT') {
            const updateData = { ...req.body, updatedAt: new Date().toISOString() };
            // Remove immutable fields
            delete updateData._id;
            delete updateData.id;

            // Regenerate QR URL if bank details changed
            if (updateData.type === 'bank' && updateData.bankBin && updateData.accountNo) {
                let qrUrl = `https://img.vietqr.io/image/${updateData.bankBin}-${updateData.accountNo}-compact2.png`;
                const params = [];
                if (updateData.accountName) params.push(`accountName=${encodeURIComponent(updateData.accountName)}`);
                if (updateData.defaultAmount) params.push(`amount=${encodeURIComponent(updateData.defaultAmount)}`);
                if (updateData.defaultNote) params.push(`addInfo=${encodeURIComponent(updateData.defaultNote)}`);
                if (params.length > 0) {
                    qrUrl += '?' + params.join('&');
                }
                updateData.qrUrl = qrUrl;
            }

            const result = await collection.findOneAndUpdate(
                { _id: objectId },
                { $set: updateData },
                { returnDocument: 'after' }
            );

            if (!result) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
            }

            const updated = result;
            updated.id = updated._id.toString();
            return res.json({ success: true, data: updated });
        }

        // DELETE - Xoá tài khoản
        if (req.method === 'DELETE') {
            const result = await collection.findOneAndDelete({ _id: objectId });

            if (!result) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
            }

            // If custom QR with Cloudinary image, delete from Cloudinary
            if (result.cloudinaryId) {
                try {
                    const cloudinary = (await import('../lib/cloudinary.js')).default;
                    await cloudinary.uploader.destroy(result.cloudinaryId);
                } catch (err) {
                    console.error('Cloudinary delete error:', err);
                }
            }

            return res.json({ success: true, message: 'Đã xoá tài khoản' });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
