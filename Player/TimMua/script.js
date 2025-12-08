// --- CẤU HÌNH API ---
const API_BASE_URL = "http://localhost:3000/raoban"; 
const API_GAME_URL = "http://localhost:3000/games"; 
const API_BUYING_URL = "http://localhost:3000/timmua"; // API Tin Cần Mua
const API_CARDS_URL = "http://localhost:3000/cards";   // API Tìm thẻ gốc (cho modal)

const CURRENT_USER_ID = Number(localStorage.getItem("maNguoiDung")) || 0; 

// --- DOM ELEMENTS ---
const cardListElement = document.getElementById('cardList');
const buyingListElement = document.getElementById('buyingList'); // List mới
const searchInput = document.getElementById('searchInput');
const gameFilter = document.getElementById('gameFilter');
const modal = document.getElementById('cardDetailModal');
const modalAddWant = document.getElementById('modalAddWant'); // Modal mới
const cardDetails = document.getElementById('cardDetails');

// ====================================================
// 1. LOGIC RAO BÁN (SELLING)
// ====================================================

async function fetchCards(keyword = "", gameId = "") {
    const finalKeyword = keyword.trim() || "";
    const finalGameId = gameId || ""; 

    if (!cardListElement) return;
    cardListElement.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 italic">Đang tải danh sách thẻ...</div>`;

    try {
        const params = new URLSearchParams({
            maNguoiDung: CURRENT_USER_ID,
            keyword: finalKeyword,
            maTroChoi: finalGameId 
        });

        const response = await fetch(`${API_BASE_URL}/search-combined?${params.toString()}`);
        if (!response.ok) throw new Error("Lỗi kết nối");
        
        const data = await response.json();
        const cards = data.data || data || [];

        if (cards.length === 0) {
            cardListElement.innerHTML = `<p class="col-span-full text-center py-10 text-gray-400">Không tìm thấy thẻ nào.</p>`;
        } else {
            renderCardList(cards);
        }
    } catch (error) {
        console.error("Lỗi Fetch Cards:", error);
        cardListElement.innerHTML = `<p class="col-span-full text-center text-red-500">Lỗi tải dữ liệu.</p>`;
    }
}

function renderCardList(cards) {
    cardListElement.innerHTML = '';
    cards.forEach(card => {
        if (!card.MaRaoBan) return;
        const isOwner = Number(card.MaNguoiDung) === CURRENT_USER_ID;
        
        // Style khác biệt nếu là thẻ của mình
        const borderClass = isOwner ? 'border-2 border-yellow-400 ring-2 ring-yellow-100' : 'border border-gray-100';
        
        const btnAction = isOwner 
            ? `<span class="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Của bạn</span>`
            : `<button onclick="handlePurchase(${card.MaRaoBan})" class="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded transition">Mua</button>`;

        const html = `
            <div class="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full card-hover-effect ${borderClass}">
                <div class="relative cursor-pointer h-48 bg-gray-100" onclick="fetchCardDetail(${card.MaRaoBan})">
                    <img src="${card.HinhAnh || 'https://via.placeholder.com/400x300?text=No+Img'}" class="w-full h-full object-contain p-2">
                    <div class="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded text-xs font-bold shadow text-gray-600">
                        ${card.TinhTrang || 'Mới'}
                    </div>
                </div>
                <div class="p-4 flex flex-col flex-grow">
                    <p class="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-1">${card.TenTroChoi || 'Game'}</p>
                    <h3 class="text-lg font-bold text-gray-800 leading-tight mb-2 truncate cursor-pointer hover:text-blue-600" onclick="fetchCardDetail(${card.MaRaoBan})">${card.TenThe}</h3>
                    
                    <div class="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span class="text-xl font-extrabold text-red-600">${formatCurrency(card.GiaBan)}</span>
                        ${btnAction}
                    </div>
                    <div class="mt-1 text-xs text-gray-400 text-right">Bởi: ${card.TenNguoiDung}</div>
                </div>
            </div>
        `;
        cardListElement.innerHTML += html;
    });
}

// ====================================================
// 2. LOGIC TIN CẦN MUA (BUYING REQUESTS)
// ====================================================

