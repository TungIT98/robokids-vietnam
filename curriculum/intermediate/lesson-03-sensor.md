# Bài 3: Cảm Biến Khoảng Cách (Distance Sensor)

## Mục tiêu
- Trẻ hiểu cảm biến khoảng cách là "mắt" của robot
- Trẻ sử dụng khối "NẾU... THÌ..." để ra quyết định
- Trẻ lập trình robot dừng khi gặp vật cản

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- Trẻ bịt mắt, nghe lệnh "dừng khi gần tường"
- Cảm biến gửi sóng âm, đo khoảng cách bằng thời gian

### 2. Giảng giải (10 phút)
- "Nếu khoảng cách nhỏ hơn 10cm thì dừng lại"
- Giới thiệu khối điều kiện

### 3. Thực hành (25 phút)
- Robot đi thẳng, dừng khi cách vật cản 10cm
- Robot đi vòng quanh phòng

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI (luôn luôn)
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN KHOẢNG CÁCH < 10cm THÌ
        ├── 🔵 DỪNG LẠI
        └── 🔊 PHÁT ÂM THANH "CẢNH BÁO"
```

## Từ vựng mới
- **Cảm biến khoảng cách**: Đo độ gần xa bằng sóng âm
- **Điều kiện**: Nếu... thì... (IF... THEN...)
- **Vật cản**: Vật chặn đường robot

## Thử thách
> Lập trình robot đi ra khỏi phòng mà không va vào đồ vật!

---
*RoboKids Vietnam - Bài 3/10 lớp robotics 9-12 tuổi*