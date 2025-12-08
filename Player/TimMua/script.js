/**
 * ====================================================================
 * CẤU HÌNH & KHỞI TẠO (CONFIGURATION & STATE)
 * ====================================================================
 */
const CONFIG = {
    API_BASE: "http://localhost:3000",
    USER_ID: Number(localStorage.getItem("maNguoiDung")) || 0
};

const API = {
    RAO_BAN: `${CONFIG.API_BASE}/raoban`,
    GAMES: `${CONFIG.API_BASE}/games`,
    BUYING: `${CONFIG.API_BASE}/timmua`,
    CARDS: `${CONFIG.API_BASE}/cards`,
    ORDERS: `${CONFIG.API_BASE}/orders`
};

// DOM Elements cache
const DOM = {
    cardList: document.getElementById('cardList'),
    buyingList: document.getElementById('buyingList'),
    searchInput: document.getElementById('searchInput'),
    gameFilter: document.getElementById('gameFilter'),
    // Modals
    modalDetail: document.getElementById('cardDetailModal'),
    modalAddWant: document.getElementById('modalAddWant'),
    modalTrans: document.getElementById('modalTransaction'),
    // Modal Content
    cardDetails: document.getElementById('cardDetails'),
    // Transaction Modal Fields
    transZalo: document.getElementById('transZalo'),
    transBankName: document.getElementById('transBankName'),
    transBankNum: document.getElementById('transBankNum'),
    transContent: document.getElementById('transContent'),
    // Add Want Form
    formAddWant: document.getElementById('formAddWant'),
    wantSearchInput: document.getElementById('wantSearchInput'),
    wantSearchResults: document.getElementById('wantSearchResults'),
    matchSection: document.getElementById("matchSection")
};

/**
 * ====================================================================
 * TIỆN ÍCH (UTILS)
 * ====================================================================
 */

// Định dạng tiền tệ
const formatCurrency = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

// Chuẩn hóa chuỗi (xóa dấu, lowercase)
const normalizeText = (s) => {
    if (!s && s !== 0) return '';
    return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toLowerCase();
};

// Hàm Fetch Wrapper để xử lý lỗi chung
async function fetchData(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`API Error (${url}):`, err);
        throw err;
    }
}

// Quản lý Modal
const ModalManager = {
    show: (el) => {
        if (!el) return;
        el.classList.remove('hidden');
        el.classList.add('flex');
        document.body.style.overflow = 'hidden';
    },
    hide: (el) => {
        if (!el) return;
        el.classList.remove('flex');
        el.classList.add('hidden');
        document.body.style.overflow = '';
    },
    closeAll: () => {
        ModalManager.hide(DOM.modalDetail);
        ModalManager.hide(DOM.modalAddWant);
        ModalManager.hide(DOM.modalTrans);
        if (DOM.cardDetails) DOM.cardDetails.innerHTML = '';
    }
};

// Expose close function to window for HTML onclick
window.closeModal = ModalManager.closeAll;
window.closeWantModal = () => ModalManager.hide(DOM.modalAddWant);


/**
 * ====================================================================
 * LOGIC NGHIỆP VỤ & API (BUSINESS LOGIC)
 * ====================================================================
 */

// 1. Tải danh sách Rao Bán (Selling)
async function fetchCards(keyword = "", gameId = "") {
    if (!DOM.cardList) return;
    DOM.cardList.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 italic">Đang tải danh sách thẻ...</div>`;

    try {
        const params = new URLSearchParams({
            maNguoiDung: CONFIG.USER_ID,
            keyword: keyword.trim(),
            maTroChoi: gameId
        });

        const data = await fetchData(`${API.RAO_BAN}/search-combined?${params.toString()}`);
        const cards = data.data || data || [];

        if (cards.length === 0) {
            DOM.cardList.innerHTML = `<p class="col-span-full text-center py-10 text-gray-400">Không tìm thấy thẻ nào.</p>`;
        } else {
            renderCardList(cards);
        }
    } catch (error) {
        DOM.cardList.innerHTML = `<p class="col-span-full text-center text-red-500">Lỗi tải dữ liệu.</p>`;
    }
}

