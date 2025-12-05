const bcrypt = require('bcryptjs');
const { sql, connectDB } = require('../../db'); // để trỏ về db.js ở thư mục gốc
const readline = require('readline');

async function createAdmin() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise(resolve => rl.question(query, resolve));

    try {
        const pool = await connectDB();

        const username = await question('Nhập admin-name: ');
        const email = await question('Nhập email: ');
        const password = await question('Nhập password: ');
        const vaitro = 1;

        const hashedPassword = await bcrypt.hash(password, 12);

        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, hashedPassword)
            .input('vaitro', sql.Int, vaitro)
            .query('INSERT INTO NguoiDung (TenNguoiDung, Email, MatKhau, VaiTro) VALUES (@username, @email, @password, @vaitro)');

        console.log('Tạo quản trị viên thành công!');
    } catch (err) {
        console.error('Lỗi tạo admin:', err.message);
    } finally {
        rl.close();
        process.exit(0);
    }


}

createAdmin();