async function fetchBuyingList() {
    if (!buyingListElement) return;
    try {
        const res = await fetch(`${API_BUYING_URL}/list`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            buyingListElement.innerHTML = '<p class="col-span-full text-center text-gray-400 italic">Chưa có tin cần mua nào.</p>';
            return;
        }

        buyingListElement.innerHTML = data.map(item => {
            const imgSrc = item.HinhAnhHienThi || 'https://via.placeholder.com/300x400?text=Can+Mua';
            const priceDisplay = item.GiaMongMuon > 0 ? formatCurrency(item.GiaMongMuon) : "Thỏa thuận";
            const description = item.MoTa || 'Không có mô tả chi tiết.';

            return `
                <div class="bg-white rounded-xl shadow-sm border border-cyan-100 overflow-hidden card-hover-effect flex flex-col h-full">
                    <div class="relative w-full h-48 bg-gray-50">
                        <img src="${imgSrc}" class="w-full h-full object-cover sm:object-contain p-1">
                        <span class="absolute top-0 left-0 bg-cyan-600 text-white text-xs px-2 py-1 rounded-br">CẦN MUA</span>
                    </div>
                    <div class="p-3 flex flex-col flex-grow">
                        <h5 class="text-md font-bold text-gray-800 line-clamp-2 mb-1">${item.TieuDe}</h5>
                        <p class="text-xs text-gray-500 mb-2"><i class="fas fa-user"></i> ${item.TenNguoiDung}</p>
                        
                        <div class="bg-gray-50 p-2 rounded mb-3 flex-grow">
                            <p class="text-xs text-gray-700 line-clamp-3">${description}</p>
                        </div>
                        
                        <div class="flex justify-between items-center mt-auto pt-3 border-t border-gray-100">
                            <span class="text-lg font-bold text-cyan-700">${priceDisplay}</span>
                            <button class="text-xs border border-cyan-500 text-cyan-600 px-2 py-1 rounded hover:bg-cyan-50">Liên hệ</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        buyingListElement.innerHTML = '<p class="text-red-500 col-span-full text-center">Lỗi tải danh sách mua.</p>';
    }
}

// ====================================================
// 3. LOGIC MATCHING (KHỚP LỆNH)
// ====================================================

async function checkMatches() {
    if (!CURRENT_USER_ID) return; 

    try {
        const res = await fetch(`${API_BUYING_URL}/match/${CURRENT_USER_ID}`);
        const data = await res.json();

        const matchSec = document.getElementById("matchSection");
        const matchCount = document.getElementById("matchCount");
        const matchList = document.getElementById("matchList");

        if (data.success && data.matches && data.matches.length > 0) {
            matchSec.classList.remove("hidden"); // Hiện khung
            matchCount.textContent = data.matches.length;
            
            matchList.innerHTML = data.matches.map(m => `
                <div class="bg-white p-3 rounded border-l-4 border-green-500 shadow-sm flex justify-between items-center">
                    <div>
                        <p class="text-sm text-gray-600">Bạn cần: <strong class="text-gray-800">${m.TenThe}</strong> (${formatMoney(m.GiaMongMuon)})</p>
                        <p class="text-sm mt-1">
                            <i class="fas fa-arrow-right text-green-500 mr-1"></i> 
                            Có người bán: <span class="text-green-600 font-bold text-lg">${formatMoney(m.GiaNguoiBan)}</span>
                        </p>
                    </div>
                    <button onclick="fetchCardDetail(${m.MaRaoBan})" class="bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 text-sm font-bold">
                        Xem Ngay
                    </button>
                </div>
            `).join('');
        } else {
            matchSec.classList.add("hidden");
        }
    } catch (err) {
        console.error("Lỗi check match:", err);
    }
}

// ====================================================
// 4. MODAL LOGIC (CHI TIẾT + ĐĂNG TIN)
// ====================================================

// --- Modal Chi Tiết Thẻ ---
async function fetchCardDetail(maRaoBan) {
    if (!cardDetails) return;
    showModal(modal);
    cardDetails.innerHTML = '<p class="text-center text-blue-500 py-10"><i class="fas fa-spinner fa-spin"></i> Đang tải...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/detail/${maRaoBan}`);
        if (!response.ok) throw new Error("Lỗi HTTP");
        const data = await response.json();
        const card = data.data || data;

        if (!card) throw new Error("Không có dữ liệu");

        const isOwner = Number(card.MaNguoiDung) === CURRENT_USER_ID;
        const btnHtml = isOwner 
            ? `<button disabled class="w-full bg-gray-300 text-gray-600 font-bold py-3 rounded cursor-not-allowed">Đây là thẻ của bạn</button>`
            : `<button onclick="handlePurchase(${card.MaRaoBan})" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded shadow-lg transform transition hover:-translate-y-1">MUA NGAY VỚI GIÁ ${formatCurrency(card.GiaBan)}</button>`;

        cardDetails.innerHTML = `
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

                    <div class="mt-auto">
                        ${btnHtml}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        cardDetails.innerHTML = `<p class="text-red-500 text-center">Lỗi tải chi tiết: ${error.message}</p>`;
    }
}

// --- Modal Đăng Tin Mua ---
function openWantModal() {
    if(!CURRENT_USER_ID) return alert("Vui lòng đăng nhập để đăng tin!");
    showModal(modalAddWant);
    document.getElementById("formAddWant").reset();
    clearSelectedWant();
}

function closeWantModal() {
    closeModalLogic(modalAddWant);
}

// Tìm thẻ trong Modal (cho Tin Mua)
async function searchForWant() {
    const keyword = document.getElementById("wantSearchInput").value;
    const resultBox = document.getElementById("wantSearchResults");
    resultBox.innerHTML = '<p class="text-gray-500 text-center p-2">Đang tìm...</p>';
    
    try {
        // Gọi API search thẻ gốc
        const res = await fetch(`${API_CARDS_URL}/search?q=${encodeURIComponent(keyword)}&MaTroChoi=1`); // Mặc định MaTroChoi=1 hoặc lấy từ dropdown
        const data = await res.json();

        if(!data || data.length === 0) {
            resultBox.innerHTML = '<p class="text-red-500 text-center p-2">Không tìm thấy thẻ.</p>';
            return;
        }

        resultBox.innerHTML = data.map(c => `
            <div class="flex items-center gap-3 p-2 hover:bg-cyan-50 cursor-pointer transition" 
                 onclick="selectCardForWant('${c.MaThe}', '${c.TenThe.replace(/'/g, "\\'")}', '${c.HinhAnh}')">
                <img src="${c.HinhAnh}" class="w-8 h-10 object-cover rounded">
                <div>
                    <p class="font-bold text-gray-800 text-sm">${c.TenThe}</p>
                    <p class="text-xs text-gray-500">ID: ${c.MaThe}</p>
                </div>
            </div>
        `).join('');
    } catch(e) { console.error(e); }
}

window.selectCardForWant = function(id, name, img) {
    document.getElementById("wantMaThe").value = id;
    document.getElementById("wantTieuDe").value = `Cần mua thẻ: ${name}`; 
    document.getElementById("selectedWantCard").classList.remove("hidden");
    document.getElementById("wantCardName").textContent = name;
    document.getElementById("wantCardImg").src = img;
    document.getElementById("wantSearchResults").innerHTML = ""; 
    document.getElementById("wantHinhAnh").value = img; // Tự điền link ảnh luôn
}

window.clearSelectedWant = function() {
    document.getElementById("wantMaThe").value = "";
    document.getElementById("selectedWantCard").classList.add("hidden");
}

// Submit Form Đăng Tin
document.getElementById("formAddWant").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const payload = {
        MaNguoiDung: CURRENT_USER_ID,
        MaThe: document.getElementById("wantMaThe").value || null,
        TieuDe: document.getElementById("wantTieuDe").value,
        GiaMongMuon: document.getElementById("wantGia").value,
        HinhAnh: document.getElementById("wantHinhAnh").value,
        MoTa: document.getElementById("wantMoTa").value
    };

    try {
        const res = await fetch(`${API_BUYING_URL}/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        
        if (result.success) {
            alert("Đăng tin thành công!");
            closeWantModal();
            fetchBuyingList(); // Refresh list
        } else {
            alert("Lỗi: " + result.error);
        }
    } catch(err) { alert("Lỗi hệ thống"); }
});


