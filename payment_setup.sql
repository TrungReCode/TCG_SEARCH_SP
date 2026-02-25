-- Script tạo tabel PaymentTransactions
-- Chạy script này trên SQL Server để tạo bảng lưu thông tin giao dịch thanh toán

USE TCG_SEARCH_SP; -- Thay bằng tên database của bạn

-- Kiểm tra và tạo bảng PaymentTransactions
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'PaymentTransactions')
BEGIN
    CREATE TABLE PaymentTransactions (
        MaGiaoDich INT PRIMARY KEY IDENTITY(1,1),
        OrderId NVARCHAR(50) UNIQUE NOT NULL,
        RequestId NVARCHAR(50) NOT NULL,
        TransactionId NVARCHAR(50) NULL,
        MaNguoiDung INT NOT NULL,
        MaRaoBan INT NULL,
        MaCanMua INT NULL,
        Amount DECIMAL(15, 2) NOT NULL,
        TenSanPham NVARCHAR(255),
        TrangThai NVARCHAR(30) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, CANCELLED
        NgayTao DATETIME DEFAULT GETDATE(),
        NgayHoanTat DATETIME NULL,
        FOREIGN KEY (MaNguoiDung) REFERENCES NguoiDung(MaNguoiDung),
        FOREIGN KEY (MaRaoBan) REFERENCES TheRaoBan(MaRaoBan),
        FOREIGN KEY (MaCanMua) REFERENCES TheCanMua(MaCanMua)
    );
    
    -- Tạo Index để tìm kiếm nhanh hơn
    CREATE INDEX IDX_PaymentTransactions_OrderId ON PaymentTransactions(OrderId);
    CREATE INDEX IDX_PaymentTransactions_MaNguoiDung ON PaymentTransactions(MaNguoiDung);
    CREATE INDEX IDX_PaymentTransactions_TrangThai ON PaymentTransactions(TrangThai);
    
    PRINT 'Bảng PaymentTransactions được tạo thành công!';
END
ELSE
BEGIN
    PRINT 'Bảng PaymentTransactions đã tồn tại!';
END

-- Thêm cột TrahThanhToan vào bảng TheRaoBan nếu chưa có
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'TheRaoBan' AND COLUMN_NAME = 'TrahThanhToan')
BEGIN
    ALTER TABLE TheRaoBan ADD TrahThanhToan BIT DEFAULT 0;
    PRINT 'Thêm cột TrahThanhToan vào bảng TheRaoBan thành công!';
END
ELSE
BEGIN
    PRINT 'Cột TrahThanhToan đã tồn tại trong bảng TheRaoBan!';
END
