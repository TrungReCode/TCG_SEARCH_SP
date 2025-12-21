// =====================================================================
// CẤU HÌNH & KHỞI TẠO
// =====================================================================
const API_BASE_URL = "http://localhost:3000";
const RAOBAN_URL = `${API_BASE_URL}/raoban`;
const CARDS_URL = `${API_BASE_URL}/cards`;
const TROCHOI_URL = `${API_BASE_URL}/games`;
const currentUserId = localStorage.getItem("maNguoiDung");

// Kiểm tra đăng nhập
if (!currentUserId) {
    alert("Vui lòng đăng nhập để quản lý thẻ bán.");
    window.location.href = "login.html"; 
}

document.addEventListener("DOMContentLoaded", () => {
    fetchSalesList();
});

// =====================================================================
// 1. QUẢN LÝ DANH SÁCH RAO BÁN (List & Delete)
// =====================================================================

async function fetchSalesList() {
    const listContainer = document.getElementById("salesList");
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="loading-text text-center py-10 text-gray-500 italic col-span-full"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</p>';
    
    try {
        const response = await fetch(`${RAOBAN_URL}/list/${currentUserId}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        const data = result.data;
        listContainer.innerHTML = "";

        if (data.length === 0) {
            listContainer.innerHTML = "<p class='col-span-full text-center text-gray-500 py-10'>Bạn chưa rao bán thẻ nào.</p>";
            return;
        }

        data.forEach(item => {
            let statusClass = "bg-gray-100 text-gray-600";

            const rawStatus = (item.TinhTrang || '').toString();
            const statusNorm = rawStatus.toLowerCase();

            let displayStatus = rawStatus;
            if (statusNorm === 'daban' || statusNorm.includes('daban')) {
                displayStatus = 'Đã được bán';
                statusClass = 'bg-blue-100 text-blue-700';
            } else if (rawStatus.includes("Mới")) statusClass = "bg-green-100 text-green-700";
            else if (rawStatus.includes("Cũ")) statusClass = "bg-red-100 text-red-700";

            const imgSrc = item.HinhAnh || 'https://placehold.co/300?text=No+Img';

            const cardHTML = `
                <div class="bg-white border rounded-xl shadow-sm hover:shadow-md transition p-4 flex flex-col relative" id="card-${item.MaRaoBan}">
                    <div class="flex gap-4">
                        <img src="${imgSrc}" alt="${item.TenThe}" class="w-20 h-28 object-cover rounded border bg-gray-50">
                        <div class="flex-grow min-w-0">
                            <h3 class="font-bold text-gray-800 truncate" title="${item.TenThe}">${item.TenThe}</h3>
                            <p class="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">${item.TenTroChoi || 'N/A'}</p>
                            
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-bold text-red-600 text-lg">${formatCurrencyUSD(item.GiaBan)}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] uppercase font-bold ${statusClass}">${displayStatus}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3 bg-gray-50 p-2 rounded text-xs text-gray-600 italic line-clamp-2 h-10">
                        ${item.MoTa || 'Không có mô tả chi tiết'}
                    </div>

                    <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button class="flex items-center justify-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 rounded-lg text-sm font-medium transition" 
                                onclick="openEditModal(${item.MaRaoBan}, '${item.GiaBan}', '${item.TinhTrang}', '${encodeURIComponent(item.MoTa || '')}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg text-sm font-medium transition" 
                                onclick="deleteItem(${item.MaRaoBan})">
                            <i class="fas fa-trash-alt"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
            listContainer.innerHTML += cardHTML;
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<p class="col-span-full text-red-500 text-center">Lỗi tải dữ liệu: ${err.message}</p>`;
    }
}

async function deleteItem(maRaoBan) {
    if (!confirm("Bạn có chắc chắn muốn xóa tin này?")) return;

    try {
        const response = await fetch(`${RAOBAN_URL}/${maRaoBan}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ maNguoiDung: parseInt(currentUserId) }) 
        });

        const result = await response.json();
        if (result.success) {
            const item = document.getElementById(`card-${maRaoBan}`);
            if(item) {
                item.style.opacity = '0';
                item.style.transform = 'scale(0.9)';
                setTimeout(() => item.remove(), 300);
            }
            setTimeout(() => {
                const list = document.getElementById("salesList");
                if(list && list.children.length === 0) fetchSalesList();
            }, 350);
        } else {
            alert("Lỗi: " + (result.error || result.message));
        }
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
    }
}

