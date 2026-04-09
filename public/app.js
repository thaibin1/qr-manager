// ============================================
//  QR MANAGER - Frontend Application
// ============================================

// Vietnamese diacritics removal for accent-insensitive search
// Comprehensive mapping: handles all Vietnamese characters (ơ, ư, ă, â, ê, ô + 6 tones)
const VN_DIACRITICS_MAP = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a',
    'ă':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a',
    'è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e',
    'ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o',
    'ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o',
    'ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u',
    'ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y',
    'đ':'d',
    'À':'A','Á':'A','Ả':'A','Ã':'A','Ạ':'A',
    'Ă':'A','Ằ':'A','Ắ':'A','Ẳ':'A','Ẵ':'A','Ặ':'A',
    'Â':'A','Ầ':'A','Ấ':'A','Ẩ':'A','Ẫ':'A','Ậ':'A',
    'È':'E','É':'E','Ẻ':'E','Ẽ':'E','Ẹ':'E',
    'Ê':'E','Ề':'E','Ế':'E','Ể':'E','Ễ':'E','Ệ':'E',
    'Ì':'I','Í':'I','Ỉ':'I','Ĩ':'I','Ị':'I',
    'Ò':'O','Ó':'O','Ỏ':'O','Õ':'O','Ọ':'O',
    'Ô':'O','Ồ':'O','Ố':'O','Ổ':'O','Ỗ':'O','Ộ':'O',
    'Ơ':'O','Ờ':'O','Ớ':'O','Ở':'O','Ỡ':'O','Ợ':'O',
    'Ù':'U','Ú':'U','Ủ':'U','Ũ':'U','Ụ':'U',
    'Ư':'U','Ừ':'U','Ứ':'U','Ử':'U','Ữ':'U','Ự':'U',
    'Ỳ':'Y','Ý':'Y','Ỷ':'Y','Ỹ':'Y','Ỵ':'Y',
    'Đ':'D'
};

function removeDiacritics(str) {
    return str.replace(/[^\x00-\x7F]/g, ch => VN_DIACRITICS_MAP[ch] || ch);
}

// State
let accounts = [];
let banks = [];
let currentFilter = 'all';
let deleteTargetId = null;
let currentViewAccount = null;

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    loadBanks();
    loadAccounts();
    loadFolders();
});