async function fetchBuyingList() {
    if (!DOM.buyingList) return;
    try {
        // [FIX] Truyền ID người dùng lên để server check xem đã liên hệ chưa
        const url = `${API.BUYING}/list?maNguoiDung=${CONFIG.USER_ID}`;
        const data = await fetchData(url);
        
        if (!data || data.length === 0) {
            DOM.buyingList.innerHTML = '<p class="col-span-full text-center text-gray-400 italic">Chưa có tin cần mua nào.</p>';
            return;
        }
        renderBuyingList(data);
    } catch (err) {
        console.error(err);
        DOM.buyingList.innerHTML = '<p class="text-red-500 col-span-full text-center">Lỗi tải danh sách mua.</p>';
    }
}

// 3. Kiểm tra Khớp lệnh (Matching)
async function checkMatches() {
    if (!CONFIG.USER_ID) return;

    try {
        const data = await fetchData(`${API.BUYING}/match/${CONFIG.USER_ID}`);
        
        if (data.success && data.matches && data.matches.length > 0) {
            renderMatches(data.matches);
        } else {
            if (DOM.matchSection) DOM.matchSection.classList.add("hidden");
        }
    } catch (err) {
        console.warn("Matching check failed:", err);
    }
}

// 4. Chi tiết thẻ
window.fetchCardDetail = async function(maRaoBan) {
    if (!DOM.cardDetails) return;
    ModalManager.show(DOM.modalDetail);
    DOM.cardDetails.innerHTML = '<p class="text-center text-blue-500 py-10"><i class="fas fa-spinner fa-spin"></i> Đang tải...</p>';

    try {
        const response = await fetchData(`${API.RAO_BAN}/detail/${maRaoBan}`);
        const card = response.data || response;
        if (!card) throw new Error("No data");
        renderCardDetailContent(card);
    } catch (error) {
        DOM.cardDetails.innerHTML = `<p class="text-red-500 text-center">Lỗi tải chi tiết: ${error.message}</p>`;
    }
};

/**
 * ====================================================================
 * RENDER FUNCTIONS (UI)
 * ====================================================================
 */

// script.js

