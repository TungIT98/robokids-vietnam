# RoboKids Vietnam - Advanced Curriculum
## Lớp Robotics Cho Trẻ 13-16 Tuổi

---

## Bài 1: Chào Mừng Đến Với Thế Giới Robotics Thực Sự! (Welcome to Real Robotics!)

### Mục tiêu
- Ôn tập các khối lệnh từ lớp intermediate
- Trẻ làm quen với các cảm biến và thiết bị nâng cao
- Trẻ hiểu robot có thể làm được những gì trong thực tế

### Hoạt động chính
1. **Kiểm tra kiến thức** (15 phút): Trẻ lập trình robot hoàn thành 3 nhiệm vụ nâng cao
2. **Giới thiệu** (10 phút): Cho xem video robot công nghiệp, robot y tế, drone
3. **Khám phá** (20 phút): Trẻ thử nghiệm các cảm biến mới - camera, LIDAR, cảm biến nhiệt độ

### Ôn tập khối lệnh đã học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT tocDo = 3
├── 🔍 NẾU CẢM BIẾN KHOẢNG CÁCH < 10cm THÌ
│   ├── 🔵 RẼ PHẢI 90 độ
│   └── 📡 GỬI TIN NHẮN "DA_QUAY"
├── ▶️ veHinh(soCanh=6, doDai=4)
└── 🔄 LẶP LẠI 5 lần
    ├── 🔵 TIẾN TỚI tocDo bước
    └── 📦 tocDo = tocDo + 1
```

### Cảm biến nâng cao trong lớp advanced
- **Camera**: Nhận diện màu sắc, hình dạng, khuôn mặt
- **LIDAR**: Đo khoảng cách bằng laser, tạo bản đồ 3D
- **Cảm biến nhiệt độ**: Đo nhiệt độ môi trường, phát hiện người
- **Cảm biến âm thanh**: Phân tích âm thanh, nhận diện giọng nói

### Câu hỏi thảo luận
- Robot trong video làm những công việc gì mà con người không thể làm?
- Tại sao robot y tế có thể giúp bác sĩ trong phẫu thuật?
- Con muốn robot làm gì cho con trong tương lai?

---

## Bài 2: Mảng và Danh Sách (Arrays and Lists)

### Mục tiêu
- Trẻ hiểu "mảng" là tập hợp nhiều giá trị
- Trẻ tạo và sử dụng mảng để lưu nhiều dữ liệu
- Trẻ duyệt mảng bằng vòng lặp

### Hoạt động chính
1. **Giới thiệu** (10 phút): "Hộp đựng nhiều số" - mảng như ngăn kéo có nhiều ô
2. **Thực hành** (25 phút):
   - Tạo mảng "nhietDo" = [25, 28, 30, 27, 26]
   - Tính nhiệt độ trung bình
   - Tìm nhiệt độ cao nhất/thấp nhất

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 TẠO MẢNG nhietDo = [25, 28, 30, 27, 26]
├── 📦 ĐẶT tong = 0
├── 🔄 LẶP LẠI với giaTri TRONG nhietDo
│   ├── 💬 HIỂN THỊ giaTri
│   └── 📦 tong = tong + giaTri
└── 📦 trungBinh = tong / 5

hoặc truy cập từng phần tử:
📦 phanTu1 = nhietDo[0]  # 25
📦 phanTu3 = nhietDo[2]  # 30
```

### Ứng dụng thực tế
- Lưu điểm của 20 học sinh trong lớp
- Lưu nhiệt độ đo được trong 1 tuần
- Lưu danh sách tên các thành viên trong nhóm

### Thử thách
> Tạo mảng "diemSo" lưu điểm 10 bài kiểm tra. Tính điểm trung bình, điểm cao nhất, điểm thấp nhất. Hiển thị kết quả lên màn hình robot!

---

## Bài 3: Hàm Có Kết Quả Trả Về (Functions with Return Values)

### Mục tiêu
- Trẻ hiểu hàm có thể trả về kết quả
- Trẻ tạo hàm tính toán và trả kết quả
- Trẻ kết hợp hàm với mảng