// ====================================================
// 5. HELPER FUNCTIONS & INIT
// ====================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
// Helper riêng cho Matching box (để tên khác cho gọn)
function formatMoney(amount) { return formatCurrency(amount); }

function showModal(modalEl) {
    modalEl.classList.remove('hidden');
    modalEl.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeModalLogic(modalEl) {
    modalEl.classList.remove('flex');
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
}
window.closeModal = function() { closeModalLogic(modal); }

// Mua hàng giả lập
window.handlePurchase = function(maRaoBan) {
    if(event) event.stopPropagation();
    if (!CURRENT_USER_ID) return alert("Vui lòng đăng nhập!");
    if(confirm("Xác nhận mua thẻ này?")) alert("Đã gửi yêu cầu mua!");
}

// Fetch Games (Dropdown)
async function fetchGames() {
    if (!gameFilter) return;
    try {
        const res = await fetch(API_GAME_URL);
        const games = await res.json();
        const list = Array.isArray(games) ? games : (games.data || []);
        
        gameFilter.innerHTML = '<option value="">-- Tất cả Trò chơi --</option>';
        list.forEach(g => {
            gameFilter.innerHTML += `<option value="${g.MaTroChoi}">${g.TenTroChoi}</option>`;
        });
    } catch(e) { console.error(e); }
}

// Xử lý Search Debounce
let searchTimeout;
function handleFilterChange() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        fetchCards(searchInput.value, gameFilter.value); 
    }, 500); 
}
if (searchInput) searchInput.addEventListener('input', handleFilterChange);
if (gameFilter) gameFilter.addEventListener('change', handleFilterChange);


// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
    fetchCards();      // Load thẻ bán
    fetchBuyingList(); // Load tin mua
    checkMatches();    // Check khớp lệnh
});