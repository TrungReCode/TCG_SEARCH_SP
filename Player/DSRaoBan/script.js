const API_BASE_URL = "http://localhost:3000";
const RAOBAN_URL = `${API_BASE_URL}/raoban`;
const CARDS_URL = `${API_BASE_URL}/cards`;
const TROCHOI_URL = `${API_BASE_URL}/games`;
const currentUserId = localStorage.getItem("maNguoiDung");

// =====================================================================
// HÀM TẢI DANH SÁCH TRÒ CHƠI (MỚI)
// =====================================================================
async function loadTroChoiList() {
    const select = document.getElementById('selectMaTroChoi');
    select.innerHTML = '<option value="">Đang tải...</option>';
    
    try {
        const response = await fetch(TROCHOI_URL); 
        // Backend trả về mảng recordset trực tiếp: [{ MaTroChoi: 1, TenTroChoi: 'Game A' }, ...]
        const data = await response.json();
        
        if (response.status !== 200) throw new Error(data.error || "Lỗi tải danh sách trò chơi.");

        select.innerHTML = '<option value="">-- Chọn Trò Chơi --</option>';
        if (data.length > 0) {
            data.forEach(game => {
                const option = document.createElement('option');
                option.value = game.MaTroChoi;
                option.textContent = game.TenTroChoi;
                select.appendChild(option);
            });
            // Tự động chọn game đầu tiên để tiện test và search
            select.selectedIndex = 1; 
            
            // Kích hoạt tìm kiếm ban đầu (nếu có keyword sẵn)
            searchCards(document.getElementById('searchKeyword').value);
        } else {
             select.innerHTML = '<option value="">Không có trò chơi nào</option>';
        }

    } catch (err) {
        console.error("Lỗi tải danh sách trò chơi:", err);
        select.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
    }
}

// =====================================================================
// 2. TÌM KIẾM THẺ GỐC ĐỂ THÊM
// =====================================================================
async function searchCards(keyword) {
    const searchResults = document.getElementById("searchResults");
    const maTroChoi = document.getElementById('selectMaTroChoi').value;
    
    if (!maTroChoi) {
        searchResults.innerHTML = '<p style="color:red;">Vui lòng chọn Trò Chơi trước.</p>';
        return;
    }
    
    if (keyword.length < 2) { 
        searchResults.innerHTML = '<p>Bắt đầu nhập 2 ký tự trở lên để tìm kiếm.</p>';
        return;
    }
    
    searchResults.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Đang tìm...</p>';

    try {
        const response = await fetch(`${CARDS_URL}/search?q=${encodeURIComponent(keyword)}&MaTroChoi=${maTroChoi}`); 
        const result = await response.json();

        if (response.status !== 200) throw new Error(result.error || "Lỗi tìm kiếm thẻ gốc.");
        
        searchResults.innerHTML = '';

        if (result.length === 0) {
            searchResults.innerHTML = `<p>Không tìm thấy thẻ nào với từ khóa "${keyword}".</p>`;
            return;
        }

        result.forEach(card => {
            const maThe = card.MaThe;
            // Xử lý Escape dấu nháy đơn (') để tránh lỗi cú pháp HTML onclick
            const rawTenThe = card.TenThe || "";
            const safeTenThe = rawTenThe.replace(/'/g, "\\'"); 
            
            const hinhAnh = card.HinhAnh || 'https://via.placeholder.com/50x70?text=No+Img';
            // Lấy giá gợi ý từ DB
            const giaGoiY = parseFloat(card.Gia) || 0;

            const item = document.createElement('div');
            item.className = 'search-item';

            item.innerHTML = `
                <div class="search-item-info">
                    <img src="${hinhAnh}" alt="${safeTenThe}">
                    <div>
                        <span style="font-weight:bold;">${rawTenThe}</span> 
                        ${maThe ? `<small style="color:#666;">(ID: ${maThe})</small>` : ''}
                        <br/>
                        <small style="color: #28a745;">Gợi ý: $${giaGoiY.toFixed(2)}</small>
                    </div>
                </div>
                <button class="btn btn-success btn-small" 
                        onclick="selectCardForSale('${maThe}', '${safeTenThe}', '${hinhAnh}', ${giaGoiY})">
                    <i class="fas fa-plus"></i> Rao Bán
                </button>
            `;
            searchResults.appendChild(item);
        });

    } catch (err) {
        searchResults.innerHTML = `<p style="color:red">Lỗi tìm kiếm: ${err.message}</p>`;
    }
}

// =====================================================================
// 3. XỬ LÝ THÊM MỚI
// =====================================================================

// Bước 1: Chọn thẻ từ kết quả tìm kiếm, điền vào form Add
// Thêm tham số 'gia' vào cuối
async function selectCardForSale(maThe, tenThe, hinhAnh, gia) {
    closeModal('modalSearch'); 
    openAddModal();

    const giaInput = document.getElementById("addGia");
    
    // BƯỚC 1: Hiển thị ngay giá cũ lấy từ danh sách search (Tăng tốc độ cảm nhận)
    const oldPrice = parseFloat(gia) || 0;
    giaInput.value = oldPrice.toFixed(2);

    document.getElementById("addMaTheDisplay").textContent = tenThe; 
    document.getElementById("addMaThe").value = maThe; 
    document.getElementById("addCardImage").src = hinhAnh; 
    
    giaInput.focus();
    giaInput.select();

    
}

document.getElementById("salesList").addEventListener("click", function(e) {
    const target = e.target;

    // Xử lý nút sửa
    if (target.classList.contains("btn-edit")) {
        const maRaoBan = target.dataset.id; // gán data-id cho mỗi nút
        openEditModal(maRaoBan);
    }

    // Xử lý nút xóa
    if (target.classList.contains("btn-delete")) {
        const maRaoBan = target.dataset.id;
        deleteItem(maRaoBan);
    }
});


// (GIỮ NGUYÊN FORM ADD SUBMIT)
document.getElementById("formAdd").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        MaNguoiDung: parseInt(currentUserId),
        MaThe: parseInt(document.getElementById("addMaThe").value),
        Gia: parseFloat(document.getElementById("addGia").value),
        TinhTrang: document.getElementById("addTinhTrang").value,
        MoTa: document.getElementById("addMoTa").value
    };
    
    if (isNaN(payload.MaThe)) {
        alert("Vui lòng chọn thẻ hợp lệ từ kết quả tìm kiếm.");
        return;
    }

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
            document.getElementById("formAdd").reset();
            fetchSalesList(); 
        } else {
            alert("Lỗi: " + (result.error || result.message));
        }
    } catch (err) {
        alert("Lỗi hệ thống: " + err.message);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadTroChoiList(); // Load danh sách game trước
    fetchSalesList();  // Load danh sách bán hàng
});


