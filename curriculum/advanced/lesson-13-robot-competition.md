# Bài 13: Cuộc Thi Robot - Chiến Lược và Tối Ưu Hóa

### Mục tiêu
- Trẻ tham gia cuộc thi robot để ôn tập kiến thức
- Trẻ phát triển chiến lược để thắng cuộc thi
- Trẻ tối ưu hóa code để robot hoạt động nhanh và chính xác

### Hoạt động chính
1. **Ôn tập** (10 phút): Nhắc lại tất cả khối lệnh đã học
2. **Thi đấu** (35 phút): Cuộc thi "Robot bóng đá" hoặc "Robot tránh mìn"

### Thể lệ cuộc thi "Robot bóng đá"
```
🎯 Mục tiêu: Robot đẩy bóng vào khung thành đối phương trong 2 phút

📋 Quy định:
- Sân: 2m x 1.5m
- Bóng: bóng tennis
- Mỗi trận: 2 phút
- Ghi bàn: +10 điểm
- Không ghi bàn: điểm = số lần chạm bóng

⚙️ Yêu cầu robot:
- Dùng cảm biến khoảng cách để tìm bóng
- Dùng camera để nhận diện khung thành
- Di chuyển nhanh, linh hoạt

💡 Chiến lược gợi ý:
1. Tìm bóng → di chuyển đến bóng
2. Đẩy bóng → dùng PID để giữ bóng trước mặt
3. Tấn công → đẩy bóng vào khung thành
4. Phòng thủ → cản trở đối thủ
```

### Tối ưu hóa code
| Vấn đề | Giải pháp | Hiệu quả |
|--------|-----------|----------|
| Robot chậm | Tăng tốc độ, giảm độ chính xác | Nhanh hơn nhưng có thể lệch |
| Robot lệch | Tinh chỉnh PID | Ổn định hơn |
| Code dài | Dùng hàm, tái sử dụng | Dễ đọc, ngắn hơn |
| Bị stuck | Thêm timeout, reset | Ít bị treo |

### Thử thách
> Thi đấu "Robot tránh mìn":
> - Robot bắt đầu từ vạch xuất phát
> - Trong sân có 5 "mìn" (vật cản) đặt ngẫu nhiên
> - Robot phải đến đích ở góc đối diện trong thời gian ngắn nhất
> - Chạm mìn = bị loại
> - Đo thời gian hoàn thành!

---
*RoboKids Vietnam - Bài 13/15 lớp robotics 13-16 tuổi - Advanced Curriculum*