/**
 * File: script.js
 * Chức năng: Xử lý giao diện tìm mua thẻ, chỉ với Tìm kiếm theo Tên thẻ và Lọc theo Trò chơi.
 * Đã sửa đổi: Tích hợp logic IsOwner từ endpoint search-combined.
 */

// ====================================================
// 📌 CẤU HÌNH API VÀ BIẾN TOÀN CỤC
// ====================================================

const API_BASE_URL = "http://localhost:3000/raoban";
const API_GAME_URL = "http://localhost:3000/games"; 

// Lấy ID người dùng và đảm bảo là kiểu Number. Nếu không có, gán 0.
const CURRENT_USER_ID = Number(localStorage.getItem("maNguoiDung")) || 0; 


// --- Tham chiếu DOM ---
// Đảm bảo các ID này tồn tại trong HTML (ví dụ: đang dùng Tailwind CSS classes)
const cardListElement = document.getElementById('cardList');
const searchInput = document.getElementById('searchInput');
const gameFilter = document.getElementById('gameFilter');
const modal = document.getElementById('cardDetailModal');
const cardDetails = document.getElementById('cardDetails');


// ====================================================
// 1. HÀM GỌI API
// ====================================================

/**
 * Lấy danh sách thẻ rao bán với tìm kiếm theo keyword VÀ lọc theo MaTroChoi
 * @param {string} keyword - Từ khóa tìm kiếm (tên thẻ)
 * @param {number|string} gameId - ID trò chơi cần lọc (hoặc rỗng/0 nếu không lọc)
 */
async function fetchCards(keyword = "", gameId = "") { // gameId: dùng "" thay vì null để dễ truyền vào URL
    const finalKeyword = keyword.trim() || "";
    const finalGameId = gameId || ""; 

    if (!cardListElement) return; // Bảo vệ nếu DOM chưa sẵn sàng

    // Hiển thị thông báo đang tải
    cardListElement.innerHTML = `<div id="loadingMessage" class="col-span-full text-center py-10 text-gray-500">Đang tải danh sách thẻ...</div>`;

    try {
        // Xây dựng chuỗi query string với cả 3 tham số
        const params = new URLSearchParams({
            maNguoiDung: CURRENT_USER_ID, // Bắt buộc để Backend xác định IsOwner
            keyword: finalKeyword,        
            maTroChoi: finalGameId        
        });

        const url = `${API_BASE_URL}/search-combined?${params.toString()}`;

        const response = await fetch(url);
        
        // SỬA: Xử lý lỗi HTTP và JSON rõ ràng hơn
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            const errorMessage = errorBody.error || `Lỗi HTTP ${response.status}`;
            throw new Error(errorMessage);
        }
        
        const data = await response.json();

        if (!data.success) {
            cardListElement.innerHTML = `<p class="col-span-full text-center text-red-500">${data.error || "Lỗi khi tải dữ liệu."}</p>`;
            return;
        }

        if (data.data.length === 0) {
            cardListElement.innerHTML = `<p class="col-span-full text-center py-10 text-gray-500">Không tìm thấy thẻ rao bán nào phù hợp.</p>`;
        } else {
            renderCardList(data.data);
        }

    } catch (error) {
        console.error("Lỗi Fetch Cards:", error);
        cardListElement.innerHTML = `<p class="col-span-full text-center text-red-500">Lỗi kết nối máy chủ hoặc ${error.message}</p>`;
    }
}

// ====================================================
// 1. HÀM GỌI API (ĐÃ SỬA)
// ====================================================

/**
 * Lấy chi tiết thẻ rao bán và hiển thị Modal
 * @param {number} maRaoBan - Mã rao bán
 */
