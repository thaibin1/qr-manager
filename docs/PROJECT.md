# QR Manager - Quản Lý QR & Tài Khoản

## Mô tả
Trang web quản lý QR code và tài khoản ngân hàng cá nhân. Hỗ trợ tự tạo QR từ thông tin ngân hàng (VietQR) và upload ảnh QR có sẵn.

## Tính năng
- Nhập thông tin tài khoản ngân hàng → Tự tạo mã QR (VietQR API)
- Upload ảnh QR có sẵn (Momo, ZaloPay, custom...)
- Quản lý danh sách: xem, sửa, xoá, tìm kiếm
- Copy QR nhanh để chia sẻ
- Giao diện responsive, dark theme premium

## Tech Stack
- **Frontend**: HTML + Vanilla CSS + Vanilla JS
- **Backend**: Express.js (Node.js)
- **Database**: JSON file (data.json)
- **QR Generation**: VietQR.io Image API
- **Upload**: Multer

## Cài đặt & Chạy
```bash
cd qr-manager
npm install
npm start
```
Mở trình duyệt: http://localhost:3000

## API Endpoints
- `GET /api/accounts` - Lấy danh sách tài khoản
- `POST /api/accounts` - Thêm tài khoản mới
- `PUT /api/accounts/:id` - Cập nhật tài khoản
- `DELETE /api/accounts/:id` - Xoá tài khoản
- `POST /api/upload-qr` - Upload ảnh QR
- `GET /api/banks` - Danh sách ngân hàng VietQR
