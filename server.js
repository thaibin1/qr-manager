import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `qr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép file ảnh (JPEG, PNG, GIF, WebP)'));
        }
    }
});

// Data file path
const dataFilePath = path.join(__dirname, 'data.json');

// Helper: Read data
function readData() {
    try {
        const raw = fs.readFileSync(dataFilePath, 'utf-8');
        const data = JSON.parse(raw);
        // Ensure folders array exists
        if (!data.folders) data.folders = [];
        return data;
    } catch (err) {
        return { accounts: [], folders: [] };
    }
}

// Helper: Write data
function writeData(data) {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== API ROUTES ====================

// GET - Danh sách tài khoản
app.get('/api/accounts', (req, res) => {
    const data = readData();
    res.json({ success: true, data: data.accounts });
});

// POST - Thêm tài khoản mới
app.post('/api/accounts', (req, res) => {
    try {
        const data = readData();
        const { type, bankCode, bankBin, bankName, bankLogo, accountNo, accountName, defaultAmount, defaultNote, label } = req.body;

        const newAccount = {
            id: uuidv4(),
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

        data.accounts.push(newAccount);
        writeData(data);

        res.json({ success: true, data: newAccount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST - Upload QR ảnh
app.post('/api/upload-qr', upload.single('qrImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        const data = readData();
        const { label, note } = req.body;

        const newAccount = {
            id: uuidv4(),
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
            qrImagePath: `/uploads/${req.file.filename}`,
            label: label || 'QR Tùy chỉnh',
            note: note || '',
            createdAt: new Date().toISOString()
        };

        data.accounts.push(newAccount);
        writeData(data);

        res.json({ success: true, data: newAccount });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT - Cập nhật tài khoản
app.put('/api/accounts/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.accounts.findIndex(a => a.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        const updated = { ...data.accounts[index], ...req.body, updatedAt: new Date().toISOString() };

        // Regenerate QR URL if bank details changed
        if (updated.type === 'bank' && updated.bankBin && updated.accountNo) {
            let qrUrl = `https://img.vietqr.io/image/${updated.bankBin}-${updated.accountNo}-compact2.png`;
            const params = [];
            if (updated.accountName) params.push(`accountName=${encodeURIComponent(updated.accountName)}`);
            if (updated.defaultAmount) params.push(`amount=${encodeURIComponent(updated.defaultAmount)}`);
            if (updated.defaultNote) params.push(`addInfo=${encodeURIComponent(updated.defaultNote)}`);
            if (params.length > 0) {
                qrUrl += '?' + params.join('&');
            }
            updated.qrUrl = qrUrl;
        }

        data.accounts[index] = updated;
        writeData(data);

        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE - Xoá tài khoản
app.delete('/api/accounts/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.accounts.findIndex(a => a.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
        }

        const removed = data.accounts.splice(index, 1)[0];

        // Delete uploaded file if custom QR
        if (removed.qrImagePath) {
            const filePath = path.join(__dirname, 'public', removed.qrImagePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        writeData(data);
        res.json({ success: true, message: 'Đã xoá tài khoản' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Proxy - Danh sách ngân hàng VietQR
app.get('/api/banks', async (req, res) => {
    try {
        const response = await fetch('https://api.vietqr.io/v2/banks');
        const banks = await response.json();
        res.json(banks);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Không thể tải danh sách ngân hàng' });
    }
});

// ==================== FOLDER API ROUTES ====================

// GET - Danh sách folders
app.get('/api/folders', (req, res) => {
    const data = readData();
    res.json({ success: true, data: data.folders || [] });
});

// POST - Tạo folder mới
app.post('/api/folders', (req, res) => {
    try {
        const data = readData();
        const { name, owner, color } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Tên folder không được để trống' });
        }

        const newFolder = {
            id: uuidv4(),
            name: name.trim(),
            owner: (owner || '').trim(),
            color: color || '#7c3aed',
            images: [],
            createdAt: new Date().toISOString()
        };

        // Ensure folder upload directory exists
        const folderUploadsDir = path.join(uploadsDir, 'folders', newFolder.id);
        if (!fs.existsSync(folderUploadsDir)) {
            fs.mkdirSync(folderUploadsDir, { recursive: true });
        }

        data.folders.push(newFolder);
        writeData(data);

        res.json({ success: true, data: newFolder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT - Cập nhật folder
app.put('/api/folders/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.folders.findIndex(f => f.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        const { name, owner, color } = req.body;
        if (name !== undefined) data.folders[index].name = name.trim();
        if (owner !== undefined) data.folders[index].owner = owner.trim();
        if (color !== undefined) data.folders[index].color = color;
        data.folders[index].updatedAt = new Date().toISOString();

        writeData(data);

        res.json({ success: true, data: data.folders[index] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE - Xoá folder
app.delete('/api/folders/:id', (req, res) => {
    try {
        const data = readData();
        const index = data.folders.findIndex(f => f.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        const removed = data.folders.splice(index, 1)[0];

        // Delete folder upload directory
        const folderUploadsDir = path.join(uploadsDir, 'folders', removed.id);
        if (fs.existsSync(folderUploadsDir)) {
            fs.rmSync(folderUploadsDir, { recursive: true, force: true });
        }

        writeData(data);
        res.json({ success: true, message: 'Đã xoá folder' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST - Upload ảnh vào folder
app.post('/api/folders/:id/images', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn file ảnh' });
        }

        const data = readData();
        const folder = data.folders.find(f => f.id === req.params.id);

        if (!folder) {
            // Clean up uploaded file
            if (req.file && req.file.path) fs.unlinkSync(req.file.path);
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        // Move file to folder-specific directory
        const folderUploadsDir = path.join(uploadsDir, 'folders', folder.id);
        if (!fs.existsSync(folderUploadsDir)) {
            fs.mkdirSync(folderUploadsDir, { recursive: true });
        }

        const newFilePath = path.join(folderUploadsDir, req.file.filename);
        fs.renameSync(req.file.path, newFilePath);

        const imageEntry = {
            id: uuidv4(),
            filename: req.file.filename,
            originalName: req.file.originalname,
            path: `/uploads/folders/${folder.id}/${req.file.filename}`,
            caption: (req.body.caption || '').trim(),
            size: req.file.size,
            createdAt: new Date().toISOString()
        };

        folder.images.push(imageEntry);
        writeData(data);

        res.json({ success: true, data: imageEntry });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE - Xoá ảnh khỏi folder
app.delete('/api/folders/:folderId/images/:imageId', (req, res) => {
    try {
        const data = readData();
        const folder = data.folders.find(f => f.id === req.params.folderId);

        if (!folder) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy folder' });
        }

        const imgIndex = folder.images.findIndex(img => img.id === req.params.imageId);
        if (imgIndex === -1) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ảnh' });
        }

        const removed = folder.images.splice(imgIndex, 1)[0];

        // Delete physical file
        const filePath = path.join(__dirname, 'public', removed.path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        writeData(data);
        res.json({ success: true, message: 'Đã xoá ảnh' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fallback - Serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 QR Manager đang chạy tại http://0.0.0.0:${PORT}`);
});