async function fetchCardDetail(maRaoBan) {
    if (!cardDetails) return;

    try {
        cardDetails.innerHTML = '<p class="text-center text-blue-500">Đang tải chi tiết...</p>';
        showModal();

        const response = await fetch(`${API_BASE_URL}/detail/${maRaoBan}`);
        
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody.error || `Lỗi HTTP ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.success) {
            cardDetails.innerHTML = `<p class="text-red-500">Lỗi: ${data.message || data.error}</p>`;
            return;
        }

        // --- SỬA LỖI TẠI ĐÂY ---
        const cardDetail = data.data; // Gán data.data vào biến cardDetail

        if (!cardDetail) {
            cardDetails.innerHTML = `<p class="text-red-500">Không tìm thấy dữ liệu thẻ chi tiết.</p>`;
            return;
        }

        // Bây giờ cardDetail đã được định nghĩa
        const isOwner = cardDetail.MaNguoiDung === CURRENT_USER_ID; 

        // Truyền chi tiết thẻ cùng với trạng thái IsOwner vào hàm render
        renderCardDetail({...cardDetail, IsOwner: isOwner});
    } catch (error) {
        console.error("Lỗi Fetch chi tiết:", error);
        cardDetails.innerHTML = `<p class="text-red-500">Lỗi kết nối máy chủ hoặc ${error.message}</p>`;
    }
}

/**
 * Giả lập lấy danh sách game để điền vào dropdown lọc
 */
async function fetchGames() {
    if (!gameFilter) return;

    try {
        const response = await fetch(API_GAME_URL); 
        const games = await response.json(); 

        // SỬA: Kiểm tra nếu đã có option "Tất cả Trò chơi" rồi thì không thêm lại
        if (gameFilter.childElementCount === 0 || gameFilter.firstElementChild.value !== "") {
             const defaultOption = document.createElement('option');
             defaultOption.value = "";
             defaultOption.textContent = "-- Tất cả Trò chơi --";
             gameFilter.appendChild(defaultOption);
        }

        // Thêm các game từ API
        if (Array.isArray(games)) {
            games.forEach(game => {
                // Kiểm tra tránh trùng lặp nếu người dùng gọi hàm fetchGames nhiều lần
                if (!gameFilter.querySelector(`option[value="${game.MaTroChoi}"]`)) {
                    const option = document.createElement('option');
                    option.value = game.MaTroChoi;
                    option.textContent = game.TenTroChoi;
                    gameFilter.appendChild(option);
                }
            });
        }
    } catch (error) {
        console.error("Lỗi Fetch Games:", error);
    }
}


// ====================================================
// 2. HÀM RENDER (HIỂN THỊ)
// ====================================================

/**
 * Render danh sách thẻ rao bán ra giao diện
 * @param {Array<Object>} cards - Danh sách thẻ
 */
function renderCardList(cards) {
    cardListElement.innerHTML = '';
    cards.forEach(card => {
        if (!card.MaRaoBan || !card.TenThe || !card.TenNguoiDung || !card.GiaBan) return;

        // KIỂM TRA IS OWNER
        const isOwner = card.IsOwner === 1; // Backend trả về 1 hoặc 0
        const ownerClass = isOwner ? 'border-2 border-yellow-500 shadow-xl' : '';
        const actionButton = isOwner 
            ? `<button disabled class="mt-2 w-full px-4 py-2 bg-yellow-400 text-gray-800 font-semibold rounded-lg">Thẻ của bạn</button>`
            : `<button onclick="handlePurchase(${card.MaRaoBan})" class="mt-2 w-full px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition duration-150">Mua ngay</button>`;

        const cardHtml = `
            <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 overflow-hidden ${ownerClass}"
                 onclick="fetchCardDetail(${card.MaRaoBan})">
                <img src="${card.HinhAnh || 'https://via.placeholder.com/400x300?text=Khong+co+anh'}" 
                     alt="${card.TenThe}" 
                     class="w-full h-48 object-cover">
                <div class="p-4">
                    <p class="text-xs font-medium text-blue-500 mb-1">${card.TenTroChoi || 'Game N/A'}</p>
                    <h3 class="text-xl font-semibold text-gray-900 truncate">${card.TenThe}</h3>
                    ${isOwner ? '<p class="text-sm font-medium text-yellow-600">Bạn đang rao bán</p>' : ''}
                    <p class="text-2xl font-bold text-red-600 mt-1">${formatCurrency(card.GiaBan)}</p>
                    <div class="mt-2 text-sm text-gray-600">
                        <p>Trạng thái: <span class="font-medium text-green-600">${card.TinhTrang || 'Mới'}</span></p>
                        <p>Rao bán bởi: <span class="font-medium">${card.TenNguoiDung}</span></p>
                    </div>
                    ${actionButton}
                </div>
            </div>
        `;
        cardListElement.innerHTML += cardHtml;
    });
}

/**
 * Render chi tiết thẻ rao bán trong Modal
 * @param {Object} card - Chi tiết thẻ (bao gồm trường IsOwner nếu có)
 */
function renderCardDetail(card) {
    const isOwner = card.MaNguoiDung === CURRENT_USER_ID; // Kiểm tra lại quyền sở hữu
    const buyButton = isOwner 
        ? `<button disabled class="mt-4 w-full px-6 py-3 bg-yellow-400 text-gray-800 font-bold rounded-lg opacity-80 cursor-not-allowed">Đã đăng bán</button>`
        : `<button onclick="handlePurchase(${card.MaRaoBan})" class="mt-4 w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition duration-150 shadow-lg">MUA NGAY</button>`;

    cardDetails.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex-shrink-0">
                <img src="${card.HinhAnh || 'https://via.placeholder.com/400x300?text=Khong+co+anh'}" 
                    alt="${card.TenThe}" 
                    class="w-full md:w-48 h-auto rounded-lg shadow-md">
            </div>
            <div class="flex-grow">
                <h4 class="text-3xl font-bold text-gray-900 mb-2">${card.TenThe}</h4>
                <p class="text-lg text-gray-500">Game: <span class="font-medium text-gray-700">${card.TenTroChoi || "N/A"}</span></p>
                
                ${isOwner 
                    ? '<p class="text-xl font-semibold text-yellow-600 mt-2 mb-4">Bạn đang là người rao bán thẻ này.</p>' 
                    : `<p class="text-lg text-gray-500">Người bán: <span class="font-medium text-gray-700">${card.TenNguoiDung}</span></p>`
                }

                <p class="text-4xl font-extrabold text-red-700 my-4">${formatCurrency(card.GiaBan)}</p>
                
                <div class="space-y-2 text-gray-700">
                    <p><span class="font-semibold">Tình trạng:</span> <span class="text-green-600">${card.TinhTrang}</span></p>
                    <p><span class="font-semibold">Mô tả rao bán:</span> ${card.MoTaRaoBan || 'Không có mô tả.'}</p>
                </div>
                
                <div class="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400">
                    <p class="text-sm text-gray-500">Đăng ngày: ${new Date(card.NgayDang).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
        
        <div class="mt-6 flex justify-end gap-3">
             ${buyButton}
             <button onclick="closeModal()" 
                    class="px-6 py-2 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition duration-150 shadow-md">
                Đóng
            </button>
        </div>
    `;
}


// ====================================================
// 3. HÀM TIỆN ÍCH VÀ XỬ LÝ SỰ KIỆN
// ====================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function showModal() {
    // SỬA: Kiểm tra modal trước khi thêm class
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

window.closeModal = function () { 
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        cardDetails.innerHTML = ''; 
    }
}

// Hàm giả lập xử lý mua hàng (cần triển khai ở backend)
function handlePurchase(maRaoBan) {
    if (CURRENT_USER_ID === 0) {
        alert("Vui lòng đăng nhập để thực hiện giao dịch mua hàng!");
        return;
    }
    // Gửi request mua hàng đến Backend
    alert(`Xác nhận mua thẻ rao bán #${maRaoBan}. (Logic Backend cần được triển khai)`);
}


// Xử lý tìm kiếm/lọc khi người dùng nhập/chọn (Debounce)
let searchTimeout;
function handleFilterChange() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        // Lấy giá trị MaTroChoi (ID) và Keyword (Tên thẻ)
        const gameId = gameFilter ? gameFilter.value : "";
        const keyword = searchInput ? searchInput.value : "";
        
        // Gọi fetchCards với cả hai giá trị
        fetchCards(keyword, gameId); 
    }, 500); // Đợi 500ms sau khi ngừng thao tác
}

// Gán sự kiện cho cả hai bộ lọc
if (searchInput) searchInput.addEventListener('input', handleFilterChange);
if (gameFilter) gameFilter.addEventListener('change', handleFilterChange);


// --- Khởi tạo ---
document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
    fetchCards();
});