// =====================================================================
// 2. MODAL ĐĂNG BÁN MỚI (Tích hợp Tìm kiếm)
// =====================================================================

// Mở Modal & Load Game
async function openAddModal() {
    const modal = document.getElementById("modalAdd");
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    document.getElementById("formAdd").reset();
    resetSelection();
    
    const select = document.getElementById("addMaTroChoi");
    if (select.options.length <= 1) { 
        select.innerHTML = '<option value="">Đang tải...</option>';
        try {
            const res = await fetch(TROCHOI_URL);
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            
            select.innerHTML = '<option value="">-- Chọn Game --</option>';
            list.forEach(g => {
                select.innerHTML += `<option value="${g.MaTroChoi}">${g.TenTroChoi}</option>`;
            });
        } catch(e) { console.error(e); select.innerHTML = '<option value="">Lỗi tải game</option>'; }
    }
}

// Tìm Kiếm Thẻ (Debounce)
let debounceTimeout;
const searchInput = document.getElementById('addSearchInput');
if(searchInput) {
    searchInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => searchForSell(), 500);
    });
}

async function searchForSell() {
    const keyword = document.getElementById("addSearchInput").value.trim();
    const gameId = document.getElementById("addMaTroChoi").value;
    const resultBox = document.getElementById("addSearchResults");

    if (!gameId) {
        resultBox.classList.remove('hidden');
        resultBox.innerHTML = '<p class="text-red-500 p-2 text-sm text-center">Vui lòng chọn Game trước.</p>';
        return;
    }
    if (keyword.length < 2) {
        resultBox.classList.add('hidden');
        return;
    }

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = '<p class="text-gray-500 p-2 text-sm text-center"><i class="fas fa-spinner fa-spin"></i> Đang tìm...</p>';

    try {
        const response = await fetch(`${CARDS_URL}/search?q=${encodeURIComponent(keyword)}&MaTroChoi=${gameId}`);
        const result = await response.json();
        const cards = Array.isArray(result) ? result : (result.data || []);

        if (cards.length === 0) {
            resultBox.innerHTML = '<p class="text-gray-500 p-2 text-sm text-center">Không tìm thấy thẻ nào.</p>';
            return;
        }

        resultBox.innerHTML = cards.map(c => {
            const safeName = c.TenThe.replace(/'/g, "\\'");
            const safeImg = c.HinhAnh || 'https://placehold.co/50';
            const price = c.Gia || 0;

            return `
                <div class="flex items-center gap-3 p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0 transition"
                     onclick="selectSellCard('${c.MaThe}', '${safeName}', '${safeImg}', ${price})">
                    <img src="${safeImg}" class="w-10 h-14 object-cover rounded bg-white border">
                    <div class="min-w-0">
                        <div class="font-bold text-sm text-gray-800 truncate">${c.TenThe}</div>
                        <div class="text-xs text-gray-500">Gợi ý: <span class="text-green-600 font-bold">$${price}</span></div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        resultBox.innerHTML = '<p class="text-red-500 p-2 text-sm text-center">Lỗi kết nối.</p>';
    }
}

// 3. Chọn Thẻ từ danh sách tìm kiếm
function selectSellCard(id, name, img, suggestedPrice) {
    // Ẩn kết quả tìm kiếm
    document.getElementById("addSearchResults").classList.add("hidden");
    document.getElementById("addSearchInput").value = ""; 

    // Lưu ID thẻ
    document.getElementById("addMaThe").value = id;

    // Hiển thị Preview Thẻ đã chọn
    document.getElementById("selectedCardPreview").classList.remove("hidden");
    document.getElementById("selectedCardPreview").classList.add("flex");
    document.getElementById("previewImgInfo").src = img;
    document.getElementById("previewNameInfo").textContent = name;
    document.getElementById("previewIdInfo").textContent = id;

    // Điền dữ liệu gợi ý (Nếu người dùng chưa nhập gì thì mới điền)
    const giaInput = document.getElementById("addGia");
    if (!giaInput.value) {
        giaInput.value = suggestedPrice || 0;
    }
    
    // Tự động điền link ảnh gốc vào ô Link (để người dùng biết)
    document.getElementById("addHinhAnh").value = img;
    document.getElementById("finalPreviewImg").src = img;
}

// 4. Reset Selection (Bỏ chọn thẻ)
function resetSelection() {
    document.getElementById("addMaThe").value = "";
    
    // Ẩn preview thẻ
    document.getElementById("selectedCardPreview").classList.add("hidden");
    document.getElementById("selectedCardPreview").classList.remove("flex");
    
    // Reset ảnh preview về placeholder, nhưng KHÔNG xóa giá hay mô tả người dùng đã nhập
    document.getElementById("finalPreviewImg").src = "https://placehold.co/40";
    document.getElementById("addHinhAnh").value = "";
}

function updatePreviewImage(url) {
    const img = document.getElementById("finalPreviewImg");
    img.src = url || 'https://placehold.co/40';
}

// Submit Đăng Bán
const formAdd = document.getElementById("formAdd");
if(formAdd){
    formAdd.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            MaNguoiDung: parseInt(currentUserId),
            MaThe: document.getElementById("addMaThe").value,
            Gia: document.getElementById("addGia").value,
            TinhTrang: document.getElementById("addTinhTrang").value,
            HinhAnh: document.getElementById("addHinhAnh").value,
            MoTa: document.getElementById("addMoTa").value
        };

        // Validate quan trọng: Phải chọn thẻ mới được đăng
        if (!payload.MaThe) {
            alert("Vui lòng chọn thẻ từ thanh tìm kiếm trước khi đăng bán!");
            document.getElementById("addSearchInput").focus();
            return;
        }

        const btn = document.getElementById("btnSubmitSell");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerText = "Đang xử lý...";

        try {
            const response = await fetch(`${RAOBAN_URL}/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.success) {
                alert("Đăng bán thành công!");
                closeModal('modalAdd');
                fetchSalesList(); 
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (err) {
            alert("Lỗi hệ thống");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });
}

// =====================================================================
// 3. MODAL SỬA & TIỆN ÍCH
// =====================================================================

function openEditModal(maRaoBan, gia, tinhTrang, moTaEncoded) {
    const moTa = decodeURIComponent(moTaEncoded);
    const modal = document.getElementById("modalEdit");
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    document.getElementById("editmaRaoBan").value = maRaoBan;
    document.getElementById("editGia").value = parseFloat(gia);
    document.getElementById("editTinhTrang").value = tinhTrang;
    document.getElementById("editMoTa").value = moTa;
}

const formEdit = document.getElementById("formEdit");
if(formEdit){
    formEdit.addEventListener("submit", async (e) => {
        e.preventDefault();
        const maRaoBan = document.getElementById("editmaRaoBan").value;
        const payload = {
            MaNguoiDung: parseInt(currentUserId), 
            Gia: parseFloat(document.getElementById("editGia").value),
            TinhTrang: document.getElementById("editTinhTrang").value,
            MoTa: document.getElementById("editMoTa").value
        };

        try {
            const response = await fetch(`${RAOBAN_URL}/update/${maRaoBan}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (result.success) {
                alert("Cập nhật thành công!");
                closeModal('modalEdit');
                fetchSalesList(); 
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (err) { alert("Lỗi hệ thống"); }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
}

function formatCurrencyUSD(value) {
    if (!value && value !== 0) return '';
    return parseFloat(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// Gán hàm vào window để HTML gọi được
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.deleteItem = deleteItem;
window.closeModal = closeModal;
window.searchForSell = searchForSell;
window.selectSellCard = selectSellCard;
window.resetSelection = resetSelection;
window.updatePreviewImage = updatePreviewImage;