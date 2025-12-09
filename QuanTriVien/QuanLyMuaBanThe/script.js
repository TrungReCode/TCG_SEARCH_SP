// admin.js

const API = {
    RAO_BAN: "http://localhost:3000/raoban",
    TIM_MUA: "http://localhost:3000/timmua",
    ORDERS: "http://localhost:3000/orders"
};

let currentTab = 'selling';

const DOM = {
    tableBody: document.getElementById('tableBody'),
    tabSelling: document.getElementById('tabSelling'),
    tabBuying: document.getElementById('tabBuying'),
    tabOrders: document.getElementById('tabOrders'),
    modalEdit: document.getElementById('modalEdit'),
    formEdit: document.getElementById('formEdit')
};

// --- CÁC HÀM XỬ LÝ SỰ KIỆN (Gán vào window để HTML gọi được) ---

// 1. Chuyển Tab
window.switchTab = function(tab) {
    currentTab = tab;
    // Reset Style
    [DOM.tabSelling, DOM.tabBuying, DOM.tabOrders].forEach(el => {
        if(el) {
            el.classList.remove('tab-active', 'text-blue-600');
            el.classList.add('text-gray-500');
        }
    });

    // Active Style
    if (tab === 'selling') DOM.tabSelling.classList.add('tab-active', 'text-blue-600');
    else if (tab === 'buying') DOM.tabBuying.classList.add('tab-active', 'text-blue-600');
    else DOM.tabOrders.classList.add('tab-active', 'text-blue-600');

    loadData();
}

// 2. Mở Modal Sửa
window.openEditModal = function(itemString) {
    try {
        // Decode chuỗi dữ liệu
        const item = JSON.parse(decodeURIComponent(itemString));
        const isSelling = currentTab === 'selling';

        document.getElementById('editId').value = isSelling ? item.MaRaoBan : item.MaCanMua;
        document.getElementById('editType').value = currentTab;
        document.getElementById('editTitle').value = isSelling ? item.TenThe : item.TieuDe;
        document.getElementById('editPrice').value = isSelling ? item.GiaBan : item.GiaMongMuon;
        document.getElementById('editDesc').value = isSelling ? item.MoTaRaoBan : item.MoTa;
        
        const fieldCond = document.getElementById('fieldCondition');
        if (isSelling) {
            fieldCond.classList.remove('hidden');
            document.getElementById('editCondition').value = item.TinhTrang || '';
        } else {
            fieldCond.classList.add('hidden');
        }

        DOM.modalEdit.classList.remove('hidden');
        DOM.modalEdit.classList.add('flex');
    } catch (e) {
        console.error("Lỗi mở modal:", e);
        alert("Không thể mở bảng chỉnh sửa.");
    }
}

// 3. Đóng Modal Sửa
window.closeEditModal = function() {
    DOM.modalEdit.classList.remove('flex');
    DOM.modalEdit.classList.add('hidden');
}

// 4. Xóa Item
window.deleteItem = async function(id) {
    if (!confirm(`Bạn có chắc muốn xóa tin #${id} này không?`)) return;

    try {
        const url = currentTab === 'selling' 
            ? `${API.RAO_BAN}/${id}` 
            : `${API.TIM_MUA}/${id}`;

        const res = await fetch(url, { method: 'DELETE' });
        
        // Kiểm tra nếu server trả về lỗi HTML thay vì JSON
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server trả về lỗi không xác định (Check API Route).");
        }

        const result = await res.json();

        if (result.success) {
            alert("Đã xóa thành công!");
            loadData();
        } else {
            alert("Lỗi: " + (result.error || result.message));
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi hệ thống: " + err.message);
    }
}

