import { connectToDatabase } from './lib/db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { db } = await connectToDatabase();
    const collection = db.collection('accounts');

    try {
        // GET - Lấy tất cả tài khoản
        if (req.method === 'GET') {
            const accounts = await collection.find({}).sort({ createdAt: -1 }).toArray();
            return res.json({ success: true, data: accounts });
        }

        // POST - Thêm tài khoản mới
        if (req.method === 'POST') {
            const { type, bankCode, bankBin, bankName, bankLogo, accountNo, accountName, defaultAmount, defaultNote, label } = req.body;

            const newAccount = {
                type: type || 'bank',
                bankCode: bankCode || '',
                bankBin: bankBin || '',
                bankName: bankName || '',
                bankLogo: bankLogo || '',
                accountNo: accountNo || '',
                accountName: accountName || '',
                defaultAmount: defaultAmount || '',
                defaultNote: defaultNote || '',
                qrUrl: '',
                qrImagePath: '',
                label: label || '',
                createdAt: new Date().toISOString()
            };

            // Generate VietQR URL for bank accounts
            if (type === 'bank' && bankBin && accountNo) {
                let qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png`;
                const params = [];
                if (accountName) params.push(`accountName=${encodeURIComponent(accountName)}`);
                if (defaultAmount) params.push(`amount=${encodeURIComponent(defaultAmount)}`);
                if (defaultNote) params.push(`addInfo=${encodeURIComponent(defaultNote)}`);
                if (params.length > 0) {
                    qrUrl += '?' + params.join('&');
                }
                newAccount.qrUrl = qrUrl;
            }

            const result = await collection.insertOne(newAccount);
            newAccount._id = result.insertedId;
            newAccount.id = result.insertedId.toString();

            return res.json({ success: true, data: newAccount });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (err) {
        console.error('API Error:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
}