// =====================================================================
// 1. LOAD DANH SÁCH RAO BÁN CỦA NGƯỜI DÙNG (Route: GET /raoban/list/:id)
// =====================================================================
async function fetchSalesList() {
    const listContainer = document.getElementById("salesList");
    listContainer.innerHTML = '<p class="loading-text"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</p>';
    
    try {
        const response = await fetch(`${RAOBAN_URL}/list/${currentUserId}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);

        const data = result.data;
        listContainer.innerHTML = "";

        if (data.length === 0) {
            listContainer.innerHTML = "<p>Bạn chưa rao bán thẻ nào.</p>";
            return;
        }

        data.forEach(item => {
            const cardHTML = `
                <div class="card-item" id="card-${item.MaRaoBan}">
                    <img src="${item.HinhAnh || 'https://via.placeholder.com/300'}" alt="${item.TenThe}" class="card-img">
                    <div class="card-body">
                        <h3 class="card-title">${item.TenThe}</h3>
                        <p class="card-price">Giá bán: <strong>${formatCurrencyUSD(item.GiaBan)}</strong></p>
                        <span class="card-status status-${item.TinhTrang.toLowerCase().replace(/\s/g, '')}">${item.TinhTrang}</span>
                        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">${item.MoTa || 'Không có mô tả'}</p>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-primary" onclick="openEditModal(${item.MaRaoBan}, '${item.GiaBan}', '${item.TinhTrang}', '${item.MoTa || ''}')">
                            <i class="fas fa-edit"></i> Sửa
                        </button>
                        <button class="btn btn-danger" onclick="deleteItem(${item.MaRaoBan})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            `;
            listContainer.innerHTML += cardHTML;
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<p style="color:red">Lỗi tải dữ liệu: ${err.message}</p>`;
    }
}

// =====================================================================
// 4. XỬ LÝ CẬP NHẬT (Route: PUT /raoban/update/:maRaoBan)
// =====================================================================
document.getElementById("formEdit").addEventListener("submit", async (e) => {
    e.preventDefault();

    const maRaoBan = document.getElementById("editmaRaoBan").value;
    const payload = {
        MaNguoiDung: parseInt(currentUserId), // Quan trọng cho bảo mật (đã sửa ở backend)
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
            alert("Lỗi: " + (result.error || result.message));
        }
    } catch (err) {
        alert("Lỗi hệ thống: " + err.message);
    }
});

// =====================================================================
// 5. XỬ LÝ XÓA (Route: DELETE /raoban/delete/:maRaoBan)
// =====================================================================
async function deleteItem(maRaoBan) {
    if (!confirm("Bạn có chắc chắn muốn xóa tin rao bán này không?")) return;

    try {
        const response = await fetch(`${RAOBAN_URL}/delete/${maRaoBan}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            // Gửi MaNguoiDung để backend check quyền sở hữu
            body: JSON.stringify({ maNguoiDung: currentUserId }) 
        });

        const result = await response.json();
        if (result.success) {
            alert("Đã xóa thành công!");
            document.getElementById(`card-${maRaoBan}`).remove();
        } else {
            alert("Lỗi: " + (result.error || result.message));
        }
    } catch (err) {
        alert("Lỗi kết nối: " + err.message);
    }
}

// =====================================================================
// HÀM TIỆN ÍCH & UI (Modal / Format)
// (Giữ nguyên các hàm này so với phiên bản trước)
// =====================================================================
function formatCurrencyUSD(value) {
    if (!value && value !== 0) return '';
    return parseFloat(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function openAddModal() {
    document.getElementById("modalAdd").style.display = "block";
}

function openSearchModal() {
    document.getElementById("modalSearch").style.display = "block";
    document.getElementById("searchKeyword").focus();
}

function openEditModal(maRaoBan, gia, tinhTrang, moTa) {
    document.getElementById("modalEdit").style.display = "block";
    document.getElementById("editmaRaoBan").value = maRaoBan;
    document.getElementById("editGia").value = parseFloat(gia);
    document.getElementById("editTinhTrang").value = tinhTrang;
    document.getElementById("editMoTa").value = moTa;
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
        if (event.target.id === 'modalSearch') {
             document.getElementById("searchResults").innerHTML = '';
             document.getElementById("searchKeyword").value = '';
        }
    }
}

document.addEventListener("DOMContentLoaded", fetchSalesList);