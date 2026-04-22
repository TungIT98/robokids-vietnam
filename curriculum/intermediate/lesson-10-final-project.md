# Bài 10: Dự Án Cuối Khóa - Robot Thông Minh (Final Project - Smart Robot)

## Mục tiêu
- Trẻ ôn tập tất cả khối lệnh đã học
- Trẻ tạo một dự án hoàn chỉnh
- Trẻ trình bày dự án trước lớp

## Nhiệm vụ: Robot Giao Tiếp Thông Minh
```
🎯 Mục tiêu: Robot tự di chuyển trong phòng,
phản ứng với môi trường bằng ánh sáng và âm thanh,
giao tiếp với người dùng
```

## Yêu cầu chương trình
1. Robot khởi động với âm thanh chào
2. Robot đi thẳng đến khi gặp vật cản
3. LED đổi màu theo khoảng cách vật cản
4. Robot phát âm thanh cảnh báo khi cần
5. Robot dừng và chờ lệnh mới

## Chương trình mẫu
```
🟢 KHI BẮT ĐẦU
├── 🔊 PHÁT ÂM THANH "Xin chào! Tôi sẵn sàng!"
├── 📦 ĐẶT cheDo = 0
└── 🔄 LẶP LẠI (luôn luôn)
    ├── 🔵 TIẾN TỚI 1 bước
    ├── 📦 khoangCach = CẢM BIẾN KHOẢNG CÁCH
    ├── 🔍 NẾU khoangCach < 10cm THÌ
    │   ├── 🔵 DỪNG LẠI
    │   ├── 🔴 BẬT ĐÈN ĐỎ
    │   └── 🔊 PHÁT ÂM THANH "Cảnh báo!"
    └── 🔍 HOẶC NẾU khoangCach > 30cm THÌ
        ├── 🔵 TIẾN TỐC ĐỘ CAO
        └── 🟢 BẬT ĐÈN XANH
```

## Tiêu chí đánh giá
| Tiêu chí | Xuất sắc | Tốt | Đang học |
|----------|---------|-----|----------|
| Hoàn thành nhiệm vụ | Đầy đủ 5 bước | 3-4 bước | 1-2 bước |
| Sử dụng biến | Có, đúng cách | Có | Chưa có |
| Kết hợp cảm biến | Hoạt động tốt | Cơ bản | Khó khăn |
| Sáng tạo | Có thêm hiệu ứng | Đúng yêu cầu | Bám sát mẫu |

## Thử thách
> Thêm một tính năng sáng tạo cho robot của em!

---
*RoboKids Vietnam - Bài 10/10 lớp robotics 9-12 tuổi*