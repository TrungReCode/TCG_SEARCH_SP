document.addEventListener('DOMContentLoaded', () => {

    document.getElementById('btnLogout').addEventListener('click', () => window.location.href = '../index.html');
    document.getElementById('btnCollection').addEventListener('click', () => window.location.href = './QuanLyBoSuuTap/quanLyBoSuuTap.html');
    document.getElementById('btnSaleList').addEventListener('click', () => window.location.href = './DSRaoBan/raoban.html');
    document.getElementById('btnFindSale').addEventListener('click', () => window.location.href = './TimMua/timmua.html');
    loadGame();
    loadNews();
});

async function loadGame() {
    const choicesContainer = document.querySelector(".choices");
    choicesContainer.innerHTML = "Đang tải trò chơi...";

    try {
        const res = await fetch("http://localhost:3000/games");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const games = await res.json();

        choicesContainer.innerHTML = "";
        if (!games.length) { choicesContainer.innerHTML = "Chưa có trò chơi nào."; return; }

        games.forEach(game => {
            const btn = document.createElement("button");
            btn.className = "choice";
            btn.dataset.game = game.MaTroChoi;

            const imgURL = `../SrcPicture/${game.TenTroChoi.replace(/\s/g, '-').toLowerCase()}.jpg`;
            btn.innerHTML = `<img class="img" src="${imgURL}" alt="${sanitizeHTML(game.TenTroChoi)}">
                             <div class="label">${sanitizeHTML(game.TenTroChoi)}</div>`;

            btn.addEventListener('click', () => {
                localStorage.setItem('MaTroChoi', game.MaTroChoi);
                const folderName = sanitizeName(game.TenTroChoi);
                const page = `../${folderName}/${folderName}.html`;
                window.location.href = page;
            });

            choicesContainer.appendChild(btn);
        });

    } catch (err) {
        console.error(err);
        choicesContainer.innerHTML = `Lỗi tải trò chơi: ${err.message}`;
    }
}

async function loadNews() {
    const newsList = document.getElementById("newsList");
    newsList.innerHTML = "Đang tải tin tức...";

    try {
        const res = await fetch("http://localhost:3000/tintuc");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        newsList.innerHTML = "";
        if (!data.length) { newsList.innerHTML = "Chưa có tin tức nào."; return; }

        data.forEach(item => {
            const div = document.createElement("div");
            div.className = "news-item";
            div.innerHTML = `<div class="news-title">${sanitizeHTML(item.TieuDe)}</div>
                             <div class="news-date">${new Date(item.NgayTao).toLocaleString()}</div>
                             <div class="news-content">${sanitizeHTML(item.NoiDung)}</div>`;
            newsList.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        newsList.innerHTML = `Lỗi tải tin tức: ${err.message}`;
    }
}

function sanitizeHTML(str) {
    return str.replace(/&(?!amp;|lt;|gt;|quot;|#039;)/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/&lt;(\/?(p|b|i|ul|li|br))&gt;/gi, "<$1>");
}

function sanitizeName(name) {
    return name
        .normalize('NFD')            // tách dấu
        .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
        .replace(/[^\w\s-]/g, '')    // bỏ ký tự đặc biệt
        .replace(/\s+/g, '-')         // space → -
        .toLowerCase();
}