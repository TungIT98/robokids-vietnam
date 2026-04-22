# Bài 15: Giao Tiếp Bluetooth (Bluetooth Communication)

## Mục tiêu
- Trẻ hiểu Bluetooth là giao tiếp không dây tầm ngắn
- Trẻ sử dụng khối "BLUETOOTH GỬI" và "BLUETOOTH NHẬN"
- Trẻ lập trình robot điều khiển từ xa bằng điện thoại

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ bật Bluetooth trên điện thoại, ghép với robot
- **Giải thích:** Bluetooth như "sóng radio riêng" - chỉ 2 thiết bị nói chuyện
- **So sánh:** WiFi (xa, nhiều thiết bị) vs Bluetooth (gần, 1-1)

### 2. Thực hành (25 phút)
- **Bài 1:** Robot nhận lệnh từ điện thoại: "TIEN", "LUI", "TRAI", "PHAI"
- **Bài 2:** Robot gửi thông tin về điện thoại: khoảng cách, nhiệt độ
- **Bài 3:** Điều khiển robot bằng nút trên màn hình điện thoại

## Khối lệnh học
```
# Robot nhận lệnh từ điện thoại
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 📡 NHẬN TIN NHẮN bluetooth
    └── 🔍 NẾU bluetooth = "TIEN"
        THÌ 🔵 TIẾN TỚI 2 bước
        NGƯỢC LẠI NẾU bluetooth = "LUI"
        THÌ 🔵 LÙI LẠI 2 bước
        NGƯỢC LẠI NẾU bluetooth = "TRAI"
        THÌ 🔵 RẼ TRÁI 90 độ
        NGƯỢC LẠI NẾU bluetooth = "PHAI"
        THÌ 🔵 RẼ PHẢI 90 độ

# Robot gửi dữ liệu về điện thoại
🟢 KHI BẮT ĐẦU
├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
├── 📡 GỬI TIN NHẮN "KC_" + khoangCach qua BLUETOOTH
└── 💬 HIỂN THỊ "DA GUI: " + khoangCach
```

## Ứng dụng thực tế
- Tai nghe Bluetooth
- Loa không dây
- Điều khiển robot từ xa
- Đồng hồ thông minh

## Thử thách
> Lập trình "Robot trạm thời tiết": Robot đo khoảng cách và nhiệt độ, gửi về điện thoại mỗi 5 giây. Điện thoại hiển thị lên màn hình! Làm bảng theo dõi 10 lần đo.

---
