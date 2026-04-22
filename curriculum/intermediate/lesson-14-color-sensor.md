# Bài 14: Robot Đi Theo Vạch Màu (Color Line Following)

## Mục tiêu
- Trẻ hiểu cảm biến màu phân biệt màu sắc khác nhau
- Trẻ sử dụng khối "CẢM BIẾN MÀU" để nhận diện màu
- Trẻ lập trình robot đi theo vạch màu cụ thể

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Đặt các tờ giấy màu trước cảm biến, xem robot nhận diện gì
- **Giải thích:** Camera nhỏ chụp màu, so sánh với màu đã học
- **Màu cơ bản:** ĐỎ, XANH LÁ, XANH DƯƠNG, VÀNG, TRẮNG, ĐEN

### 2. Thực hành (25 phút)
- **Bài 1:** Robot nhận diện màu thẻ và phát âm thanh khác nhau
- **Bài 2:** Robot đi theo vạch XANH, bỏ qua vạch ĐỎ
- **Bài 3:** Robot thi đua: ai đi hết sân màu nhanh nhất

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 📊 mau = CẢM BIẾN MÀU
    └── 🔍 NẾU mau = "ĐỎ"
        THÌ
        ├── 🔴 BẬT ĐÈN ĐỎ
        └── 🔊 PHÁT ÂM THANH "DUNG"
    NGƯỢC LẠI NẾU mau = "XANH LÁ"
        THÌ
        ├── 🟢 BẬT ĐÈN XANH
        └── 🔊 PHÁT ÂM THANH "DI TIEP"
    NGƯỢC LẠI
        THÌ
        └── 🔵 TIẾN TỚI 1 bước

# Robot đi theo đường màu cụ thể
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI đến khi CẢM BIẾN MÀU = "VÀNG"
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN MÀU = "ĐỎ"
        THÌ
        ├── 💬 HIỂN THỊ "MAT DUONG!"
        └── 🔵 RẼ TRÁI 90 độ
```

## Ứng dụng thực tế
- Robot phân loại sản phẩm theo màu
- Xe tự hành đọc biển báo giao thông
- Robot y tế nhận diện mẫu bệnh phẩm

## Thử thách
> Lập trình "Robot giao bưu phẩm": Sân có 3 vạch màu đỏ/xanh/vàng. Robot bắt đầu ở START (trắng). Đi đến vạch ĐỎ → giao thư. Đi đến vạch XANH → giao hàng. Đi đến vạch VÀNG → kết thúc!

---
