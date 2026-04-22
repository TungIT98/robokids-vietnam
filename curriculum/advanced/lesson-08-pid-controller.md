# Bài 8: PID Controller - Điều Khiển Ổn Định

### Mục tiêu
- Trẻ hiểu "điều khiển phản hồi" là gì (feedback control)
- Trẻ làm quen với khái niệm PID: Proportional, Integral, Derivative
- Trẻ tinh chỉnh PID để robot di chuyển ổn định hơn

### Hoạt động chính
1. **Giới thiệu** (10 phút): Hệ thống sưởi - bật khi lạnh, tắt khi nóng (feedback!)
2. **Thực hành** (25 phút):
   - Robot đi thẳng - điều chỉnh tốc độ 2 bánh để không lệch
   - Robot giữ khoảng cách với tường

### Nguyên lý Feedback
```
Giá trị mong muốn (setpoint)
        ↓
    ┌────────┐
    │  PID    │ ← Tính toán lệnh điều khiển
    └────────┘
        ↓
    ┌────────┐
    │  Robot  │ ← Thực hiện lệnh
    └────────┘
        ↓
    ┌────────┐
    │ Cảm     │ ← Đo kết quả
    │ biến    │
    └────────┘
        ↓
    So sánh với setpoint ← ← ← ← ← ←
```

### Công thức PID đơn giản
```
Điều khiển = Kp * SaiSố + Ki * TổngSaiSố + Kd * ThayĐổiSaiSố

Trong đó:
- SaiSố = Giá trị mong muốn - Giá trị thực
- Kp (Proportional): phản ứng với sai số hiện tại
- Ki (Integral): phản ứng với tổng sai số trong quá khứ
- Kd (Derivative): phản ứng với tốc độ thay đổi sai số
```

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 Kp = 0.5
├── 📦 Ki = 0.1
├── 📦 Kd = 0.2
├── 📦 tongSaiSo = 0
└── 🔄 LẶP LẠI mãi mãi
    ├── 📊 nhietDoHienTai = CẢM BIẾN NHIỆT ĐỘ
    ├── 📦 saiSo = 25 - nhietDoHienTai  # muốn 25 độ
    ├── 📦 tongSaiSo = tongSaiSo + saiSo
    ├── 📦 thayDoiSaiSo = saiSo - saiSoCu
    ├── 📦 dieuKhien = Kp*saiSo + Ki*tongSaiSo + Kd*thayDoiSaiSo
    └── 🔵 ĐIỀU CHỈNH NHIỆT ĐỘ theo dieuKhien
```

### Ứng dụng PID
- Robot giữ khoảng cách với tường
- Drone giữ độ cao ổn định
- Xe tự hành giữ tốc độ không đổi
- Robot line-following đi nhanh mà không bị lệch

### Thử thách
> Điều chỉnh robot line-following đi nhanh nhất có thể mà không bị lệch khỏi đường line! Thay đổi Kp, Ki, Kd và quan sát robot. Ghi lại kết quả!

---
*RoboKids Vietnam - Bài 8/15 lớp robotics 13-16 tuổi - Advanced Curriculum*