### Hoạt động chính
1. **Giới thiệu** (10 phút): Máy tính bỏ túi - nhập số, ra kết quả
2. **Thực hành** (25 phút):
   - Tạo hàm "tinhTong" nhận mảng, trả về tổng
   - Tạo hàm "tinhTrungBinh" trả về trung bình cộng
   - Tạo hàm "kiemTraChanLe" trả về ĐÚNG/SAI

### Khối lệnh học
```
📦 TẠO HÀM tinhTong(mang)
│   ├── 📦 tong = 0
│   ├── 🔄 LẶP LẠI với giaTri TRONG mang
│   │   └── 📦 tong = tong + giaTri
│   └── ⏪ TRẢ VỀ tong

📦 TẠO HÀM kiemTraChanLe(so)
│   └── 🔍 NẾU so % 2 = 0
│       THÌ ⏪ TRẢ VỀ "CHẴN"
│       NGƯỢC LẠI THÌ ⏪ TRẢ VỀ "LẺ"

🟢 KHI BẮT ĐẦU
├── 📦 mangSo = [10, 15, 20, 25, 30]
├── 📦 ketQua = ▶️ tinhTong(mangSo)
├── 💬 HIỂN THỊ "Tổng = " + ketQua
└── 💬 HIỂN THỊ ▶️ kiemTraChanLe(16)
```

### Biểu thức toán học trong hàm
| Toán tử | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| + | Cộng | 5 + 3 = 8 |
| - | Trừ | 5 - 3 = 2 |
| * | Nhân | 5 * 3 = 15 |
| / | Chia | 15 / 3 = 5 |
| % | Chia lấy dư | 17 % 5 = 2 |
| ** | Lũy thừa | 2 ** 3 = 8 |

### Thử thách
> Tạo hàm "tinhBMI" nhận cân nặng (kg) và chiều cao (m), trả về chỉ số BMI. Sau đó tạo hàm "phanLoaiBMI" nhận BMI, trả về "Gầy"/"Bình thường"/"Béo phì"!

---

## Bài 4: Vòng Lặp While - Lặp Đến Khi Đạt Điều Kiện (While Loops)

### Mục tiêu
- Trẻ hiểu vòng lặp while lặp đến khi điều kiện sai
- Trẻ phân biệt vòng lặp for và while
- Trẻ sử dụng while cho bài toán tìm kiếm

### Hoạt động chính
1. **Giới thiệu** (10 phút): "Cứ đi đến khi gặp tường" - vòng lặp while
2. **Thực hành** (25 phút):
   - Robot đi tìm đích trong mê cung
   - Robot đo khoảng cách liên tục đến khi < 5cm

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 daTimThay = SAI
└── 🔄 LẶP LẠI đến khi daTimThay = ĐÚNG
    ├── 🔵 TIẾN TỚI 1 bước
    ├── 📊 khoangCach = CẢM BIẾN KHOẢNG CÁCH
    └── 🔍 NẾU khoangCach < 5cm
        THÌ
        ├── 📦 daTimThay = ĐÚNG
        └── 🔊 PHÁT ÂM THANH "TÌM THẤY"

# Vòng lặp vô hạn với break
🔄 LẶP LẠI mãi mãi
    ├── 🔵 TIẾN TỚI 1 bước
    ├── 📊 docNhietDo = CẢM BIẾN NHIỆT ĐỘ
    └── 🔍 NẾU docNhietDo > 80
        THÌ
        ├── 🔊 PHÁT ÂM THANH "NÓNG QUÁ!"
        └── ⏹️ DỪNG VÒNG LẶP
