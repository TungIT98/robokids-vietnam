# Bài 16: Robot Đọc Nút Bấm (Button Input)

## Mục tiêu
- Trẻ hiểu robot có nút bấm như điều khiển game
- Trẻ sử dụng khối "NÚT A", "NÚT B" để điều khiển
- Trẻ lập trình menu lựa chọn bằng nút bấm

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ nhấn các nút trên robot, quan sát phản ứng
- **Giải thích:** Nút bấm = tín hiệu điện khi nhấn, nhả = không có tín hiệu
- **So sánh:** Nhấn nút (có dừng) vs Cảm biến (tự động)

### 2. Thực hành (25 phút)
- **Bài 1:** Nhấn nút A → robot tiến, nhấn nút B → robot lùi
- **Bài 2:** Menu: Nút A = vẽ hình vuông, Nút B = vẽ hình tam giác
- **Bài 3:** Giữ nút → robot đi liên tục, thả nút → dừng

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔍 NẾU NÚT A ĐƯỢC NHẤN
        THÌ
        ├── 💬 HIỂN THỊ "VE HINH VUONG"
        └── ▶️ veHinhVuong
    NGƯỢC LẠI NẾU NÚT B ĐƯỢC NHẤN
        THÌ
        ├── 💬 HIỂN THỊ "VE HINH TAM GIAC"
        └── ▶️ veHinhTamGiac
    NGƯỢC LẠI
        THÌ
        └── 🔵 DỪNG LẠI

# Điều khiển liên tục bằng giữ nút
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    └── 🔍 NẾU NÚT A ĐƯỢC NHẤN
        THÌ 🔵 TIẾN TỚI 1 bước
        NGƯỢC LẠI NẾU NÚT B ĐƯỢC NHẤN
        THÌ 🔵 LÙI LẠI 1 bước
        NGƯỢC LẠI NẾU NÚT TRÊN ĐƯỢC NHẤN
        THÌ 🔵 RẼ TRÁI 45 độ
        NGƯỢC LẠI
        THÌ 🔵 DỪNG LẠI
```

## Ứng dụng thực tế
- Điều khiển game
- Menu máy ATM
- Điều khiển robot công nghiệp

## Thử thách
> Lập trình "Robot điều khiển 4 hướng": 4 nút điều khiển 4 hướng. Thêm nút giữa = BẬT/TẮT đèn. Thêm nút reset = quay về vị trí bắt đầu!

---
