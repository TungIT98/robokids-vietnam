# Bài 12: Cảm Biến Con Quay - Gyro (Gyroscope Sensor)

## Mục tiêu
- Trẻ hiểu gyro sensor đo góc nghiêng và hướng quay
- Trẻ sử dụng khối "CẢM BIẾN GYRO" để đo góc quay
- Trẻ lập trình robot rẽ chính xác theo góc

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ quay smartphone và xem góc nghiêng thay đổi
- **Giải thích:** Gyro như "la bàn trong tự quay" - biết đang nghiêng bao nhiêu độ
- **So sánh:** Rẽ theo góc cố định vs rẽ theo gyro - cái nào chính xác hơn?

### 2. Thực hành (25 phút)
- **Bài 1:** Robot quay 90 độ theo gyro, so sánh với vạch đích
- **Bài 2:** Robot vẽ hình vuông hoàn hảo bằng gyro
- **Bài 3:** Robot đi thẳng, tự hiệu chỉnh theo gyro nếu lệch

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 💬 HIỂN THỊ "QUAY 90 ĐỘ"
├── 📦 gocHienTai = CẢM BIẾN GYRO
├── 📦 gocMucTieu = gocHienTai + 90
└── 🔄 LẶP LẠI đến khi gocHienTai >= gocMucTieu
    ├── 🔵 RẼ PHẢI 5 độ
    └── 📦 gocHienTai = CẢM BIẾN GYRO

# Vẽ hình vuông bằng gyro
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI 4 lần
    ├── 🔵 TIẾN TỚI 5 bước
    ├── 📦 gocHienTai = CẢM BIẾN GYRO
    ├── 📦 gocMucTieu = gocHienTai + 90
    └── 🔄 LẶP LẠI đến khi gocHienTai >= gocMucTieu
        ├── 🔵 RẼ PHẢI 2 độ
        └── 📦 gocHienTai = CẢM BIẾN GYRO
```

## Ứng dụng thực tế
- Drone giữ thăng bằng
- Robot cân bằng trên 2 bánh
- Smartphone xoay màn hình

## Thử thách
> Lập trình robot "vẽ đa giác đều": Nhập số cạnh (3-8), robot vẽ hình đều bằng gyro! Ví dụ: 6 cạnh = hình lục giác đều, mỗi góc trong = (số cạnh-2) × 180 / số cạnh.

---