```

### For vs While
| For | While |
|-----|-------|
| Biết trước số lần lặp | Chưa biết trước số lần lặp |
| `LẶP LẠI 10 lần` | `LẶP LẠI đến khi tìm thấy` |
| Đếm số lần | Chờ điều kiện |

### Thử thách
> Lập trình robot tìm đường ra khỏi mê cung: đi thẳng đến khi gặp tường, rẽ, đi tiếp đến khi ra ngoài! Sử dụng vòng lặp while với biến đếm số bước tối đa.

---

## Bài 5: State Machine - Máy Trạng Thái

### Mục tiêu
- Trẻ hiểu "trạng thái" là một chế độ hoạt động của robot
- Trẻ thiết kế state machine với nhiều trạng thái
- Trẻ lập trình robot thay đổi hành vi theo trạng thái

### Hoạt động chính
1. **Giới thiệu** (10 phút): Robot hút bụi - có nhiều chế độ (làm sạch, sạc pin, tránh vật cản)
2. **Thực hành** (25 phút):
   - Tạo robot giao hàng với 3 trạng thái: CHỜ, DI, GIAO
   - Robot chuyển trạng thái khi nhận lệnh

### Sơ đồ trạng thái
```
┌─────────┐     nhận lệnh     ┌─────────┐
│  CHỜ    │ ───────────────→ │   DI    │
└─────────┘                   └─────────┘
    ↑                              │
    │                              ▼
    │                        nhận hàng
    │                              │
    │                        ┌─────────┐
    └──────────────────────── │  GIAO   │
                             └─────────┘
                                  │
                              giao xong
                                  │
                                  ↓
                            ┌─────────┐
                            │  CHỜ    │
                            └─────────┘
```

### Khối lệnh học
```
📦 TẠO HÀM chuyenTrangThai(trangThaiHienTai, lenh)
│   └── 🔍 NẾU trangThaiHienTai = "CHỜ"
│       THÌ
│       ├── 🔍 NẾU lenh = "BAT_DAU"
│       │   THÌ ⏪ TRẢ VỀ "DI"
│       NGƯỢC LẠI THÌ ⏪ TRẢ VỀ "CHỜ"
│       ...

🟢 KHI BẮT ĐẦU
├── 📦 trangThai = "CHỜ"
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔍 NẾU trangThai = "CHỜ"
    │   THÌ
    │   ├── 💬 HIỂN THỊ "ĐANG CHỜ..."
    │   └── 🔊 CHỜ TÍN HIỆU
    ├── 🔍 NẾU trangThai = "DI"
    │   THÌ
    │   ├── 🔵 TIẾN TỚI 1 bước
    │   └── 🔍 NẾU ĐẾN ĐÍCH
    │       THÌ 📦 trangThai = "GIAO"
    └── 🔍 NẾU trangThai = "GIAO"
        THÌ
        ├── 🔊 PHÁT ÂM THANH "ĐÃ GIAO"
        └── 📦 trangThai = "CHỜ"
```

### Ứng dụng thực tế
- Robot hút bụi: CHỜ → DỌN DẸP → SẠC PIN → CHỜ
- Game state: MENU → PLAYING → PAUSED → GAME_OVER
- Robot giao hàng: CHỜ → LẤY HÀNG → DI → GIAO → QUAY VỀ → CHỜ

### Thử thách
> Thiết kế "Robot phục vụ quán café" với 4 trạng thái: CHỜ_ORDER, LÀM_CÀ_PHÊ, MANG_TRA, THU_TIEN. Robot chuyển trạng thái khi có sự kiện!

---

## Bài 6: Camera và Nhận Diện Màu Sắc (Camera and Color Recognition)

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

## Bài 7: Tìm Đường Ngắn Nhất - Thuật Toán A* (Pathfinding - A* Algorithm)

### Mục tiêu
- Trẻ hiểu "tìm đường" là bài toán quan trọng trong robotics
- Trẻ làm quen với khái niệm đồ thị (graph) và nút (node)
- Trẻ hiểu thuật toán A* cơ bản: đánh giá chi phí để tìm đường tối ưu

### Hoạt động chính
1. **Giới thiệu** (10 phút): GPS tìm đường ngắn nhất từ A đến B
2. **Thực hành** (25 phút):
   - Trẻ vẽ bản đồ 5x5 ô trên giấy
   - Đánh dấu vật cản
   - Tìm đường bằng tay từ start đến goal
   - Đánh giá chi phí mỗi đường đi

### Sơ đồ đồ thị
```
    A ---1--- B ---2--- C
    |       X   |       |
    4       3   1       5
    |       |   |       |
    D ---2--- E ---1--- F
    |               |
    3               2
    |               |
    G ---4--- H ---1--- I