function renderCardList(cards) {
    DOM.cardList.innerHTML = cards.map(card => {
        if (!card.MaRaoBan) return '';
        
        const isOwner = Number(card.MaNguoiDung) === CONFIG.USER_ID;
        // Kiểm tra xem có đơn hàng đang treo không
        const hasActiveOrder = card.TrangThaiDonHang && ['ChoXuLy', 'DaThanhToan', 'DangGiao'].includes(card.TrangThaiDonHang);
        // Kiểm tra xem mình có phải người mua thẻ này không
        const isMyOrder = hasActiveOrder && (Number(card.NguoiMuaId) === CONFIG.USER_ID);

        // Xử lý Giao diện (UI Logic)
        let btnAction = '';
        let statusBadge = '';
        let borderClass = 'border border-gray-100';
        let opacityClass = '';

        if (isOwner) {
            // TRƯỜNG HỢP 1: THẺ CỦA MÌNH
            borderClass = 'border-2 border-yellow-400 ring-2 ring-yellow-50';
            btnAction = `<span class="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full">Thẻ của bạn</span>`;
            
            if (hasActiveOrder) {
                statusBadge = `<div class="absolute top-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold shadow animate-pulse">Khách đã đặt</div>`;
            }

        } else if (isMyOrder) {
            // TRƯỜNG HỢP 2: MÌNH ĐÃ ĐẶT MUA
            borderClass = 'border-2 border-green-500 ring-2 ring-green-50';
            btnAction = `<button disabled class="text-sm bg-green-600 text-white px-4 py-1.5 rounded font-bold cursor-default shadow-sm">
                            <i class="fas fa-check-circle"></i> Bạn đã đặt mua
                         </button>`;
            statusBadge = `<div class="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-bold shadow">Đơn của bạn</div>`;

        } else if (hasActiveOrder) {
            // TRƯỜNG HỢP 3: NGƯỜI KHÁC ĐÃ ĐẶT
            opacityClass = 'opacity-70 grayscale-[50%]'; // Làm mờ nhẹ
            btnAction = `<button disabled class="text-sm bg-gray-300 text-gray-500 px-4 py-1.5 rounded cursor-not-allowed font-medium">
                            Đã có người đặt
                         </button>`;
            statusBadge = `<div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold shadow">Đã bán</div>`;
        } else {
            // TRƯỜNG HỢP 4: CÒN HÀNG -> NÚT MUA HIỆN LÊN
            btnAction = `<button onclick="handlePurchase(${card.MaRaoBan}, ${card.GiaBan})" 
                            class="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-bold transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                            <i class="fas fa-shopping-cart mr-1"></i> Mua ngay
                         </button>`;
        }

        return `
            <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full card-hover-effect ${borderClass} ${opacityClass} relative">
                
                ${statusBadge}

                <div class="relative cursor-pointer h-52 bg-gray-50 flex items-center justify-center p-2" onclick="fetchCardDetail(${card.MaRaoBan})">
                    <img src="${card.HinhAnh || 'https://via.placeholder.com/400x300?text=No+Img'}" 
                         class="max-w-full max-h-full object-contain drop-shadow-sm transition-transform duration-300 hover:scale-105">
                    
                    <div class="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold shadow text-gray-600 border border-gray-200 uppercase tracking-wider">
                        ${card.TinhTrang || 'Mới'}
                    </div>
                </div>

                <div class="p-4 flex flex-col flex-grow">
                    <p class="text-[10px] text-blue-500 font-bold uppercase tracking-widest mb-1">${card.TenTroChoi || 'Trading Card'}</p>
                    
                    <h3 class="text-base font-bold text-gray-800 leading-snug mb-3 line-clamp-2 cursor-pointer hover:text-blue-600 transition" 
                        onclick="fetchCardDetail(${card.MaRaoBan})">
                        ${card.TenThe}
                    </h3>
                    
                    <div class="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-400 font-medium">Giá bán</span>
                            <span class="text-lg font-extrabold text-red-600 leading-none">${formatCurrency(card.GiaBan)}</span>
                        </div>
                        <div>${btnAction}</div>
                    </div>
                    
                    <div class="mt-2 flex justify-between items-center text-xs text-gray-400">
                        <span><i class="fas fa-user-circle mr-1"></i> ${card.TenNguoiDung}</span>
                        <span>${new Date(card.NgayDang).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderBuyingList(items) {
    DOM.buyingList.innerHTML = items.map(item => {
        const imgSrc = item.HinhAnhHienThi || 'https://via.placeholder.com/300x400?text=Can+Mua';
        const priceDisplay = item.GiaMongMuon > 0 ? formatCurrency(item.GiaMongMuon) : "Thỏa thuận";
        const isOwner = Number(item.MaNguoiDung) === CONFIG.USER_ID;
        
        // [FIX] Logic hiển thị nút liên hệ
        let contactBtn;
        
        if (isOwner) {
            // Trường hợp 1: Tin của chính mình
            contactBtn = `<span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">Tin của bạn</span>`;
        } else if (item.DaLienHe === 1) { 
            // Trường hợp 2: Đã liên hệ rồi -> Hiện nút Disable
            contactBtn = `<button disabled class="text-xs border border-orange-300 text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-not-allowed font-medium">
                            <i class="fas fa-clock"></i> Đang chờ xử lý
                          </button>`;
        } else {
            // Trường hợp 3: Chưa liên hệ -> Hiện nút bấm
            contactBtn = `<button onclick="handleContactRequest(${item.MaCanMua})" class="text-xs border border-cyan-500 text-cyan-600 px-2 py-1 rounded hover:bg-cyan-50 font-medium transition">
                            <i class="fas fa-handshake"></i> Liên hệ bán
                          </button>`;
        }

        return `
            <div class="bg-white rounded-xl shadow-sm border border-cyan-100 overflow-hidden card-hover-effect flex flex-col h-full">
                <div class="relative w-full h-48 bg-gray-50">
                    <img src="${imgSrc}" class="w-full h-full object-cover sm:object-contain p-1">
                    <span class="absolute top-0 left-0 bg-cyan-600 text-white text-xs px-2 py-1 rounded-br font-bold shadow-sm">CẦN MUA</span>
                </div>
                <div class="p-3 flex flex-col flex-grow">
                    <h5 class="text-md font-bold text-gray-800 line-clamp-2 mb-1">${item.TieuDe}</h5>
                    <p class="text-xs text-gray-500 mb-2"><i class="fas fa-user-circle"></i> ${item.TenNguoiDung}</p>
                    
                    <div class="bg-gray-50 p-2 rounded mb-3 flex-grow border border-gray-100">
                        <p class="text-xs text-gray-700 line-clamp-3">${item.MoTa || 'Không có mô tả chi tiết.'}</p>
                    </div>
                    
                    <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                        <span class="text-lg font-bold text-cyan-700">${priceDisplay}</span>
                        ${contactBtn}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderMatches(matches) {
    const matchCount = document.getElementById("matchCount");
    const matchList = document.getElementById("matchList");
    
    if (DOM.matchSection) DOM.matchSection.classList.remove("hidden");
    if (matchCount) matchCount.textContent = matches.length;

    if (matchList) {
        matchList.innerHTML = matches.map(m => `
            <div class="bg-white p-3 rounded border-l-4 border-green-500 shadow-sm flex justify-between items-center">
                <div>
                    <p class="text-sm text-gray-600">Bạn cần: <strong class="text-gray-800">${m.TenThe}</strong> (${formatCurrency(m.GiaMongMuon)})</p>
                    <p class="text-sm mt-1">
                        <i class="fas fa-arrow-right text-green-500 mr-1"></i> 
                        Có người bán: <span class="text-green-600 font-bold text-lg">${formatCurrency(m.GiaNguoiBan)}</span>
                    </p>
                </div>
                <button onclick="fetchCardDetail(${m.MaRaoBan})" class="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 text-sm font-bold">Xem Ngay</button>
            </div>
        `).join('');
    }
}

function renderCardDetailContent(card) {
    const isOwner = Number(card.MaNguoiDung) === CONFIG.USER_ID;
    const btnHtml = isOwner 
        ? `<button disabled class="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded cursor-not-allowed">Đây là thẻ của bạn</button>`
        : `<button onclick="handlePurchase(${card.MaRaoBan}, ${card.GiaBan})" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded shadow-lg transform transition hover:-translate-y-1">MUA NGAY VỚI GIÁ ${formatCurrency(card.GiaBan)}</button>`;

    DOM.cardDetails.innerHTML = `
        <div class="flex flex-col md:flex-row gap-6">
            <div class="w-full md:w-1/3">
                <img src="${card.HinhAnh || 'https://via.placeholder.com/400'}" class="w-full rounded-lg shadow-md object-contain bg-gray-50 border">
            </div>
            <div class="w-full md:w-2/3 flex flex-col">
                <h2 class="text-3xl font-extrabold text-gray-900 mb-2">${card.TenThe}</h2>
                <p class="text-blue-600 font-medium mb-4">${card.TenTroChoi || 'N/A'}</p>
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-6 space-y-2">
                    <div class="flex justify-between border-b border-gray-200 pb-2">
                        <span class="text-gray-500">Giá bán:</span>
                        <span class="text-2xl font-bold text-red-600">${formatCurrency(card.GiaBan)}</span>
                    </div>
                    <div class="flex justify-between pt-2">
                        <span class="text-gray-500">Tình trạng:</span>
                        <span class="font-bold text-green-600">${card.TinhTrang}</span>
                    </div>
                    <div class="flex justify-between pt-2">
                        <span class="text-gray-500">Người bán:</span>
                        <span class="font-bold">${card.TenNguoiDung}</span>
                    </div>
                </div>
                <div class="prose text-gray-600 mb-6">
                    <h4 class="font-bold text-gray-800">Mô tả người bán:</h4>
                    <p>${card.MoTaRaoBan || 'Không có mô tả chi tiết.'}</p>
                </div>
                <div class="mt-auto">${btnHtml}</div>
            </div>
        </div>
    `;
}

/**
 * ====================================================================
 * XỬ LÝ SỰ KIỆN (HANDLERS)
 * ====================================================================
 */



// 1. Xử lý Mua Hàng (Transaction)
window.handlePurchase = async function(maRaoBan, giaBan) {
    if(event) event.stopPropagation();
    if (!CONFIG.USER_ID) return alert("Vui lòng đăng nhập!");
    if (!confirm("Bạn muốn mua thẻ này? Admin sẽ là trung gian giao dịch.")) return;

    // Loading State
    const btn = event.target; 
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Đang xử lý...";

    try {
        const data = await fetchData(`${API.ORDERS}/create-buy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                MaNguoiDung: CONFIG.USER_ID, 
                MaRaoBan: maRaoBan, 
                Gia: giaBan 
            })
        });

        if (data.success) {
            showTransactionModal(data.adminInfo, `MUA DH${data.orderId}`);
            ModalManager.closeAll();
            // Ẩn thẻ khỏi list hoặc reload
            fetchCards(DOM.searchInput.value, DOM.gameFilter.value); 
        } else {
            alert("THÔNG BÁO: " + data.error);
            fetchCards(DOM.searchInput.value, DOM.gameFilter.value);
        }
    } catch (err) {
        alert("Lỗi kết nối server");
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
};

// 2. Xử lý Liên Hệ (Bán cho người cần mua)
// script.js

async function handleContactRequest(maCanMua) {
    if(event) event.stopPropagation(); // Ngăn sự kiện click lan ra ngoài

    // Hiệu ứng loading cho nút bấm
    const btn = event.currentTarget; // Lấy chính xác cái nút đang bấm
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Xử lý...';

    try {
        const data = await fetchData(`${API.ORDERS}/create-contact`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                MaNguoiDung: CONFIG.USER_ID,
                MaCanMua: maCanMua
            })
        });

        if (data.success) {
            // Thành công: Hiện hướng dẫn GD
            showTransactionModal(data.adminInfo, `BAN THE YEU CAU #${maCanMua}`);
            
            // Cập nhật lại giao diện nút ngay lập tức thành "Đang chờ xử lý"
            btn.className = "text-xs border border-orange-300 text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-not-allowed";
            btn.innerHTML = '<i class="fas fa-clock"></i> Đang chờ xử lý';
            
        } else {
            // Thất bại (Đã gửi rồi): Hiện thông báo từ backend
            // data.error chính là câu "Bạn đã gửi yêu cầu này rồi..."
            alert("THÔNG BÁO: " + data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Lỗi kết nối hệ thống");
    } finally {
        // Nếu thất bại thì mở lại nút, nếu thành công thì giữ nguyên trạng thái disabled (nếu muốn)
        // Ở đây ta mở lại nếu có lỗi, còn thành công thì đã đổi giao diện ở trên rồi
        if (!data?.success) {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }
}

function showTransactionModal(adminInfo, contentMsg) {
    if(!DOM.modalTrans) return;
    DOM.transZalo.textContent = adminInfo.zalo;
    DOM.transBankName.textContent = adminInfo.bankName;
    DOM.transBankNum.textContent = adminInfo.bankAccount;
    DOM.transContent.textContent = contentMsg;
    ModalManager.show(DOM.modalTrans);
}

// 3. Xử lý Đăng tin cần mua
window.openWantModal = () => {
    if (!CONFIG.USER_ID) return alert("Vui lòng đăng nhập để đăng tin!");
    ModalManager.show(DOM.modalAddWant);
    DOM.formAddWant.reset();
    window.clearSelectedWant();
};

window.searchForWant = async () => {
    const keyword = DOM.wantSearchInput.value;
    DOM.wantSearchResults.innerHTML = '<p class="text-gray-500 text-center p-2">Đang tìm...</p>';

    try {
        const data = await fetchData(`${API.CARDS}/search?q=${encodeURIComponent(keyword)}&MaTroChoi=1`);
        if (!data || data.length === 0) {
            DOM.wantSearchResults.innerHTML = '<p class="text-red-500 text-center p-2">Không tìm thấy thẻ.</p>';
            return;
        }

        DOM.wantSearchResults.innerHTML = data.map(c => `
            <div class="flex items-center gap-3 p-2 hover:bg-cyan-50 cursor-pointer transition" 
                 onclick="selectCardForWant('${c.MaThe}', '${c.TenThe.replace(/'/g, "\\'")}', '${c.HinhAnh}')">
                <img src="${c.HinhAnh}" class="w-8 h-10 object-cover rounded">
                <div>
                    <p class="font-bold text-gray-800 text-sm">${c.TenThe}</p>
                    <p class="text-xs text-gray-500">ID: ${c.MaThe}</p>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error(e); }
};

window.selectCardForWant = (id, name, img) => {
    document.getElementById("wantMaThe").value = id;
    document.getElementById("wantTieuDe").value = `Cần mua thẻ: ${name}`;
    document.getElementById("selectedWantCard").classList.remove("hidden");
    document.getElementById("wantCardName").textContent = name;
    document.getElementById("wantCardImg").src = img;
    DOM.wantSearchResults.innerHTML = "";
    document.getElementById("wantHinhAnh").value = img;
};

window.clearSelectedWant = () => {
    document.getElementById("wantMaThe").value = "";
    document.getElementById("selectedWantCard").classList.add("hidden");
};

// Form submit event
if (DOM.formAddWant) {
    DOM.formAddWant.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            MaNguoiDung: CONFIG.USER_ID,
            MaThe: document.getElementById("wantMaThe").value || null,
            TieuDe: document.getElementById("wantTieuDe").value,
            GiaMongMuon: document.getElementById("wantGia").value,
            HinhAnh: document.getElementById("wantHinhAnh").value,
            MoTa: document.getElementById("wantMoTa").value
        };

        try {
            const result = await fetchData(`${API.BUYING}/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (result.success) {
                alert("Đăng tin thành công!");
                window.closeWantModal();
                fetchBuyingList();
            } else {
                alert("Lỗi: " + result.error);
            }
        } catch (err) { alert("Lỗi hệ thống"); }
    });
}

// 4. Load Games & Search Debounce
async function fetchGames() {
    if (!DOM.gameFilter) return;
    try {
        const data = await fetchData(API.GAMES);
        const list = Array.isArray(data) ? data : (data.data || []);
        
        DOM.gameFilter.innerHTML = '<option value="">-- Tất cả Trò chơi --</option>';
        list.forEach(g => {
            DOM.gameFilter.innerHTML += `<option value="${g.MaTroChoi}">${g.TenTroChoi}</option>`;
        });
    } catch (e) { console.error(e); }
}

let searchTimeout;
function handleFilterChange() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchCards(DOM.searchInput.value, DOM.gameFilter.value);
    }, 500);
}

if (DOM.searchInput) DOM.searchInput.addEventListener('input', handleFilterChange);
if (DOM.gameFilter) DOM.gameFilter.addEventListener('change', handleFilterChange);

/**
 * ====================================================================
 * MAIN INIT
 * ====================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
    fetchCards();
    fetchBuyingList();
    checkMatches();
});