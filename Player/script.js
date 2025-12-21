document.addEventListener('DOMContentLoaded', () => {
    // Xử lý sự kiện các nút
    const btnLogout = document.getElementById('btnLogout');
    const btnCollection = document.getElementById('btnCollection');
    const btnSaleList = document.getElementById('btnSaleList');
    const btnFindSale = document.getElementById('btnFindSale');

    if (btnLogout) btnLogout.addEventListener('click', () => window.location.href = '../index.html');
    if (btnCollection) btnCollection.addEventListener('click', () => window.location.href = './QuanLyBoSuuTap/quanLyBoSuuTap.html');
    if (btnSaleList) btnSaleList.addEventListener('click', () => window.location.href = './DSRaoBan/raoban.html');
    if (btnFindSale) btnFindSale.addEventListener('click', () => window.location.href = './TimMua/timmua.html');
    
    loadGame();
    loadNews();
});

// --- Tải danh sách Game ---
async function loadGame() {
    const choicesContainer = document.querySelector(".choices");
    choicesContainer.innerHTML = "Đang tải trò chơi...";

    try {
        const res = await fetch("http://localhost:3000/games");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

            // Xử lý đường dẫn ảnh
            const folderName = sanitizeName(game.TenTroChoi);
            const imgURL = `../SrcPicture/${folderName}.jpg`;
            const safeTitle = escapeHtml(game.TenTroChoi);

            btn.innerHTML = `
                <img class="img" src="${imgURL}" alt="${safeTitle}" onerror="this.src='../SrcPicture/default.jpg'">
                <div class="label">${safeTitle}</div>
            `;

            btn.addEventListener('click', () => {
                localStorage.setItem('MaTroChoi', game.MaTroChoi);
                // Đường dẫn: ../TênGame/TênGame.html
                const page = `../${folderName}/${folderName}.html`;
                window.location.href = page;
            });

            choicesContainer.appendChild(btn);
        });

    } catch (err) {
        console.error(err);
        choicesContainer.innerHTML = `<div style="color:red">Lỗi kết nối Server: ${err.message}</div>`;
    }
}

// --- Tải tin tức (Đã sửa lỗi hiển thị HTML) ---
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

        // Hiển thị tin mới nhất
        data.reverse().forEach(item => {
            const div = document.createElement("div");
            div.className = "news-item";
            
            const safeTitle = escapeHtml(item.TieuDe);
            
            // SỬA LỖI: Dùng DOMPurify để hiển thị link, màu sắc, in đậm...
            const safeContent = DOMPurify.sanitize(item.NoiDung, {
                ADD_ATTR: ['target'] // Cho phép mở link tab mới
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

// Hàm xử lý tên file/folder (VD: "Thần Bài" -> "than-bai")
function sanitizeName(name) {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

// Hàm thay thế sanitizeHTML cũ (Chỉ dùng cho Tiêu đề để tránh vỡ khung)
function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}