Đường A→B→C→F→I: 1+2+5+2 = 10
Đường A→D→E→F→I: 4+2+1+2 = 9 (tốt hơn!)
```

### Thuật toán A* cơ bản (giản lược)
```
Hàm tìmĐường(start, goal):
1. Cho start vào danh sách mở
2. Lặp:
   a. Chọn nút có chi phí thấp nhất trong danh sách mở
   b. Nếu là goal → tìm thấy!
   c. Xem xét tất cả nút láng giềng:
      - Tính chi phí mới = chi phí hiện tại + khoảng cách đến nút láng giềng
      - Nếu chi phí mới tốt hơn → cập nhật
   d. Di chuyển nút hiện tại sang danh sách đóng
3. Không tìm thấy → không có đường
```

### Khối lệnh học (giả lập trên máy tính)
```
📦 TẠO HÀM timDuong(bando, start, goal)
│   ├── 📦 danhSachMo = [start]
│   ├── 📦 chiPhi = {start: 0}
│   └── 🔄 LẶP LẠI đến khi goal trong danhSachMo = SAI
│       └── 🔍 ... (thuật toán A*)

🟢 KHI BẮT ĐẦU
├── 📦 bando = TẠO BẢN ĐỒ 5x5
├── 📦 vatCan = [[1,1], [2,2], [3,3]]  # Tọa độ vật cản
├── 📦 duongDi = ▶️ timDuong(bando, [0,0], [4,4])
└── 💬 HIỂN THỊ "Đường đi: " + duongDi
```

### Thử thách
> Trên giấy 10x10 ô, đặt 5 vật cản. Tìm đường từ góc trên-trái đến góc dưới-phải sao cho:
> 1. Đường đi ngắn nhất
> 2. Không đi qua vật cản
> 3. Robot đi theo đường đã tìm được!

---

## Bài 8: PID Controller - Điều Khiển Ổn Định

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

## Bài 9: Giao Tiếp Nhiều Robot (Multi-Robot Communication)

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

## Bài 10: Machine Learning Cơ Bản - Robot Học Từ Dữ Liệu

### Mục tiêu
- Trẻ hiểu "học máy" là gì - robot học từ dữ liệu thay vì được lập trình trực tiếp
- Trẻ hiểu khái niệm huấn luyện (training) và dự đoán (prediction)
- Trẻ sử dụng model đã được huấn luyện để nhận diện hình ảnh

### Hoạt động chính
1. **Giới thiệu** (10 phút): Facebook nhận diện khuôn mặt, Gmail lọc spam - đều là ML!
2. **Thực hành** (25 phút):
   - Robot nhận diện hình ảnh: mèo hay chó?
   - Robot phân loại vật thể: táo, cam, chuối

### Các loại Machine Learning
| Loại | Mô tả | Ví dụ |
|------|-------|-------|
| Học có giám sát | Train với dữ liệu đã gắn nhãn | Nhận diện khuôn mặt |
| Học không giám sát | Tự tìm pattern trong dữ liệu | Phân nhóm khách hàng |
| Học củng cố | Học từ phần thưởng/phạt | Robot học đi |

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📷 CHỤP ẢNH
├── 📊 ketQua = ML NHẬN DIỆN HÌNH ẢNH
│   # ketQua = { "nhan": "MÈO", "doChinhXac": 0.87 }
├── 💬 HIỂN THỊ "Đây là: " + ketQua.nhan
└── 🔍 NẾU ketQua.doChinhXac > 0.8
    THÌ
    ├── 🔊 PHÁT ÂM THANH "NHẬN DIỆN THÀNH CÔNG"
    └── 🔵 TIẾN TỚI 5 bước
    NGƯỢC LẠI
    THÌ
    └── 🔊 PHÁT ÂM THANH "KHÔNG CHẮC CHẮN"
```

### Ứng dụng thực tế
- Nhận diện bệnh từ ảnh X-quang
- Dịch thuật tự động
- Robot phân loại sản phẩm
- Xe tự hành nhận diện biển báo

