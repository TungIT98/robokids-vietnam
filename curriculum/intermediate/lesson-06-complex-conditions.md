# Bài 6: Điều Kiện Phức Tạp (Complex Conditions)

## Mục tiêu
- Trẻ kết hợp nhiều điều kiện
- Trẻ dùng "VÀ" / "HOẶC" trong lập trình
- Trẻ tạo quyết định thông minh

## Hoạt động chính

### 1. Ôn bài (5 phút)
- Điều kiện cơ bản NẾU... THÌ...
- Hỏi đáp ví dụ

### 2. Giảng giải (10 phút)
- "Đi tiếp NẾU không có vật cản VÀ không đến tường"
- Một điều kiện + điều kiện khác

### 3. Thực hành (25 phút)
- Robot tránh chướng ngại vật phức tạp
- Robot đi theo tường

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI (luôn luôn)
    ├── 🔍 NẾU (cảm biến trái > 15cm) VÀ (cảm biến phải > 15cm) THÌ
    │   └── 🔵 TIẾN TỚI 1 bước
    └── 🔍 HOẶC NẾU (cảm biến trái < 10cm) THÌ
        └── 🔵 RẼ PHẢI 45 độ
```

## Từ vựng mới
- **VÀ**: Cả hai điều kiện phải đúng
- **HOẶC**: Một trong hai điều kiện đúng là đủ
- **Kết hợp điều kiện**: Ghép nhiều điều kiện lại với nhau

## Thử thách
> Robot đi vòng quanh phòng, tránh tường bằng 2 cảm biến!

---
*RoboKids Vietnam - Bài 6/10 lớp robotics 9-12 tuổi*