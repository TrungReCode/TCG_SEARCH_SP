document.addEventListener('DOMContentLoaded', () => {
    // Xử lý chuyển trang đăng nhập/đăng ký
    const btnLogin = document.getElementById('btnLogin');
    const btnRegister = document.getElementById('btnRegister');

    if (btnLogin) {
        btnLogin.addEventListener('click', () => window.location.href = 'DangNhap_DangKy/login.html');
    }
    if (btnRegister) {
        btnRegister.addEventListener('click', () => window.location.href = 'DangNhap_DangKy/register.html');
    }

    // Tải dữ liệu
    loadGame();
    loadNews();
});

// --- HÀM TẢI DANH SÁCH TRÒ CHƠI ---
async function loadGame() {
    const choicesContainer = document.querySelector(".choices");
    choicesContainer.innerHTML = "Đang tải trò chơi...";

    try {
        const res = await fetch("http://localhost:3000/games");
        
        // Kiểm tra nếu server chưa chạy hoặc lỗi
        if (!res.ok) throw new Error(`Không thể kết nối Server (HTTP ${res.status})`);
        
        const games = await res.json();

        choicesContainer.innerHTML = "";
        
        if (!games || games.length === 0) { 
            choicesContainer.innerHTML = "Chưa có trò chơi nào."; 
            return; 
        }

        games.forEach(game => {
            const btn = document.createElement("button");
            btn.className = "choice";
            btn.dataset.game = game.MaTroChoi;

            // Xử lý tên file ảnh từ tên game
            const folderName = sanitizeName(game.TenTroChoi);
            const imgURL = `./SrcPicture/${folderName}.jpg`;

            // An toàn hóa tên game để hiển thị
            const safeTitle = escapeHtml(game.TenTroChoi);

            btn.innerHTML = `
                <img class="img" src="${imgURL}" alt="${safeTitle}" onerror="this.src='./SrcPicture/default.jpg'">
                <div class="label">${safeTitle}</div>
            `;

            btn.addEventListener('click', () => {
                localStorage.setItem('MaTroChoi', game.MaTroChoi);
                // Điều hướng: TênGame/TênGame.html
                const page = `${folderName}/${folderName}.html`;
                window.location.href = page;
            });

            choicesContainer.appendChild(btn);
        });

    } catch (err) {
        console.error(err);
        choicesContainer.innerHTML = `<div style="color:red">Lỗi tải trò chơi. Hãy đảm bảo Server đang chạy.<br><small>${err.message}</small></div>`;
    }
}

// --- HÀM TẢI DANH SÁCH TIN TỨC (QUAN TRỌNG: Đã sửa lỗi hiển thị HTML) ---
async function loadNews() {
    const newsList = document.getElementById("newsList");
    newsList.innerHTML = "Đang tải tin tức...";

    try {
        const res = await fetch("http://localhost:3000/tintuc");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        newsList.innerHTML = "";
        
        if (!data || data.length === 0) { 
            newsList.innerHTML = "Chưa có tin tức nào."; 
            return; 
        }

        // Đảo ngược mảng để tin mới nhất lên đầu (tùy chọn)
        data.reverse().forEach(item => {
            const div = document.createElement("div");
            div.className = "news-item";
            
            // 1. Tiêu đề: Chỉ lấy văn bản thuần (tránh lỗi giao diện)
            const safeTitle = escapeHtml(item.TieuDe);
            
            // 2. Nội dung: Dùng DOMPurify để hiển thị HTML an toàn (giữ lại thẻ <a>, <b>, <i>...)
            // Đây là phần sửa lỗi hiển thị link của bạn
            const safeContent = DOMPurify.sanitize(item.NoiDung, {
                ADD_ATTR: ['target'] // Cho phép thuộc tính target="_blank" nếu có
            });

            div.innerHTML = `
                <div class="news-title">${safeTitle}</div>
                <div class="news-date">${new Date(item.NgayTao).toLocaleString('vi-VN')}</div>
                <div class="news-content">${safeContent}</div>
            `;
            
            newsList.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        newsList.innerHTML = `<div style="color:red">Lỗi tải tin tức: ${err.message}</div>`;
    }
}

// --- CÁC HÀM HỖ TRỢ ---

// Hàm tạo slug (biến tên có dấu thành không dấu gạch nối)
// Ví dụ: "Thần Bài" -> "than-bai"
function sanitizeName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu
        .replace(/[^\w\s-]/g, '')    // Bỏ ký tự đặc biệt
        .replace(/\s+/g, '-')        // Thay khoảng trắng bằng -
        .toLowerCase();
}

// Hàm thay thế cho sanitizeHTML cũ (Dùng cho Tiêu đề)
// Chỉ đơn giản là biến ký tự đặc biệt thành text để không bị lỗi layout
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}