### Thử thách
> Train robot nhận diện 3 loại trái cây (táo, cam, chuối). Đưa ra 5 trái cây test, đếm số nhận diện đúng. Độ chính xác bao nhiêu phần trăm?

---

## Bài 11: Data Logging - Ghi Dữ Liệu và Phân Tích

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

## Bài 12: Thiết Kế Kỹ Thuật - Engineering Design Process

### Mục tiêu
- Trẻ hiểu quy trình thiết kế kỹ thuật (Engineering Design Process)
- Trẻ áp dụng 5 bước: Xác định vấn đề → Nghiên cứu → Thiết kế → Prototype → Kiểm tra
- Trẻ làm việc nhóm để giải quyết bài toán thực tế

### Hoạt động chính
1. **Giảng giải** (15 phút): Giới thiệu Engineering Design Process
2. **Thực hành** (30 phút): Thiết kế robot mở nắp chai tự động

### 5 Bước Engineering Design Process
```
1. XÁC ĐỊNH VẤN ĐỀ
   → "Làm sao mở nắp chai mà không cần dùng tay?"

2. NGHIÊN CỨU
   → Tìm hiểu các loại nắp chai, cơ cấu máy
   → Xem video robot mở nắp trong công nghiệp

3. THIẾT KẾ
   → Vẽ sơ đồ robot
   → Liệt kê vật liệu cần dùng
   → Lên kế hoạch chế tạo

4. PROTOTYPE
   → Chế tạo mô hình thu nhỏ
   → Lắp ráp các bộ phận

5. KIỂM TRA
   → Thử nghiệm với các loại nắp chai khác nhau
   → Ghi lại kết quả và cải tiến
```

### Tiêu chí thiết kế
| Tiêu chí | Giải thích | Ví dụ |
|----------|-----------|-------|
| Chức năng | Robot làm được gì? | Mở được nắp chai |
| Độ bền | Robot chịu được bao lâu? | Sử dụng 100 lần không hỏng |
| Chi phí | Tốn bao nhiêu để làm? | Dưới 500,000 VNĐ |
| An toàn | Có nguy hiểm không? | Không có cạnh sắc |
| Thẩm mỹ | Nhìn có đẹp không? | Màu sắc hài hòa |

### Thử thách
> Nhóm 3-4 trẻ thiết kế robot mang nước tự động:
> 1. Xác định vấn đề: Tại sao cần robot này?
> 2. Nghiên cứu: Tìm hiểu về robot mang đồ
> 3. Thiết kế: Vẽ sơ đồ, liệt kê linh kiện
> 4. Prototype: Làm mô hình bằng giấy/bìa
> 5. Kiểm tra: Thử với các tình huống khác nhau

---

## Bài 13: Cuộc Thi Robot - Chiến Lược và Tối Ưu Hóa

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

## Bài 14: Đọc Dữ Liệu Từ Internet - IoT Cơ Bản (Internet of Things)

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

## Bài 15: Dự Án Cuối Khóa - Robot Thông Minh Của Em (Final Project)

### Mục tiêu
- Trẻ tự thiết kế và lập trình robot theo ý tưởng riêng
- Trẻ kết hợp tất cả kiến thức đã học
- Trẻ trình bày và giải thích dự án trước lớp

### Yêu cầu dự án
```
🎯 Mỗi nhóm (3-4 trẻ) tạo 1 ứng dụng robot sáng tạo:

BẮT BUỘC:
- Phải sử dụng ít nhất 5 loại khối lệnh khác nhau
- Phải có ít nhất 1 mảng hoặc danh sách
- Phải có ít nhất 1 hàm có tham số và giá trị trả về
- Phải có ít nhất 1 vòng lặp while
- Phải có ít nhất 1 state machine
- Phải giao tiếp với internet hoặc robot khác

KHUYẾN KHÍCH:
- Sử dụng camera hoặc ML
- Sử dụng PID controller
- Ghi dữ liệu và phân tích
```

