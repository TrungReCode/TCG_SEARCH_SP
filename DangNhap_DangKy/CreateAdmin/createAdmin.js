const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { sql, connectDB } = require('../../db'); 
const readline = require('readline');

async function createAdmin() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
        console.log("--- TẠO TÀI KHOẢN QUẢN TRỊ VIÊN (ADMIN) ---");
        
        // Test kết nối trước khi nhập liệu
        const pool = await connectDB(); 
        console.log("--> Kết nối Database thành công!\n");

        const username = await question('Nhập tên đăng nhập (admin-name): ');
        const email = await question('Nhập email: ');
        const password = await question('Nhập mật khẩu: ');
        const numberphone = await question('Nhập số điện thoại (Zalo): ');
        
        const vaitro = 1; 

        // Kiểm tra trùng
        const checkExist = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM NguoiDung WHERE TenNguoiDung = @username OR Email = @email');

        if (checkExist.recordset.length > 0) {
            console.error('\nLỖI: Tên đăng nhập hoặc Email này đã tồn tại!');
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('vaitro', sql.Int, vaitro)
            .input('numberphone', sql.NVarChar, numberphone)
            .query(`
                INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhau, VaiTro, SoDienThoai) 
                VALUES (@username, @email, @password, @vaitro, @numberphone)
            `);

        console.log('\nTẠO QUẢN TRỊ VIÊN THÀNH CÔNG!');
        console.log(`User: ${username} | Role: Admin | Phone: ${numberphone}`);

    } catch (err) {
        console.error('\nLỗi hệ thống:', err.message);
        if (err.message.includes('Database credentials missing')) {
            console.error('--> Gợi ý: Hãy copy file .env vào cùng thư mục với file này.');
        }
    } finally {
        rl.close();
        process.exit(0);
    }
}

createAdmin();