// ============ API CALLS ============
async function loadBanks() {
    try {
        const res = await fetch('/api/banks');
        const data = await res.json();
        if (data.code === '00' && data.data) {
            // Sort by popularity (transferSupported first), then alphabetically
            banks = data.data
                .filter(b => b.transferSupported === 1)
                .sort((a, b) => a.shortName.localeCompare(b.shortName));
            populateBankSelects();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách ngân hàng:', err);
        showToast('Không thể tải danh sách ngân hàng', 'error');
    }
}

async function loadAccounts() {
    try {
        const res = await fetch('/api/accounts');
        const data = await res.json();
        if (data.success) {
            // Normalize _id to id for compatibility
            accounts = data.data.map(a => ({ ...a, id: a.id || a._id }));
            renderAccounts();
            updateStats();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách tài khoản:', err);
        showToast('Không thể tải dữ liệu', 'error');
    }
}

async function addAccount(payload) {
    try {
        const res = await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            data.data.id = data.data.id || data.data._id;
            accounts.push(data.data);
            renderAccounts();
            updateStats();
            showToast('Đã thêm tài khoản thành công!', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi thêm tài khoản', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

async function uploadQR(payload) {
    try {
        const res = await fetch('/api/upload-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            data.data.id = data.data.id || data.data._id;
            accounts.push(data.data);
            renderAccounts();
            updateStats();
            showToast('Upload QR thành công!', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi upload', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

async function updateAccount(id, payload) {
    try {
        const res = await fetch(`/api/accounts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            data.data.id = data.data.id || data.data._id;
            const index = accounts.findIndex(a => a.id === id);
            if (index !== -1) accounts[index] = data.data;
            renderAccounts();
            updateStats();
            showToast('Đã cập nhật thành công!', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi cập nhật', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

async function deleteAccount(id) {
    try {
        const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            accounts = accounts.filter(a => a.id !== id);
            renderAccounts();
            updateStats();
            showToast('Đã xoá tài khoản', 'success');
        } else {
            showToast(data.message || 'Lỗi xoá', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
    }
}

// ============ RENDER ============
function renderAccounts() {
    const grid = document.getElementById('cards-grid');
    const emptyState = document.getElementById('empty-state');
    const searchTerm = removeDiacritics(document.getElementById('search-input').value.toLowerCase().trim());

    let filtered = accounts;

    // Filter by type
    if (currentFilter === 'bank') {
        filtered = filtered.filter(a => a.type === 'bank');
    } else if (currentFilter === 'custom') {
        filtered = filtered.filter(a => a.type === 'custom');
    }

    // Search (accent-insensitive Vietnamese)
    if (searchTerm) {
        filtered = filtered.filter(a => {
            const searchFields = [
                a.bankName, a.accountNo, a.accountName,
                a.label, a.note, a.bankCode
            ].filter(Boolean).map(s => removeDiacritics(s.toLowerCase()));
            return searchFields.some(f => f.includes(searchTerm));
        });
    }

    if (filtered.length === 0 && accounts.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <p style="font-size: 1.1rem; font-weight: 500;">Không tìm thấy kết quả</p>
                <p style="font-size: 0.85rem; margin-top: 6px; color: var(--text-muted);">Thử tìm kiếm với từ khoá khác</p>
            </div>
        `;
        return;
    }

    // Sort: newest first
    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = sorted.map((account, i) => {
        if (account.type === 'bank') {
            return renderBankCard(account, i);
        } else {
            return renderCustomCard(account, i);
        }
    }).join('');
}

function renderBankCard(account, index) {
    const qrSrc = account.qrUrl || `https://img.vietqr.io/image/${account.bankBin}-${account.accountNo}-compact2.png`;
    const logoSrc = account.bankLogo || '';

    return `
        <div class="account-card" style="animation-delay: ${index * 0.05}s" data-id="${account.id}">
            <span class="card-badge bank">Ngân hàng</span>
            <div class="card-qr-section" onclick="viewQR('${account.id}')">
                <img class="card-qr-img" src="${qrSrc}" alt="QR ${account.bankName}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%221%22%3E%3Crect x=%223%22 y=%223%22 width=%227%22 height=%227%22/%3E%3Crect x=%2214%22 y=%223%22 width=%227%22 height=%227%22/%3E%3Crect x=%223%22 y=%2214%22 width=%227%22 height=%227%22/%3E%3Crect x=%2214%22 y=%2214%22 width=%227%22 height=%227%22/%3E%3C/svg%3E'">
            </div>
            <div class="card-info">
                ${account.accountName ? `
                    <div class="card-holder-name">
                        <svg class="card-holder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        ${account.accountName}
                    </div>
                ` : ''}
                ${logoSrc ? `
                    <div class="card-bank-row">
                        <img class="card-bank-logo" src="${logoSrc}" alt="${account.bankName}" onerror="this.style.display='none'">
                        <span class="card-bank-name">${account.bankName || account.bankCode}</span>
                    </div>
                ` : ''}
                <div class="card-account-no">
                    <span class="card-stk-label">STK:</span>
                    ${formatAccountNo(account.accountNo)}
                </div>
                ${account.label ? `<span class="card-label">${account.label}</span>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-icon view" onclick="viewQR('${account.id}')" title="Xem QR lớn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-icon copy" onclick="copyAccountNo('${account.accountNo}')" title="Copy STK">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="btn-icon edit" onclick="openEditModal('${account.id}')" title="Chỉnh sửa">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon delete" onclick="openDeleteModal('${account.id}')" title="Xoá">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `;
}

function renderCustomCard(account, index) {
    const imgSrc = account.qrImagePath || '';

    return `
        <div class="account-card" style="animation-delay: ${index * 0.05}s" data-id="${account.id}">
            <span class="card-badge custom">Upload</span>
            <div class="card-qr-section" onclick="viewQR('${account.id}')">
                <img class="card-qr-img" src="${imgSrc}" alt="QR ${account.label}" loading="lazy"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239ca3af%22 stroke-width=%221%22%3E%3Crect x=%223%22 y=%223%22 width=%227%22 height=%227%22/%3E%3Crect x=%2214%22 y=%223%22 width=%227%22 height=%227%22/%3E%3Crect x=%223%22 y=%2214%22 width=%227%22 height=%227%22/%3E%3Crect x=%2214%22 y=%2214%22 width=%227%22 height=%227%22/%3E%3C/svg%3E'">
            </div>
            <div class="card-info">
                <div class="card-custom-label">${account.label || 'QR Tùy chỉnh'}</div>
                ${account.note ? `<div class="card-custom-note">${account.note}</div>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn-icon view" onclick="viewQR('${account.id}')" title="Xem QR lớn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-icon copy" onclick="copyQRImageLink('${account.id}')" title="Copy link ảnh">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="btn-icon edit" onclick="openEditModal('${account.id}')" title="Chỉnh sửa">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon delete" onclick="openDeleteModal('${account.id}')" title="Xoá">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `;
}

// ============ STATS ============
function updateStats() {
    document.getElementById('stat-total-value').textContent = accounts.length;
    document.getElementById('stat-bank-value').textContent = accounts.filter(a => a.type === 'bank').length;
    document.getElementById('stat-custom-value').textContent = accounts.filter(a => a.type === 'custom').length;
}

// ============ BANK SELECT ============
function populateBankSelects() {
    const selects = ['bank-select', 'edit-bank-select'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep the first default option
        const defaultOption = select.querySelector('option');
        select.innerHTML = '';
        select.appendChild(defaultOption);

        banks.forEach(bank => {
            const option = document.createElement('option');
            option.value = JSON.stringify({ code: bank.code, bin: bank.bin, name: bank.shortName, logo: bank.logo });
            option.textContent = `${bank.shortName} - ${bank.name}`;
            select.appendChild(option);
        });
    });
}

function onBankChange() {
    const select = document.getElementById('bank-select');
    const logoPreview = document.getElementById('bank-logo-preview');
    if (select.value) {
        try {
            const bank = JSON.parse(select.value);
            logoPreview.src = bank.logo;
            logoPreview.style.display = 'block';
        } catch { logoPreview.style.display = 'none'; }
    } else {
        logoPreview.style.display = 'none';
    }
}

function onEditBankChange() {
    const select = document.getElementById('edit-bank-select');
    // Just for tracking, no logo preview in edit mode
}

// ============ MODAL MANAGEMENT ============
function openModal(type) {
    if (type === 'add') {
        document.getElementById('modal-add').classList.add('active');
        document.getElementById('form-add-account').reset();
        document.getElementById('bank-logo-preview').style.display = 'none';
        document.getElementById('qr-preview').style.display = 'none';
        document.getElementById('modal-add-title').textContent = 'Thêm Tài Khoản Ngân Hàng';
    } else if (type === 'upload') {
        document.getElementById('modal-upload').classList.add('active');
        document.getElementById('form-upload-qr').reset();
        document.getElementById('upload-preview-img').style.display = 'none';
        document.getElementById('upload-placeholder').style.display = 'block';
    }
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function closeModalOnOverlay(event, modalId) {
    if (event.target === event.currentTarget) {
        closeModal(modalId);
    }
}

// ============ ADD ACCOUNT ============
async function handleAddAccount(e) {
    e.preventDefault();
    const bankSelect = document.getElementById('bank-select');
    const submitBtn = document.getElementById('btn-submit-add');

    if (!bankSelect.value) {
        showToast('Vui lòng chọn ngân hàng', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang lưu...';

    try {
        const bank = JSON.parse(bankSelect.value);
        const payload = {
            type: 'bank',
            bankCode: bank.code,
            bankBin: bank.bin,
            bankName: bank.name,
            bankLogo: bank.logo,
            accountNo: document.getElementById('account-no').value.trim(),
            accountName: document.getElementById('account-name').value.trim().toUpperCase(),
            defaultAmount: document.getElementById('default-amount').value.trim(),
            defaultNote: document.getElementById('default-note').value.trim(),
            label: document.getElementById('label').value.trim()
        };

        const success = await addAccount(payload);
        if (success) {
            closeModal('modal-add');
        }
    } catch (err) {
        showToast('Lỗi xử lý dữ liệu', 'error');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Lưu';
}

// ============ UPLOAD QR ============
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) showUploadPreview(file);
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        document.getElementById('qr-file-input').files = e.dataTransfer.files;
        showUploadPreview(file);
    } else {
        showToast('Vui lòng chọn file ảnh', 'error');
    }
}

function showUploadPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('upload-preview-img');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('upload-placeholder').style.display = 'none';
    };
    reader.readAsDataURL(file);
}

async function handleUploadQR(e) {
    e.preventDefault();
    const fileInput = document.getElementById('qr-file-input');
    const submitBtn = document.getElementById('btn-submit-upload');

    if (!fileInput.files[0]) {
        showToast('Vui lòng chọn file ảnh QR', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang upload...';

    // Convert file to base64 for Cloudinary
    const file = fileInput.files[0];
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });

    const payload = {
        image: base64,
        label: document.getElementById('upload-label').value.trim(),
        note: document.getElementById('upload-note').value.trim()
    };

    const success = await uploadQR(payload);
    if (success) {
        closeModal('modal-upload');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload';
}

// ============ EDIT ACCOUNT ============
function openEditModal(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    const editBankFields = document.getElementById('edit-bank-fields');
    document.getElementById('edit-id').value = account.id;
    document.getElementById('edit-type').value = account.type;

    if (account.type === 'bank') {
        editBankFields.style.display = 'block';

        // Set bank select
        const editBankSelect = document.getElementById('edit-bank-select');
        const options = editBankSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value) {
                try {
                    const bank = JSON.parse(opt.value);
                    if (bank.code === account.bankCode) {
                        opt.selected = true;
                    }
                } catch {}
            }
        });

        document.getElementById('edit-account-no').value = account.accountNo || '';
        document.getElementById('edit-account-name').value = account.accountName || '';
        document.getElementById('edit-default-amount').value = account.defaultAmount || '';
        document.getElementById('edit-default-note').value = account.defaultNote || '';
    } else {
        editBankFields.style.display = 'none';
    }

    document.getElementById('edit-label').value = account.label || account.note || '';
    document.getElementById('modal-edit').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function handleEditAccount(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const type = document.getElementById('edit-type').value;

    let payload = {
        label: document.getElementById('edit-label').value.trim()
    };

    if (type === 'bank') {
        const bankSelect = document.getElementById('edit-bank-select');
        if (bankSelect.value) {
            try {
                const bank = JSON.parse(bankSelect.value);
                payload.bankCode = bank.code;
                payload.bankBin = bank.bin;
                payload.bankName = bank.name;
                payload.bankLogo = bank.logo;
            } catch {}
        }
        payload.accountNo = document.getElementById('edit-account-no').value.trim();
        payload.accountName = document.getElementById('edit-account-name').value.trim().toUpperCase();
        payload.defaultAmount = document.getElementById('edit-default-amount').value.trim();
        payload.defaultNote = document.getElementById('edit-default-note').value.trim();
    } else {
        payload.note = document.getElementById('edit-label').value.trim();
    }

    const success = await updateAccount(id, payload);
    if (success) {
        closeModal('modal-edit');
    }
}

// ============ DELETE ============
function openDeleteModal(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    deleteTargetId = id;
    const name = account.type === 'bank'
        ? `${account.bankName} - ${account.accountNo}`
        : account.label;
    document.getElementById('delete-account-name').textContent = name;
    document.getElementById('modal-delete').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function confirmDelete() {
    if (deleteTargetId) {
        await deleteAccount(deleteTargetId);
        deleteTargetId = null;
        closeModal('modal-delete');
    }
}

// ============ VIEW QR ============
function viewQR(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    currentViewAccount = account;
    const imgSrc = account.type === 'bank' ? account.qrUrl : account.qrImagePath;
    const title = account.type === 'bank' ? `${account.bankName}` : account.label;

    document.getElementById('qr-view-title').textContent = title;
    document.getElementById('qr-view-img').src = imgSrc;

    let infoHtml = '';
    if (account.type === 'bank') {
        infoHtml = `
            <p><strong>Ngân hàng:</strong> ${account.bankName}</p>
            <p><strong>Số TK:</strong> ${account.accountNo}</p>
            <p><strong>Chủ TK:</strong> ${account.accountName}</p>
            ${account.defaultAmount ? `<p><strong>Số tiền:</strong> ${formatCurrency(account.defaultAmount)}</p>` : ''}
            ${account.defaultNote ? `<p><strong>Nội dung:</strong> ${account.defaultNote}</p>` : ''}
        `;
    } else {
        infoHtml = account.note ? `<p>${account.note}</p>` : '';
    }
    document.getElementById('qr-view-info').innerHTML = infoHtml;

    document.getElementById('modal-qr-view').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ============ QR PREVIEW ============
function previewQR() {
    const bankSelect = document.getElementById('bank-select');
    const accountNo = document.getElementById('account-no').value.trim();

    if (!bankSelect.value || !accountNo) {
        showToast('Vui lòng chọn ngân hàng và nhập số tài khoản', 'error');
        return;
    }

    try {
        const bank = JSON.parse(bankSelect.value);
        const accountName = document.getElementById('account-name').value.trim();
        const amount = document.getElementById('default-amount').value.trim();
        const note = document.getElementById('default-note').value.trim();

        let qrUrl = `https://img.vietqr.io/image/${bank.bin}-${accountNo}-compact2.png`;
        const params = [];
        if (accountName) params.push(`accountName=${encodeURIComponent(accountName)}`);
        if (amount) params.push(`amount=${encodeURIComponent(amount)}`);
        if (note) params.push(`addInfo=${encodeURIComponent(note)}`);
        if (params.length > 0) qrUrl += '?' + params.join('&');

        document.getElementById('qr-preview-img').src = qrUrl;
        document.getElementById('qr-preview').style.display = 'block';
    } catch {
        showToast('Lỗi xử lý dữ liệu ngân hàng', 'error');
    }
}

// ============ ACTIONS ============
function copyAccountNo(accountNo) {
    navigator.clipboard.writeText(accountNo).then(() => {
        showToast(`Đã copy STK: ${accountNo}`, 'success');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = accountNo;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Đã copy STK: ${accountNo}`, 'success');
    });
}

function copyQRImageLink(id) {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    const link = window.location.origin + (account.qrImagePath || account.qrUrl);
    navigator.clipboard.writeText(link).then(() => {
        showToast('Đã copy link ảnh QR', 'success');
    }).catch(() => {
        showToast('Không thể copy link', 'error');
    });
}

function copyQRLink() {
    if (!currentViewAccount) return;
    const link = currentViewAccount.type === 'bank'
        ? currentViewAccount.qrUrl
        : window.location.origin + currentViewAccount.qrImagePath;
    navigator.clipboard.writeText(link).then(() => {
        showToast('Đã copy link QR', 'success');
    }).catch(() => {
        showToast('Không thể copy link', 'error');
    });
}

async function downloadQR() {
    if (!currentViewAccount) return;
    const imgSrc = currentViewAccount.type === 'bank'
        ? currentViewAccount.qrUrl
        : currentViewAccount.qrImagePath;
    const label = currentViewAccount.label || currentViewAccount.bankName || 'qr-code';

    try {
        const response = await fetch(imgSrc);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label.replace(/\s+/g, '-').toLowerCase()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Đang tải xuống...', 'info');
    } catch {
        // Fallback: open in new tab
        window.open(imgSrc, '_blank');
    }
}

// ============ FILTER & SEARCH ============
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    renderAccounts();
}

function filterAccounts() {
    renderAccounts();
}

// ============ UTILITIES ============
function formatAccountNo(no) {
    if (!no) return '';
    // Add spaces every 4 digits for readability
    return no.replace(/(.{4})/g, '$1 ').trim();
}

function formatCurrency(amount) {
    if (!amount) return '';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 6L9 17l-5-5"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modals
    if (e.key === 'Escape') {
        ['modal-add', 'modal-upload', 'modal-edit', 'modal-qr-view', 'modal-delete',
         'modal-create-folder', 'modal-folder-detail', 'modal-folder-upload', 'modal-delete-folder', 'modal-image-view'].forEach(id => {
            const modal = document.getElementById(id);
            if (modal && modal.classList.contains('active')) {
                closeModal(id);
            }
        });
    }
    // Ctrl+K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('search-input').focus();
    }
});

// ============================================
//  FOLDER MANAGEMENT SYSTEM
// ============================================

// Folder State
let folders = [];
let currentFolderId = null;
let currentViewImage = null;
let selectedFolderColor = '#7c3aed';
let folderUploadFiles = [];

// ============ FOLDER API CALLS ============
async function loadFolders() {
    try {
        const res = await fetch('/api/folders');
        const data = await res.json();
        if (data.success) {
            folders = data.data || [];
            renderFolders();
        }
    } catch (err) {
        console.error('Lỗi tải danh sách folders:', err);
    }
}

async function createFolder(payload) {
    try {
        const res = await fetch('/api/folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            folders.push(data.data);
            renderFolders();
            showToast('Đã tạo folder thành công!', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi tạo folder', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

async function deleteFolder(folderId) {
    try {
        const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            folders = folders.filter(f => f.id !== folderId);
            renderFolders();
            showToast('Đã xoá folder', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi xoá folder', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

async function uploadImageToFolder(folderId, file, caption) {
    try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('caption', caption || '');

        const res = await fetch(`/api/folders/${folderId}/images`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.success) {
            // Update local folder data
            const folder = folders.find(f => f.id === folderId);
            if (folder) {
                folder.images.push(data.data);
            }
            return data.data;
        } else {
            showToast(data.message || 'Lỗi upload ảnh', 'error');
            return null;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return null;
    }
}

async function deleteFolderImage(folderId, imageId) {
    try {
        const res = await fetch(`/api/folders/${folderId}/images/${imageId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            const folder = folders.find(f => f.id === folderId);
            if (folder) {
                folder.images = folder.images.filter(img => img.id !== imageId);
            }
            showToast('Đã xoá ảnh', 'success');
            return true;
        } else {
            showToast(data.message || 'Lỗi xoá ảnh', 'error');
            return false;
        }
    } catch (err) {
        showToast('Lỗi kết nối server', 'error');
        return false;
    }
}

// ============ FOLDER RENDERING ============
function renderFolders() {
    const grid = document.getElementById('folders-grid');
    const empty = document.getElementById('folders-empty');
    const count = document.getElementById('folders-count');

    count.textContent = folders.length;

    if (folders.length === 0) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';

    // Sort newest first
    const sorted = [...folders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = sorted.map((folder, i) => renderFolderCard(folder, i)).join('');
}

function renderFolderCard(folder, index) {
    const imageCount = (folder.images || []).length;
    const date = new Date(folder.createdAt);
    const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    return `
        <div class="folder-card" style="animation-delay: ${index * 0.08}s" onclick="openFolderDetail('${folder.id}')">
            <div class="folder-card-icon" style="background: ${folder.color || '#7c3aed'};">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
                </svg>
            </div>
            <div class="folder-card-name">${folder.name}</div>
            ${folder.owner ? `<div class="folder-card-owner">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ${folder.owner}
            </div>` : ''}
            <div class="folder-card-meta">
                <span class="folder-card-count">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/>
                    </svg>
                    ${imageCount} ảnh
                </span>
                <span class="folder-card-date">${dateStr}</span>
            </div>
        </div>
    `;
}

// ============ FOLDER MODALS ============
function openCreateFolderModal() {
    document.getElementById('form-create-folder').reset();
    selectedFolderColor = '#7c3aed';
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    document.querySelector('.color-swatch[data-color="#7c3aed"]').classList.add('active');
    document.getElementById('modal-create-folder').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function selectFolderColor(el) {
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
    selectedFolderColor = el.dataset.color;
}

async function handleCreateFolder(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('btn-submit-folder');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang tạo...';

    const payload = {
        name: document.getElementById('folder-name').value.trim(),
        owner: document.getElementById('folder-owner').value.trim(),
        color: selectedFolderColor
    };

    const success = await createFolder(payload);
    if (success) {
        closeModal('modal-create-folder');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Tạo Folder';
}

// ============ FOLDER DETAIL ============
function openFolderDetail(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    currentFolderId = folderId;

    // Set header info
    document.getElementById('folder-detail-name').textContent = folder.name;
    document.getElementById('folder-detail-owner').textContent = folder.owner ? `👤 ${folder.owner}` : '';
    const icon = document.getElementById('folder-detail-icon');
    icon.style.background = folder.color || '#7c3aed';
    icon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/></svg>`;

    renderFolderGallery(folder);

    document.getElementById('modal-folder-detail').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function renderFolderGallery(folder) {
    const gallery = document.getElementById('folder-gallery');
    const empty = document.getElementById('folder-empty-gallery');
    const images = folder.images || [];

    if (images.length === 0) {
        gallery.innerHTML = '';
        gallery.style.display = 'none';
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    gallery.style.display = 'grid';

    gallery.innerHTML = images.map(img => `
        <div class="gallery-item" onclick="viewFolderImage('${folder.id}', '${img.id}')">
            <img src="${img.path}" alt="${img.caption || img.originalName}" loading="lazy">
            <div class="gallery-item-overlay">
                <span class="gallery-item-caption">${img.caption || img.originalName || ''}</span>
            </div>
            <button class="gallery-item-delete" onclick="event.stopPropagation(); quickDeleteImage('${folder.id}', '${img.id}')" title="Xoá ảnh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
    `).join('');
}

// ============ FOLDER UPLOAD ============
function openFolderUploadModal() {
    folderUploadFiles = [];
    document.getElementById('form-folder-upload').reset();
    document.getElementById('folder-upload-previews').style.display = 'none';
    document.getElementById('folder-upload-previews').innerHTML = '';
    document.getElementById('folder-upload-placeholder').style.display = 'block';
    document.getElementById('folder-file-input').value = '';
    document.getElementById('modal-folder-upload').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function handleFolderFileSelect(e) {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        folderUploadFiles = files;
        showFolderUploadPreviews(files);
    }
}

function handleFolderDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
        folderUploadFiles = files;
        // Update file input
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        document.getElementById('folder-file-input').files = dt.files;
        showFolderUploadPreviews(files);
    } else {
        showToast('Vui lòng chọn file ảnh', 'error');
    }
}

function showFolderUploadPreviews(files) {
    const container = document.getElementById('folder-upload-previews');
    const placeholder = document.getElementById('folder-upload-placeholder');

    placeholder.style.display = 'none';
    container.style.display = 'flex';
    container.innerHTML = '';

    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'folder-upload-preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="${file.name}">`;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

async function handleFolderUpload(e) {
    e.preventDefault();

    if (folderUploadFiles.length === 0) {
        showToast('Vui lòng chọn file ảnh', 'error');
        return;
    }

    if (!currentFolderId) {
        showToast('Không xác định được folder', 'error');
        return;
    }

    const submitBtn = document.getElementById('btn-submit-folder-upload');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang upload...';

    const caption = document.getElementById('folder-image-caption').value.trim();
    let successCount = 0;

    for (const file of folderUploadFiles) {
        const result = await uploadImageToFolder(currentFolderId, file, caption);
        if (result) successCount++;
    }

    if (successCount > 0) {
        showToast(`Đã upload ${successCount}/${folderUploadFiles.length} ảnh`, 'success');
        closeModal('modal-folder-upload');
        renderFolders();

        // Refresh gallery if folder detail is open
        const folder = folders.find(f => f.id === currentFolderId);
        if (folder) {
            renderFolderGallery(folder);
        }
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload';
}

// ============ FOLDER IMAGE VIEW ============
function viewFolderImage(folderId, imageId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const image = folder.images.find(img => img.id === imageId);
    if (!image) return;

    currentViewImage = { folderId, imageId, image };

    document.getElementById('image-view-title').textContent = image.caption || image.originalName || 'Xem Ảnh';
    document.getElementById('image-view-img').src = image.path;

    let infoHtml = '';
    if (image.caption) infoHtml += `<p><strong>Chú thích:</strong> ${image.caption}</p>`;
    if (image.originalName) infoHtml += `<p><strong>Tên file:</strong> ${image.originalName}</p>`;
    if (image.size) infoHtml += `<p><strong>Kích thước:</strong> ${formatFileSize(image.size)}</p>`;
    document.getElementById('image-view-info').innerHTML = infoHtml;

    document.getElementById('modal-image-view').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function downloadFolderImage() {
    if (!currentViewImage) return;
    const { image } = currentViewImage;

    try {
        const response = await fetch(image.path);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = image.originalName || 'image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Đang tải xuống...', 'info');
    } catch {
        window.open(image.path, '_blank');
    }
}

async function deleteFolderImageFromView() {
    if (!currentViewImage) return;
    const { folderId, imageId } = currentViewImage;

    const success = await deleteFolderImage(folderId, imageId);
    if (success) {
        closeModal('modal-image-view');
        renderFolders();

        const folder = folders.find(f => f.id === folderId);
        if (folder) {
            renderFolderGallery(folder);
        }
        currentViewImage = null;
    }
}

async function quickDeleteImage(folderId, imageId) {
    if (!confirm('Xoá ảnh này?')) return;

    const success = await deleteFolderImage(folderId, imageId);
    if (success) {
        renderFolders();
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
            renderFolderGallery(folder);
        }
    }
}

// ============ FOLDER DELETE ============
function openDeleteFolderModal() {
    if (!currentFolderId) return;
    const folder = folders.find(f => f.id === currentFolderId);
    if (!folder) return;

    document.getElementById('delete-folder-name').textContent = folder.name;
    document.getElementById('modal-delete-folder').classList.add('active');
    document.body.style.overflow = 'hidden';
}

async function confirmDeleteFolder() {
    if (!currentFolderId) return;

    const success = await deleteFolder(currentFolderId);
    if (success) {
        closeModal('modal-delete-folder');
        closeModal('modal-folder-detail');
        currentFolderId = null;
    }
}

// ============ FOLDER UTILITIES ============
function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
