# Bài 11: Cảm Biến Khoảng Cách - Robot Thấy Vật Cản (Ultrasonic Sensor)

## Mục tiêu
- Trẻ hiểu cảm biến khoảng cách đo khoảng cách đến vật thể bằng sóng âm
- Trẻ sử dụng khối "CẢM BIẾN KHOẢNG CÁCH" để phát hiện vật cản
- Trẻ lập trình robot tránh vật cản thông minh

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ đo khoảng cách bằng mắt và so sánh với thước đo
- **Giải thích:** Cảm biến siêu âm phát sóng âm, đợi phản hồi, tính khoảng cách
- **So sánh:** Mắt người vs cảm biến robot - cái nào nhanh hơn?

### 2. Thực hành (25 phút)
- **Bài 1:** Robot đo khoảng cách đến tường, hiển thị số
- **Bài 2:** Robot đi thẳng, NẾU khoảng cách < 15cm THÌ dừng lại
- **Bài 3:** Robot tránh vật cản: đi thẳng → gặp vật → rẽ → đi tiếp

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 💬 HIỂN THỊ "ĐO KHOẢNG CÁCH"
└── 🔄 LẶP LẠI 5 lần
    ├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
    ├── 💬 HIỂN THỊ khoangCach + " cm"
    └── 🔵 TIẾN TỚI 2 bước

# Robot tránh vật cản
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔵 TIẾN TỚI 1 bước
    ├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
    └── 🔍 NẾU khoangCach < 15cm
        THÌ
        ├── 🔵 DỪNG LẠI
        ├── 🔵 RẼ PHẢI 90 độ
        └── 🔵 TIẾN TỚI 3 bước
```

## Ứng dụng thực tế
- Xe tự hành trong kho hàng
- Robot hút bụi tránh đồ đạc
- Ô tô tự đỗ

## Thử thách
> Lập trình robot "đo khoảng cách an toàn": Robot đi thẳng, đo khoảng cách liên tục. NẾU < 10cm → DỪNG + BÁO ĐỘNG. NẾU > 30cm → đi bình thường. NẾU 10-30cm → đi chậm!

---
