# Bài 6: Camera và Nhận Diện Màu Sắc (Camera and Color Recognition)

### Mục tiêu
- Trẻ hiểu camera là một loại cảm biến hình ảnh
- Trẻ sử dụng khối "NHẬN DIỆN MÀU" để phát hiện màu sắc
- Trẻ lập trình robot phản ứng với màu sắc

### Hoạt động chính
1. **Thí nghiệm** (10 phút): Trẻ đặt các vật màu đỏ, xanh, vàng trước camera
2. **Giảng giải** (5 phút): Camera chụp ảnh, phân tích màu pixel
3. **Thực hành** (20 phút):
   - Robot đi theo vật màu đỏ
   - Robot phát âm thanh khác nhau cho màu khác nhau

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 📷 CHỤP ẢNH
    ├── 📊 mauPhatHien = CAMERA NHẬN DIỆN MÀU CHÍNH
    └── 🔍 NẾU mauPhatHien = "ĐỎ"
        THÌ
        ├── 🔴 BẬT ĐÈN ĐỎ
        └── 🔊 PHÁT ÂM THANH "ĐỎ"
    NGƯỢC LẠI NẾU mauPhatHien = "XANH"
        THÌ
        ├── 🟢 BẬT ĐÈN XANH
        └── 🔊 PHÁT ÂM THANH "XANH"
    NGƯỢC LẠI
        THÌ
        └── 🔵 TẮT ĐÈN
```

### Ứng dụng thực tế
- Robot phân loại sản phẩm theo màu sắc trong nhà máy
- Xe tự hành nhận diện biển báo giao thông
- Robot y tế phát hiện tế bào bệnh

### Thử thách
> Lập trình "Robot phân loại rác": đặt 3 thùng đỏ/xanh/vàng. Robot nhìn màu rác, di chuyển đến thùng đúng màu! Đếm số rác mỗi loại!

---
*RoboKids Vietnam - Bài 6/15 lớp robotics 13-16 tuổi - Advanced Curriculum*