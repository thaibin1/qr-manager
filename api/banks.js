export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const banks = await response.json();
        return res.json(banks);
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách ngân hàng' });
    }
}
