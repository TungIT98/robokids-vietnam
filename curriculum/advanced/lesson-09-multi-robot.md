# Bài 9: Giao Tiếp Nhiều Robot (Multi-Robot Communication)

### Mục tiêu
- Trẻ hiểu lợi ích của việc nhiều robot làm việc cùng nhau
- Trẻ lập trình 2 robot trao đổi thông tin
- Trẻ thiết kế hệ thống phân công lao động giữa robots

### Hoạt động chính
1. **Trò chơi nhóm** (10 phút): 3 trẻ di chuyển đồ vật theo chuỗi (giống production line!)
2. **Giảng giải** (5 phút): Swarm robotics - đàn robot tự tổ chức
3. **Thực hành** (25 phút):
   - Robot A đo khoảng cách, gửi cho Robot B
   - Robot B nhận lệnh, quyết định hành động

### Khối lệnh học
```
# ROBOT A (Cảm biến - Sensor Robot)
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 1 bước
├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
├── 📡 GỬI TIN NHẮN "KC_" + khoangCach đến ROBOT_B
└── 🔊 PHÁT ÂM THANH "ĐÃ GỬI"

# ROBOT B (Điều khiển - Control Robot)
🟢 KHI NHẬN ĐƯỢC TIN NHẮN batDau
│   THÌ
│   └── 📦 daNhanLenh = ĐÚNG

🟢 KHI NHẬN ĐƯỢC TIN NHẮN "KC_*"
│   THÌ
│   ├── 📦 thongDiep = TACH CHUOI tinNhan
│   ├── 📦 khoangCach = thongDiep[1]
│   └── 🔍 NẾU khoangCach < 20
│       THÌ
│       ├── 🔊 PHÁT ÂM THANH "CẢNH BÁO"
│       └── 📡 GỬI TIN NHẮN "DUNG" đến ROBOT_A
```

### Ứng dụng thực tế
- Đàn drone biểu diễn ánh sáng
- Robot kho hàng tự động
- Robot tìm kiếm cứu hộ (nhiều robot tìm kiếm cùng lúc)
- Xe tự hành trong nhà máy giao tiếp để tránh va chạm

### Thử thách
> Lập trình "Robot chuyển hàng": Robot A nhận hàng, đo khoảng cách đến Robot B, gửi tọa độ. Robot B di chuyển đến nhận hàng! Thử với 3 robot!

---
*RoboKids Vietnam - Bài 9/15 lớp robotics 13-16 tuổi - Advanced Curriculum*