### Gợi ý dự án
| # | Tên dự án | Mô tả | Kiến thức sử dụng |
|---|-----------|-------|-------------------|
| 1 | Robot thời tiết thông minh | Báo thời tiết, gợi ý hoạt động | IoT, mảng, hàm |
| 2 | Robot bảo vệ nhà | Phát hiện người lạ, báo động | Camera, ML, state machine |
| 3 | Robot giao hàng trong nhà | Nhận đơn, giao hàng tự động | Pathfinding, wireless |
| 4 | Robot trồng cây thông minh | Tưới nước theo độ ẩm đất | Sensors, IoT, PID |
| 5 | Robot dọn dẹp thông minh | Tự tìm và nhặt rác | Camera, navigation |
| 6 | Robot y tế | Đo nhiệt độ, báo khi sốt | Sensors, alert system |
| 7 | Robot giám sát môi trường | Đo chất lượng không khí | Sensors, data logging |
| 8 | Robot điều khiển bằng giọng nói | Nghe lệnh, thực hiện | Speech recognition, wireless |

### Trình bày dự án
1. **Giới thiệu** (3 phút): Tên dự án, ý tưởng, vấn đề giải quyết
2. **Demo** (5 phút): Chạy chương trình thực tế
3. **Kỹ thuật** (3 phút): Giải thích code quan trọng nhất
4. **Hỏi đáp** (4 phút): Lớp hỏi câu hỏi

### Tiêu chí đánh giá
| Tiêu chí | Xuất sắc (9-10) | Tốt (7-8) | Đang học (5-6) |
|----------|----------------|-----------|----------------|
| Sáng tạo | ý tưởng mới lạ, độc đáo | ý tưởng hay, có cải tiến | ý tưởng bám sát mẫu |
| Kỹ thuật | ≥6 khối, ≥2 hàm, PID/ML | ≥5 khối, ≥1 hàm, mảng | ≥3 khối, mảng cơ bản |
| Hoạt động | Robot chạy mượt, đúng ý | Robot chạy được, cần sửa nhỏ | Robot chạy không ổn định |
| Trình bày | Nói rõ ràng, tự tin, có demo | Nói được, có demo | Cần hỗ trợ nhiều |

### Kỹ năng đạt được sau 15 bài
- ✓ Lập trình nâng cao với mảng, hàm, vòng lặp while
- ✓ State machine và điều khiển phức tạp
- ✓ Machine Learning cơ bản
- ✓ IoT và giao tiếp internet
- ✓ PID Controller và điều khiển ổn định
- ✓ Làm việc nhóm và trình bày dự án
- ✓ Tư duy kỹ thuật và giải quyết vấn đề

---

## Tổng kết Advanced Curriculum

| Bài | Tên | Khối mới | Kỹ năng |
|-----|------|----------|---------|
| 1 | Chào mừng | Ôn tập nâng cao | Tổng hợp |
| 2 | Mảng và Danh Sách | Arrays, Indexing | Lưu trữ dữ liệu |
| 3 | Hàm Return | ⏪ TRẢ VỀ | Tính toán |
| 4 | Vòng lặp While | While loop, Break | Vòng lặp thông minh |
| 5 | State Machine | Máy trạng thái | Điều khiển phức tạp |
| 6 | Camera | 📷 NHẬN DIỆN MÀU | Thị giác máy |
| 7 | Pathfinding A* | Đồ thị, nút, chi phí | Tìm đường |
| 8 | PID Controller | P-I-D | Điều khiển ổn định |
| 9 | Multi-Robot | 📡 Multi-communication | Kết nối robot |
| 10 | Machine Learning | ML NHẬN DIỆN | Học từ dữ liệu |
| 11 | Data Logging | Ghi dữ liệu, phân tích | Thu thập dữ liệu |
| 12 | Engineering Design | 5 bước thiết kế | Quy trình kỹ thuật |
| 13 | Cuộc thi Robot | Chiến lược, tối ưu | Cạnh tranh |
| 14 | IoT | Lấy dữ liệu internet | Kết nối đám mây |
| 15 | Dự án cuối khóa | TẤT CẢ KHỐI | Sáng tạo, tổng hợp |

---

*RoboKids Vietnam - "Trẻ em Việt Nam học lập trình robot từ 6 tuổi"*
*Hoàn thành Advanced Curriculum - Sẵn sàng cho Robotics chuyên nghiệp!*