// 5. Cập nhật trạng thái đơn hàng (Duyệt/Hủy)
window.updateStatus = async function(id, status) {
    if (!confirm(`Xác nhận chuyển trạng thái thành "${status}"?`)) return;
    try {
        const res = await fetch(`${API.ORDERS}/update-status/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ TrangThai: status })
        });
        const result = await res.json();
        if (result.success) {
            alert("Thành công!");
            loadData();
        } else {
            alert("Lỗi: " + result.error);
        }
    } catch (err) { alert("Lỗi kết nối"); }
}

// --- LOGIC LOAD DỮ LIỆU ---

async function loadData() {
    DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10"><i class="fas fa-spinner fa-spin"></i> Đang tải...</td></tr>';
    
    try {
        let url = "";
        if (currentTab === 'selling') url = `${API.RAO_BAN}/search-combined?maNguoiDung=999999`;
        else if (currentTab === 'buying') url = `${API.TIM_MUA}/list`;
        else url = `${API.ORDERS}/admin/list`;

        const res = await fetch(url);
        const json = await res.json();
        const data = json.data || json || [];

        if (currentTab === 'orders') renderOrderTable(data);
        else renderContentTable(data);

    } catch (err) {
        console.error(err);
        DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-red-500 py-10">Lỗi kết nối server</td></tr>';
    }
}

function renderContentTable(data) {
    // Render Header cho Tin đăng
    document.querySelector('thead').innerHTML = `
        <tr>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Hình Ảnh</th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Tiêu Đề</th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Người Đăng</th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Giá</th>
            <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-50 text-center text-xs font-semibold text-gray-600 uppercase">Hành Động</th>
        </tr>
    `;

    if (data.length === 0) {
        DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }

    const isSelling = currentTab === 'selling';

    DOM.tableBody.innerHTML = data.map(item => {
        const id = isSelling ? item.MaRaoBan : item.MaCanMua;
        const img = item.HinhAnh || item.HinhAnhHienThi || 'https://via.placeholder.com/50';
        const title = isSelling ? item.TenThe : item.TieuDe;
        const user = item.TenNguoiDung || 'Ẩn danh';
        const price = isSelling ? item.GiaBan : item.GiaMongMuon;
        const priceDisplay = price ? new Intl.NumberFormat('en-US').format(price) + ' $' : 'Thỏa thuận';
        
        // Encode dữ liệu an toàn để truyền vào hàm onclick
        const itemString = encodeURIComponent(JSON.stringify(item));

        return `
            <tr class="hover:bg-gray-50 border-b border-gray-200">
                <td class="px-5 py-4 text-sm text-gray-500">#${id}</td>
                <td class="px-5 py-4"><img src="${img}" class="w-12 h-16 object-contain border bg-white rounded"></td>
                <td class="px-5 py-4 text-sm font-bold text-gray-800 max-w-xs truncate" title="${title}">${title}</td>
                <td class="px-5 py-4 text-sm text-gray-600">${user}</td>
                <td class="px-5 py-4 text-sm font-bold text-red-600">${priceDisplay}</td>
                <td class="px-5 py-4 text-center">
                    <button onclick="window.openEditModal('${itemString}')" class="text-blue-500 hover:text-blue-700 mr-3 px-2 py-1 rounded hover:bg-blue-50" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="window.deleteItem(${id})" class="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderOrderTable(data) {
    if (!Array.isArray(data)) {
        console.error("Dữ liệu không hợp lệ:", data);
        DOM.tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-10">Lỗi dữ liệu: ${data.error || "Không xác định"}</td></tr>`;
        return;
    }

    if (data.length === 0) {
        DOM.tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-10 text-gray-500">Chưa có giao dịch nào</td></tr>';
        return;
    }

    // Render Header
    document.querySelector('thead').innerHTML = `
        <tr>
            <th class="px-5 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Mã GD</th>
            <th class="px-5 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Loại</th>
            <th class="px-5 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Chi Tiết</th>
            <th class="px-5 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Giá Trị</th>
            <th class="px-5 py-3 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">Trạng Thái</th>
            <th class="px-5 py-3 bg-gray-50 text-center text-xs font-semibold text-gray-600 uppercase">Xử Lý</th>
        </tr>
    `;

    DOM.tableBody.innerHTML = data.map(item => {
        const isBan = item.LoaiGiaoDich === 'BAN';
        const typeBadge = isBan 
            ? '<span class="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">Bán Thẻ</span>'
            : '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Mua Thẻ</span>';
            
        // Dữ liệu đã được Backend xử lý sẵn (TenTheHienThi, HinhAnhHienThi)
        const cardName = item.TenTheHienThi || 'Không có tên';
        const cardImg = item.HinhAnhHienThi || 'https://via.placeholder.com/60x80?text=No+Img';
        const doiTac = item.TenDoiTac || 'Ẩn danh';

        const detailHtml = `
            <div class="flex items-start gap-3">
                <img src="${cardImg}" class="w-12 h-16 object-cover rounded border bg-white shadow-sm">
                <div class="text-sm">
                    <div class="font-bold text-gray-800">${item.TenNguoiLienHe}</div>
                    <div class="text-xs text-gray-500">
                        <i class="fas fa-arrow-right mx-1"></i> ${isBan ? 'Bán cho' : 'Mua của'}: <strong>${doiTac}</strong>
                    </div>
                    <div class="text-xs text-blue-600 font-semibold mt-1 truncate w-40" title="${cardName}">${cardName}</div>
                </div>
            </div>`;

        const price = item.GiaHienThi ? new Intl.NumberFormat('en-US').format(item.GiaHienThi) + ' $' : 'Thỏa thuận';

        let statusClass = {
            'ChoXuLy': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'DangGiao': 'bg-blue-100 text-blue-800 border-blue-200',
            'HoanTat': 'bg-green-100 text-green-800 border-green-200',
            'Huy': 'bg-gray-100 text-gray-500 border-gray-200'
        }[item.TrangThai] || 'bg-gray-100';

        let actionBtns = '';
        if(item.TrangThai === 'ChoXuLy') {
            actionBtns = `
                <button onclick="window.updateStatus(${item.MaDonHang}, 'DangGiao')" class="bg-blue-500 text-white px-2 py-1 rounded text-xs mb-1 hover:bg-blue-600 w-full shadow-sm">Duyệt</button>
                <button onclick="window.updateStatus(${item.MaDonHang}, 'Huy')" class="bg-white border border-red-200 text-red-500 px-2 py-1 rounded text-xs hover:bg-red-50 w-full">Hủy</button>
            `;
        } else if (item.TrangThai === 'DangGiao') {
            actionBtns = `
                <button onclick="window.updateStatus(${item.MaDonHang}, 'HoanTat')" class="bg-green-600 text-white px-2 py-1 rounded text-xs mb-1 hover:bg-green-700 w-full shadow-sm">Hoàn tất</button>
                <button onclick="window.updateStatus(${item.MaDonHang}, 'Huy')" class="text-xs text-gray-400 hover:text-red-500 underline w-full">Hủy bỏ</button>
            `;
        } else {
            actionBtns = '<span class="text-gray-400 text-xs italic">Đã đóng</span>';
        }

        return `
            <tr class="hover:bg-gray-50 border-b border-gray-200 transition">
                <td class="px-5 py-4 font-mono text-xs text-gray-500">#${item.MaDonHang}</td>
                <td class="px-5 py-4">${typeBadge}</td>
                <td class="px-5 py-4">${detailHtml}</td>
                <td class="px-5 py-4 font-bold text-gray-800">${price}</td>
                <td class="px-5 py-4"><span class="${statusClass} border px-2 py-1 rounded-full text-xs font-bold shadow-sm">${item.TrangThai}</span></td>
                <td class="px-5 py-4 text-center"><div class="w-20 mx-auto">${actionBtns}</div></td>
            </tr>
        `;
    }).join('');
}

// Xử lý Submit Form Sửa
if(DOM.formEdit) {
    DOM.formEdit.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const type = document.getElementById('editType').value;
        
        const payload = {
            Gia: document.getElementById('editPrice').value,
            MoTa: document.getElementById('editDesc').value,
            TinhTrang: document.getElementById('editCondition').value,
            GiaMongMuon: document.getElementById('editPrice').value,
            TieuDe: document.getElementById('editTitle').value
        };

        const url = type === 'selling' ? `${API.RAO_BAN}/update/${id}` : `${API.TIM_MUA}/update/${id}`;

        try {
            const res = await fetch(url, {
                method: 'PUT',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                alert("Cập nhật thành công!");
                window.closeEditModal();
                loadData();
            } else {
                alert("Lỗi: " + result.message || result.error);
            }
        } catch (err) { alert("Lỗi kết nối"); }
    });
}

function formatMoney(n) { return new Intl.NumberFormat('en-US').format(n) + ' $'; }

// Init
document.addEventListener('DOMContentLoaded', loadData);