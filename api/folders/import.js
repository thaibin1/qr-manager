import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../lib/db.js';
import crypto from 'crypto';

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
        const { folderId, accountId } = req.body;

        if (!folderId || !accountId) {
            return res.status(400).json({ success: false, message: 'Missing folderId or accountId' });
        }

        const { db } = await connectToDatabase();
        const accountsCollection = db.collection('accounts');
        const foldersCollection = db.collection('folders');

        // Check folder
        let folderObjId;
        try { folderObjId = new ObjectId(folderId); } catch { return res.status(400).json({ success: false, message: 'Invalid folder ID' }); }
        const folder = await foldersCollection.findOne({ _id: folderObjId });
        if (!folder) return res.status(404).json({ success: false, message: 'Folder not found' });

        // Check account
        let accountObjId;
        try { accountObjId = new ObjectId(accountId); } catch { return res.status(400).json({ success: false, message: 'Invalid account ID' }); }
        const account = await accountsCollection.findOne({ _id: accountObjId });
        if (!account) return res.status(404).json({ success: false, message: 'Account not found' });

        // Create image entry
        const imageUrl = account.type === 'bank' ? account.qrUrl : account.qrImagePath;
        const caption = account.type === 'bank' 
            ? `${account.bankName} - ${account.accountNo} ${account.accountName ? '('+account.accountName+')' : ''}`.trim()
            : (account.label || 'QR Tùy chỉnh');

        const imageEntry = {
            id: crypto.randomUUID(),
            filename: account.cloudinaryId || `imported-${account._id}`,
            originalName: account.label || caption,
            path: imageUrl,
            cloudinaryId: account.cloudinaryId || null,
            caption: caption,
            size: 0,
            createdAt: new Date().toISOString()
        };

        // Transfer
        await foldersCollection.updateOne(
            { _id: folderObjId },
            { $push: { images: imageEntry } }
        );
        await accountsCollection.deleteOne({ _id: accountObjId });

        return res.json({ success: true, message: 'Chuyển thành công' });
    } catch (err) {
        console.error('Import error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
