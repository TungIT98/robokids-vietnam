# Bài 19: Robot Bật/Tắt Thiết Bị (Output Control)

## Mục tiêu
- Trẻ hiểu robot có thể điều khiển nhiều thiết bị cùng lúc
- Trẻ sử dụng khối điều khiển đèn, động cơ, còi báo động
- Trẻ lập trình robot "nhà thông minh" đơn giản

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Bật đèn, bật quạt, bật còi trên robot
- **Giải thích:** Robot có nhiều "công tắc" có thể bật/tắt từ xa
- **So sánh:** Một thiết bị vs Nhiều thiết bị cùng lúc

### 2. Thực hành (25 phút)
- **Bài 1:** Robot bật đèn ĐỎ khi gặp vật cản, bật XANH khi đường thông thoáng
- **Bài 2:** Robot nhà thông minh: nút A = bật đèn, nút B = bật quạt
- **Bài 3:** Robot báo động khi khoảng cách < 5cm (còi + đèn nháy)

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
    └── 🔍 NẾU khoangCach < 10cm
        THÌ
        ├── 🔴 BẬT ĐÈN ĐỎ
        ├── 🔊 PHÁT ÂM THANH "CẢNH BÁO"
        └── 🔵 RẼ PHẢI 90 độ
        NGƯỢC LẠI
        THÌ
        ├── 🟢 BẬT ĐÈN XANH
        └── 🔵 TIẾN TỚI 1 bước

# Nhà thông minh
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔍 NẾU NÚT A ĐƯỢC NHẤN
        THÌ
        ├── 💡 BẬT ĐÈN PHÒNG KHÁCH
        └── 💬 HIỂN THỊ "DEN DA BAT"
    NGƯỢC LẠI NẾU NÚT B ĐƯỢC NHẤN
        THÌ
        ├── 🌀 BẬT QUẠT
        └── 💬 HIỂN THỊ "QUAT DA BAT"
```

## Thiết bị trên robot
| Thiết bị | Khối | Chức năng |
|----------|------|-----------|
| Đèn LED | 💡 BẬT ĐÈN | Chiếu sáng |
| Quạt | 🌀 BẬT QUẠT | Làm mát |
| Còi | 🔊 PHÁT ÂM THANH | Báo động |
| Màn hình | 💬 HIỂN THỊ | Hiển thị thông tin |

## Thử thách
> Lập trình "Robot an ninh": Robot đi tuần tra. Phát hiện vật cản → BẬT ĐÈN ĐỎ + CÒI. Đèn tối (< 50 ánh sáng) → BẬT ĐÈN. Bình thường → ĐÈN XANH. Thử lúc ban ngày và ban đêm!

---
