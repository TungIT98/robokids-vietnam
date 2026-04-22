# Bài 14: Đọc Dữ Liệu Từ Internet - IoT Cơ Bản (Internet of Things)

### Mục tiêu
- Trẻ hiểu "Internet of Things" là gì - thiết bị kết nối internet
- Trẻ lập trình robot lấy dữ liệu từ internet
- Trẻ sử dụng dữ liệu thời tiết để quyết định hành động

### Hoạt động chính
1. **Giới thiệu** (10 phút): Smart home - đèn, điều hòa kết nối internet
2. **Thực hành** (25 phút):
   - Robot lấy thông tin thời tiết từ internet
   - Robot quyết định: "Nếu trời mưa → ở nhà, nếu nắng → ra ngoài"

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📡 LẤY DỮ LIỆU THỜI TIẾT từ "api.openweathermap.org"
│   # Kết quả: { nhietDo: 28, moTa: "Nắng", doAm: 75 }
├── 💬 HIỂN THỊ "Thời tiết: " + thoiTiet.moTa
├── 💬 HIỂN THỊ "Nhiệt độ: " + thoiTiet.nhietDo + "°C"
└── 🔍 NẾU thoiTiet.moTa = "Mưa"
    THÌ
    ├── 💬 HIỂN THỊ "Ở nhà đi!"
    └── 🔊 PHÁT ÂM THANH "TRỜI MƯA"
    NGƯỢC LẠI
    THÌ
    ├── 💬 HIỂN THỊ "Ra ngoài thôi!"
    └── 🔵 TIẾN TỚI 10 bước
```

### Ứng dụng IoT
- Điều khiển đèn nhà từ xa bằng điện thoại
- Robot giao hàng tự động theo GPS
- Hệ thống tưới cây tự động dựa trên độ ẩm đất
- Máy lọc nước thông minh báo khi cần thay lõi

### Thử thách
> Lập trình robot "phóng viên thời tiết":
> 1. Lấy thông tin thời tiết 3 thành phố (Hà Nội, TP.HCM, Đà Nẵng)
> 2. Hiển thị thông tin lên màn hình
> 3. Robot nói "Thành phố nào nóng nhất?" và di chuyển đến vị trí của thành phố đó!

---
*RoboKids Vietnam - Bài 14/15 lớp robotics 13-16 tuổi - Advanced Curriculum*