# Bài 11: Data Logging - Ghi Dữ Liệu và Phân Tích

### Mục tiêu
- Trẻ hiểu robot có thể ghi lại dữ liệu theo thời gian
- Trẻ sử dụng mảng để lưu dữ liệu nhiều điểm
- Trẻ phân tích dữ liệu để tìm pattern

### Hoạt động chính
1. **Giới thiệu** (10 phút): Weather station ghi nhiệt độ theo giờ/ngày
2. **Thực hành** (25 phút):
   - Robot ghi nhiệt độ mỗi 5 phút trong 1 giờ
   - Vẽ đồ thị nhiệt độ theo thời gian
   - Tìm xu hướng (đang nóng lên hay mát đi?)

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 THỜI_GIAN_GHI = 60  # phút
├── 📦 MANG_CHU_KY = []
├── 📦 tongNhietDo = 0
└── 🔄 LẶP LẠI trong THỜI_GIAN_GHI phút
    ├── 📊 nhietDo = CẢM BIẾN NHIỆT ĐỘ
    ├── 📦 MANG_CHU_KY.them(nhietDo)
    ├── 📦 tongNhietDo = tongNhietDo + nhietDo
    └── ⏱️ CHỜ 5 phút

# Phân tích
📦 trungBinh = tongNhietDo / MANG_CHU_KY.length
💬 HIỂN THỊ "Nhiệt độ trung bình: " + trungBinh

📦 nhietDoMax = MANG_CHU_KY[0]
📦 nhietDoMin = MANG_CHU_KY[0]
🔄 LẶP LẠI với giaTri TRONG MANG_CHU_KY
    └── 🔍 NẾU giaTri > nhietDoMax THÌ 📦 nhietDoMax = giaTri
    └── 🔍 NẾU giaTri < nhietDoMin THÌ 📦 nhietDoMin = giaTri

💬 HIỂN THỊ "Cao nhất: " + nhietDoMax + ", Thấp nhất: " + nhietDoMin
```

### Ứng dụng thực tế
- Weather station ghi dữ liệu khí tượng
- Robot công nghiệp ghi lỗi để phân tích
- Xe Tesla ghi dữ liệu lái để cải thiện tự lái

### Thử thách
> Robot ghi dữ liệu khoảng cách mỗi 10 giây trong 3 phút (18 điểm dữ liệu). Vẽ đồ thị. Tìm xu hướng: khoảng cách đang tăng hay giảm? Robot đang đi xa hay gần vật gì đó?

---
*RoboKids Vietnam - Bài 11/15 lớp robotics 13-16 tuổi - Advanced Curriculum*