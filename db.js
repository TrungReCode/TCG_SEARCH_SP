// Cài đặt: npm install dotenv
const sql = require('mssql');
require('dotenv').config(); // Tải các biến từ .env vào process.env

const config = {
  user: process.env.DB_USER,        // Đọc từ biến môi trường
  password: process.env.DB_PASS,    // Đọc từ biến môi trường
  server: process.env.DB_SERVER,    // Đọc từ biến môi trường
  database: process.env.DB_NAME,    // Đọc từ biến môi trường
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

let pool;

async function connectDB() {
    if (!pool) {
        // Kiểm tra để đảm bảo tất cả các biến cần thiết đã được tải
        if (!config.user || !config.password || !config.server || !config.database) {
            throw new Error('Database credentials missing in environment variables.');
        }
        pool = await sql.connect(config);
    }
    return pool;
}

module.exports = { sql, connectDB };