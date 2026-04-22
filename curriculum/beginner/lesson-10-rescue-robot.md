# Bài 10: Dự Án Cuối Cùng - Robot Giải Cứu (Final Project - Rescue Robot)

## Mục tiêu
- Trẻ ôn tập tất cả khối lệnh đã học
- Trẻ lập trình một nhiệm vụ hoàn chỉnh
- Trẻ phát triển tư duy giải quyết vấn đề

## Nhiệm vụ Robot Giải Cứu
```
🎯 Mục tiêu: Robot tự tìm đường đến "nạn nhân" (một vật thể),
bật đèn, phát âm thanh cứu hộ, rồi quay về vị trí xuất phát.
```

## Yêu cầu chương trình
1. Robot khởi động với âm thanh "Bắt đầu giải cứu!"
2. Robot đi tìm nạn nhân (sử dụng cảm biến)
3. Khi tìm thấy: bật đèn nhấp nháy + hát cứu hộ
4. Robot quay về vị trí xuất phát
5. Phát âm thanh "Giải cứu thành công!"

## Chương trình mẫu
```
🟢 KHI BẮT ĐẦU
├── 🔊 PHÁT ÂM THANH "Bắt đầu giải cứu!"
├── 🔴 BẬT ĐÈN XANH
└── 🔄 LẶP LẠI đến khi tìm thấy nạn nhân
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 KHI CẢM BIẾN KHOẢNG CÁCH < 5cm
        ├── 🔵 DỪNG LẠI
        ├── 🔊 PHÁT ÂM THANH "CỨU HỘ!"
        └── 🔄 LẶP LẠI 5 lần
            ├── 🔴 BẬT ĐÈN ĐỎ
            ├── ⏱️ CHỜ 0.5 giây
            └── 🔴 TẮT ĐÈN
```

## Tiêu chí đánh giá

| Tiêu chí | Xuất sắc | Tốt | Đang học |
|----------|---------|-----|----------|
| Hoàn thành nhiệm vụ | Đầy đủ 5 bước | 3-4 bước | 1-2 bước |
| Sử dụng vòng lặp | Có, đúng cách | Có | Chưa có |
| Kết hợp cảm biến | Hoạt động tốt | Cơ bản | Khó khăn |
| Sáng tạo | Có thêm hiệu ứng | Đúng yêu cầu | Bám sát mẫu |

## Kỹ năng đạt được sau 10 bài
- ✓ Lập trình kéo-thả cơ bản
- ✓ Tư duy tuần tự (sequence)
- ✓ Tư duy lặp (loops)
- ✓ Phản xạ có điều kiện (sensors)
- ✓ Giải quyết vấn đề (debugging)
- ✓ Sáng tạo và tự học

---
*RoboKids Vietnam - Bài 10/10 lớp robotics 6-8 tuổi - Hoàn thành Alpha Curriculum!*
