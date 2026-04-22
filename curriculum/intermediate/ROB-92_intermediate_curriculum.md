# RoboKids Vietnam - Intermediate Curriculum
## Lớp Robotics Cho Trẻ 9-12 Tuổi

---

## Bài 1: Chào Mừng Trở Lại! (Welcome Back!)

### Mục tiêu
- Ôn tập lại các khối lệnh đã học ở lớp beginner
- Trẻ làm quen với giao diện nâng cao
- Trẻ hiểu robot có thể làm được nhiều việc phức tạp hơn

### Hoạt động chính
1. **Kiểm tra kiến thức** (10 phút): Trẻ lập trình robot vẽ hình vuông từ bộ nhớ
2. **Giới thiệu** (5 phút): Cho xem video robot phức tạp - robot跳舞, robot giải cứu
3. **Thực hành** (20 phút): Tạo chương trình riêng: robot khiêu vũ với đèn + âm thanh

### Khối lệnh ôn tập
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ PHẢI 90 độ
├── 🔄 LẶP LẠI 4 lần
│   ├── 🔵 TIẾN TỚI 2 bước
│   └── 🔵 RẼ TRÁI 90 độ
├── 🔴 BẬT ĐÈN XANH
└── 🔊 PHÁT ÂM THANH "HOAN HOA"
```

### Câu hỏi thảo luận
- Robot có thể làm gì mà trẻ chưa thấy ở lớp beginner?
- Làm sao robot biết đường đi mà không cần ta bảo từng bước?

---

## Bài 2: Ôn Tập & Biến Số (Variables)

### Mục tiêu
- Trẻ hiểu "biến số" là gì - như một cái hộp đựng số
- Trẻ tạo và sử dụng biến để lưu tốc độ, số bước
- Trẻ thay đổi giá trị biến trong chương trình

### Hoạt động chính
1. **Giới thiệu khái niệm** (10 phút): "Hộp đựng số" - biến là cái hộp có tên
2. **Thực hành** (25 phút):
   - Tạo biến "tocDo" = 2
   - Dùng biến trong khối TIẾN TỚI
   - Thay đổi tocDo = 4 và xem robot nhanh hơn

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT tocDo = 2
├── 🔵 TIẾN TỚI tocDo bước
└── 📦 ĐẶT tocDo = 4

hoặc trong khối:
📦 tocDo = 5
```

### Biến số trong cuộc sống
- Điểm số trong lớp (biến "diem")
- Số tiền trong ví (biến "soTien")
- Tuổi của robot (biến "tuoi")

### Thử thách
> Tạo biến "soLanLap" và dùng nó trong khối LẶP LẠI để robot vẽ hình có số cạnh thay đổi được!

---

## Bài 3: Nhận Dữ Liệu Từ Người Dùng (User Input)

### Mục tiêu
- Trẻ hiểu chương trình có thể "hỏi" người dùng
- Trẻ sử dụng khối "HỎI" để nhận số từ người dùng
- Trẻ kết hợp input với biến để tạo chương trình tương tác

### Hoạt động chính
1. **Giới thiệu** (10 phút): Trẻ chơi trò "Điều khiển robot bằng giọng nói"
2. **Thực hành** (25 phút):
   - Robot hỏi: "Bạn muốn đi mấy bước?"
   - Người dùng nhập số
   - Robot thực hiện lệnh

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 💬 HỎI "Bạn muốn đi mấy bước?" và lưu vào soBuoc
├── 🔵 TIẾN TỚI soBuoc bước
└── 🔊 PHÁT ÂM THANH "XONG"
```

### Ứng dụng thực tế
- ATM hỏi bạn muốn rút bao nhiêu tiền
- Game hỏi tên để lưu điểm
- Robot hỏi bạn chọn màu đèn

### Thử thách
> Tạo chương trình robot hỏi "Bạn muốn robot làm gì?" với 3 lựa chọn: đi thẳng, rẽ, hoặc lùi!

---

## Bài 4: Điều Kiện Nếu - Thì (If-Then Conditions)

### Mục tiêu
- Trẻ hiểu câu lệnh "Nếu... thì..." trong lập trình
- Trẻ sử dụng khối "NẾU... THÌ" để ra quyết định
- Trẻ lập trình robot phản ứng khác nhau với các tình huống khác nhau

### Hoạt động chính
1. **Trò chơi "Nếu - Thì"** (10 phút): Trẻ đứng lên NẾU mặc áo đỏ, ngồi xuống NẾU mặc áo xanh
2. **Giảng giải** (5 phút): Giới thiệu khối NẾU với cảm biến
3. **Thực hành** (20 phút): Robot đi thẳng, NẾU gặp vật cản THÌ rẽ phải

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 1 bước
└── 🔍 NẾU CẢM BIẾN KHOẢNG CÁCH < 10cm
    THÌ
    ├── 🔵 DỪNG LẠI
    ├── 🔵 RẼ PHẢI 90 độ
    └── 🔊 PHÁT ÂM THANH "ĐÃ QUAY"
```

### Sơ đồ quyết định
```
Robot đi thẳng
    ↓
Có vật cản không?
    ↓ YES → Rẽ phải → Phát âm thanh
    ↓ NO → Tiếp tục đi thẳng
```

### Thử thách
> Lập trình robot đi trong phòng: NẾU gặp tường THÌ quay lại, NẾU gặp góc THÌ rẽ!

---

## Bài 5: So Sánh Lớn Hơn, Nhỏ Hơn (Comparison Operators)

### Mục tiêu
- Trẻ hiểu các phép so sánh: lớn hơn (>), nhỏ hơn (<), bằng (=)
- Trẻ sử dụng so sánh để ra quyết định có điều kiện
- Trẻ kết hợp so sánh với biến đếm

### Hoạt động chính
1. **Trò chơi so sánh** (10 phút): Trẻ giơ tay nếu tuổi > 10, giơ chân nếu tuổi < 10
2. **Giảng giải** (5 phút): Giới thiệu các phép so sánh với số
3. **Thực hành** (20 phút): Robot đếm số bước, NẾU số bước > 10 THÌ dừng lại và bật đèn

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT dem = 0
└── 🔄 LẶP LẠI đến khi dem > 10
    ├── 🔵 TIẾN TỚI 1 bước
    ├── 📦 dem = dem + 1
    └── 🔍 NẾU dem = 10
        THÌ
        ├── 🔴 BẬT ĐÈN ĐỎ
        └── 🔊 PHÁT ÂM THANH "DUNG"
```

### Toán tử so sánh
| Toán tử | Ý nghĩa | Ví dụ |
|---------|---------|-------|
| > | Lớn hơn | 5 > 3 = Đúng |
| < | Nhỏ hơn | 2 < 8 = Đúng |
| = | Bằng | 4 = 4 = Đúng |
| ≠ | Khác | 3 ≠ 5 = Đúng |
| ≥ | Lớn hơn hoặc bằng | 5 ≥ 5 = Đúng |
| ≤ | Nhỏ hơn hoặc bằng | 3 ≤ 7 = Đúng |

### Thử thách
> Tạo "máy đếm thông minh": robot đếm người đi qua cửa, NẾU đếm ≥ 5 người THÌ bật đèn xanh báo "Đủ người"!

---

## Bài 6: Cảm Biến Đường Line (Line Following Sensor)

### Mục tiêu
- Trẻ hiểu cảm biến đường line hoạt động như thế nào
- Trẻ sử dụng khối "CẢM BIẾN LINE" để robot đi theo đường kẻ
- Trẻ kết hợp cảm biến với vòng lặp và điều kiện

### Hoạt động chính
1. **Thí nghiệm** (10 phút): Trẻ vẽ đường line đen trên giấy trắng, thử robot đi
2. **Giảng giải** (5 phút): Cảm biến line phát hiện màu đen vs màu trắng
3. **Thực hành** (20 phút):
   - Robot đi theo đường kẻ thẳng
   - Robot đi theo đường kẻ rẽ

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    └── 🔍 NẾU CẢM BIẾN LINE bên trái = ĐEN
        VÀ CẢM BIẾN LINE bên phải = TRẮNG
        THÌ
        ├── 🔵 RẼ TRÁI 5 độ
        └── 🔍 NGƯỢC LẠI NẾU CẢM BIẾN LINE bên phải = ĐEN
            VÀ CẢM BIẾN LINE bên trái = TRẮNG
            THÌ
            ├── 🔵 RẼ PHẢI 5 độ
            └── 🔍 NGƯỢC LẠI
                THÌ
                └── 🔵 TIẾN TỚI 1 bước
```

### Nguyên lý hoạt động
- Cảm biến line gồm 2-3 mắt đọc
- Mắt trên vạch đen → trả về "ĐEN"
- Mắt trên vạch trắng → trả về "TRẮNG"
- Robot điều chỉnh hướng để GIỮ ĐƯỜNG

### Thử thách
> Thi robot đi theo đường line hình số 8! Ai nhanh hơn!

---

## Bài 7: Cảm Biến Ánh Sáng (Light Sensor)

### Mục tiêu
- Trẻ hiểu cảm biến ánh sáng đo độ sáng môi trường
- Trẻ sử dụng phép so sánh với ngưỡng sáng
- Trẻ lập trình robot phản ứng với bóng tối và ánh sáng

### Hoạt động chính
1. **Thí nghiệm** (10 phút): Đo độ sáng ở các góc phòng, góc tối, ngoài trời
2. **Giảng giải** (5 phút): Giới thiệu khái niệm "ngưỡng sáng" (threshold)
3. **Thực hành** (20 phút):
   - Robot đi tìm nơi sáng nhất trong phòng
   - Robot bật đèn khi trời tối (như đèn đường thông minh)

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT nguongSang = 50
└── 🔄 LẶP LẠI mãi mãi
    ├── 📊 docDoSang = CẢM BIẾN ÁNH SÁNG
    └── 🔍 NẾU docDoSang < nguongSang
        THÌ
        ├── 🔴 BẬT ĐÈN TRẮNG
        └── 🔊 PHÁT ÂM THANH "TRỜI TỐI RỒI"
        NGƯỢC LẠI
        THÌ
        ├── 🔵 TẮT ĐÈN
        └── 🔵 TIẾN TỚI 1 bước
```

### Ứng dụng thực tế
- Đèn đường tự bật khi trời tối
- Robot hướng ánh sáng (phototropism)
- Máy tính điều chỉnh độ sáng màn hình tự động

### Thử thách
> Lập trình robot "cú vọ": đi về phía có ánh sáng mạnh nhất! Đây là cách cây cối tìm ánh sáng mặt trời!

---

## Bài 8: Hàm - Khối Lệnh Đặt Tên (Functions)

### Mục tiêu
- Trẻ hiểu "hàm" là một nhóm lệnh được đặt tên
- Trẻ tạo hàm riêng để tái sử dụng code
- Trẻ gọi hàm để làm code ngắn gọn hơn

### Hoạt động chính
1. **Giới thiệu** (10 phút): "Nếu ta có một khối LEGO lớn gồm nhiều khối nhỏ..."
2. **Thực hành** (25 phút):
   - Tạo hàm "veHinhVuong" gồm 4 lệnh tiến + rẽ
   - Gọi hàm veHinhVuong 3 lần để vẽ 3 hình vuông

### Khối lệnh học
```
📦 TẠO HÀM veHinhVuong
│   ├── 🔵 TIẾN TỚI 3 bước
│   ├── 🔵 RẼ PHẢI 90 độ
│   ├── 🔵 TIẾN TỚI 3 bước
│   ├── 🔵 RẼ PHẢI 90 độ
│   ├── 🔵 TIẾN TỚI 3 bước
│   └── 🔵 RẼ PHẢI 90 độ

🟢 KHI BẮT ĐẦU
├── 🔵 RẼ PHẢI 90 độ
├── ▶️ veHinhVuong
├── 🔵 RẼ TRÁI 90 độ
├── ▶️ veHinhVuong
└── ▶️ veHinhVuong
```

### Tại sao dùng hàm?
| Không dùng hàm | Dùng hàm |
|----------------|----------|
| Phải viết 12 lệnh cho 3 hình vuông | Chỉ viết 1 lần, gọi 3 lần |
| Code dài, khó đọc | Code ngắn, dễ hiểu |
| Muốn sửa phải sửa nhiều chỗ | Sửa 1 chỗ, áp dụng tất cả |

### Thử thách
> Tạo hàm "veHinhTamGiac" và dùng nó để vẽ 1 hình tam giác đều! Sau đó tạo hàm "veHinhSao" để vẽ hình sao!

---

## Bài 9: Tham Số và Giá Trị Trả Về (Parameters & Return Values)

### Mục tiêu
- Trẻ hiểu "tham số" là dữ liệu ta truyền vào hàm
- Trẻ tạo hàm có tham số để làm hàm linh hoạt hơn
- Trẻ hiểu "giá trị trả về" là kết quả hàm trả ra

### Hoạt động chính
1. **Giới thiệu** (10 phút): Máy ATM - bạn nhập số tiền (tham số), ATM trả tiền ra (giá trị trả về)
2. **Thực hành** (25 phút):
   - Tạo hàm "veHinh" có tham số "soCanh" và "doDai"
   - Gọi veHinh(4, 3) → vẽ hình vuông cạnh 3
   - Gọi veHinh(3, 4) → vẽ hình tam giác cạnh 4

### Khối lệnh học
```
📦 TẠO HÀM veHinh(soCanh, doDai)
│   └── 🔄 LẶP LẠI soCanh lần
│       ├── 🔵 TIẾN TỚI doDai bước
│       └── 🔵 RẼ PHẢI (360 / soCanh) độ

🟢 KHI BẮT ĐẦU
├── ▶️ veHinh(soCanh=4, doDai=3)
├── 🔵 TIẾN TỚI 5 bước
└── ▶️ veHinh(soCanh=3, doDai=4)
```

### Ví dụ tham số
| Hàm | Tham số | Kết quả |
|-----|---------|---------|
| làmNướcCam | (soLuongCam) | Nước cam với số cam được chỉ định |
| veHinh | (soCanh, doDai) | Hình với số cạnh và độ dài được chỉ định |
| phatAmThanh | (amThanh) | Phát âm thanh được chỉ định |

### Thử thách
> Tạo hàm "nhancode" có tham số "soLan" - nhảy đi nhảy lại "soLan" lần. Sau đó gọi nhancode(5)!

---

## Bài 10: Điều Kiện Phức Tạp - VÀ, HOẶC, KHÔNG (Complex Conditions)

### Mục tiêu
- Trẻ hiểu phép logic VÀ (AND), HOẶC (OR), KHÔNG (NOT)
- Trẻ kết hợp nhiều điều kiện trong một câu lệnh
- Trẻ lập trình robot với quyết định phức tạp

### Hoạt động chính
1. **Trò chơi logic** (10 phút): "Hãy đứng lên nếu bạn mặc ÁO ĐỎ VÀ quần DÀI"
2. **Giảng giải** (5 phút): Bảng chân trị logic
3. **Thực hành** (20 phút): Robot phản ứng với nhiều điều kiện cùng lúc

### Bảng chân trị
| Điều kiện A | Điều kiện B | A VÀ B | A HOẶC B | KHÔNG A |
|-------------|-------------|--------|---------|--------|
| Đúng | Đúng | Đúng | Đúng | Sai |
| Đúng | Sai | Sai | Đúng | Sai |
| Sai | Đúng | Sai | Đúng | Đúng |
| Sai | Sai | Sai | Sai | Đúng |

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔍 NẾU
    CẢM BIẾN KHOẢNG CÁCH < 10cm
    VÀ CẢM BIẾN ÁNH SÁNG < 50
    THÌ
    ├── 🔴 BẬT ĐÈN ĐỎ
    ├── 🔊 PHÁT ÂM THANH "CẢNH BÁO"
    └── 🔵 RẼ PHẢI 180 độ

HAY NẾU
    NÚT A ĐƯỢC NHẤN
    HOẶC NÚT B ĐƯỢC NHẤN
    THÌ
    └── 🔵 TIẾN TỚI 5 bước
```

### Ứng dụng thực tế
- Máy ATM: NẾU có thẻ VÀ nhập đúng mã PIN → cho rút tiền
- Robot: NẾU pin yếu HOẶC gặp vật cản → quay về trạm sạc

### Thử thách
> Lập trình robot "gác đêm": NẾU phát hiện chuyển độNG VÀ trời tối → bật đèn + báo động!

---

## Bài 11: Biến Trong Vòng Lặp (Loop Counters)

### Mục tiêu
- Trẻ sử dụng biến để đếm số lần lặp
- Trẻ thay đổi biến trong vòng lặp để thay đổi hành vi
- Trẻ kết hợp biến + điều kiện để làm vòng lặp thông minh

### Hoạt động chính
1. **Trò chơi đếm** (10 phút): Trẻ đếm từ 1 đến 10, mỗi số robot làm 1 hành động
2. **Giảng giải** (5 phút): Biến đếm tăng dần hoặc giảm dần
3. **Thực hành** (20 phút): Robot vẽ hình xoắn ốc - mỗi lần lặp, độ dài bước tăng thêm 1

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT buoc = 1
├── 📦 ĐẶT goc = 90
└── 🔄 LẶP LẠI 10 lần
    ├── 🔵 TIẾN TỚI buoc bước
    ├── 🔵 RẼ PHẢI goc độ
    └── 📦 buoc = buoc + 1
```

### Hiệu ứng xoắn ốc
```
Lần 1: đi 1 bước
Lần 2: đi 2 bước
Lần 3: đi 3 bước
...
Lần 10: đi 10 bước
→ Tạo thành hình xoắn ốc!
```

### Thử thách
> Tạo robot "vẽ bậc thang": mỗi lần lặp, đi lên 1 bước và rẽ 90 độ. Sau 5 lần, robot đi xuống về vị trí cũ!

---

## Bài 12: Game Logic - Điểm Số và Mạng Chơi (Score & Lives)

### Mục tiêu
- Trẻ hiểu cách game lưu điểm số và mạng chơi
- Trẻ sử dụng biến để theo dõi điểm và mạng
- Trẻ lập trình robot chơi game đơn giản

### Hoạt động chính
1. **Phân tích game** (10 phút): Trẻ chơi một game đơn giản, đếm điểm và mạng
2. **Thực hành** (25 phút):
   - Tạo game "Robot né vật cản"
   - Mỗi lần né được: +10 điểm
   - Mỗi lần va vào: -1 mạng

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT diem = 0
├── 📦 ĐẶT mang = 3
└── 🔄 LẶP LẠI đến khi mang = 0
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN KHOẢNG CÁCH < 5cm
        THÌ
        ├── 📦 mang = mang - 1
        ├── 🔴 BẬT ĐÈN ĐỎ
        ├── 🔊 PHÁT ÂM THANH "TRÚT"
        └── 🔵 RẼ TRÁI 180 độ
        NGƯỢC LẠI
        THÌ
        └── 📦 diem = diem + 1

🔚 KHI KẾT THÚC GAME
├── 🔊 PHÁT ÂM THANH "HẾT"
└── 💬 HIỂN THỊ "ĐIỂM CỦA BẠN: " + diem
```

### Bảng điểm
| Sự kiện | Điểm | Mạng |
|---------|------|------|
| Né được vật cản | +10 | 3 |
| Va vào vật cản | -5 | -1 |
| Chạm đích | +50 | 0 |
| Hoàn thành 10 vòng | +100 | 0 |

### Thử thách
> Nâng cấp game: thêm điều kiện NẾU diem > 100 THÌ robot được tăng tốc! Thêm tính năng "thu thập vật phẩm" để +20 điểm!

---

## Bài 13: Giao Tiếp Không Dây (Wireless Communication)

### Mục tiêu
- Trẻ hiểu robot có thể giao tiếp không dây với nhau
- Trẻ sử dụng khối "GỬI TIN NHẮN" và "NHẬN TIN NHẮN"
- Trẻ lập trình 2 robot nói chuyện với nhau

### Hoạt động chính
1. **Trò chơi "Cò mù"** (10 phút): 1 trẻ ra lệnh, 1 trẻ thực hiện (giống wireless!)
2. **Giảng giải** (5 phút): Bluetooth/WiFi giữa 2 robot
3. **Thực hành** (25 phút):
   - Robot A gửi "DI_THANG" → Robot B đi thẳng
   - Robot A gửi "QUAY_TRAI" → Robot B rẽ trái

### Khối lệnh học
```
# ROBOT A (Điều khiển)
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 📡 GỬI TIN NHẮN "QUAY_TRAI"
└── 🔊 PHÁT ÂM THANH "ĐÃ GỬI"

# ROBOT B (Được điều khiển)
🟢 KHI NHẬN ĐƯỢC TIN NHẮN "QUAY_TRAI"
├── 🔵 RẼ TRÁI 90 độ
└── 🔵 TIẾN TỚI 2 bước

🟢 KHI NHẬN ĐƯỢC TIN NHẮN "DI_THANG"
└── 🔵 TIẾN TỚI 3 bước
```

### Ứng dụng thực tế
- Điều khiển drone bằng điện thoại
- Loa Bluetooth nhận nhạc từ laptop
- Xe tự hành giao tiếp trong đoàn

### Thử thách
> Lập trình "điện thoại robot": 1 robot hỏi "Bạn muốn tôi đi đâu?", người dùng nhấn nút, robot nhận lệnh và thực hiện! Gửi kết quả về robot kia!

---

## Bài 14: Điều Hướng Tự Động (Autonomous Navigation)

### Mục tiêu
- Trẻ kết hợp tất cả kiến thức đã học
- Trẻ lập trình robot tự tìm đường trong mê cung
- Trẻ phát triển tư duy giải quyết vấn đề phức tạp

### Hoạt động chính
1. **Thiết kế mê cung** (10 phút): Trẻ vẽ mê cung trên giấy A2
2. **Lập trình** (25 phút):
   - Robot thăm dò bằng cảm biến
   - Robot lưu vị trí đã đi vào biến
   - Robot quyết định hướng đi

### Thuật toán tay phải (Right-hand rule)
```
Luôn đi theo tường bên phải:
1. Nếu có thể rẽ phải → rẽ phải
2. Nếu không → đi thẳng
3. Nếu không → rẽ trái
4. Nếu không → quay lại
```

### Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 ĐẶT thanhCong = SAI
└── 🔄 LẶP LẠI đến khi thanhCong = ĐÚNG
    ├── 🔍 NẾU CẢM BIẾN LINE bên phải = TRẮNG
        THÌ
        ├── 🔵 RẼ PHẢI 90 độ
        └── 🔵 TIẾN TỚI 1 bước
    NGƯỢC LẠI NẾU CẢM BIẾN PHÍA TRƯỚC = TRẮNG
        THÌ
        └── 🔵 TIẾN TỚI 1 bước
    NGƯỢC LẠI NẾU CẢM BIẾN LINE bên trái = TRẮNG
        THÌ
        ├── 🔵 RẼ TRÁI 90 độ
        └── 🔵 TIẾN TỚI 1 bước
    NGƯỢC LẠI
        THÌ
        └── 🔵 QUAY LẠI 180 độ

# Khi đến đích (vật thể màu đỏ)
🔍 NẾU CẢM BIẾN MÀU = ĐỎ
THÌ
├── 📦 thanhCong = ĐÚNG
├── 🔊 PHÁT ÂM THANH "THÀNH CÔNG"
└── 🔴 BẬT ĐÈN XANH NHẤP NHÁY
```

### Thử thách
> Thi "Robot thoát mê cung"! Ai robot thoát ra nhanh nhất với ít va chạm nhất!

---

## Bài 15: Dự Án Cuối Khóa - Robot Thông Minh Của Em (Final Project)

### Mục tiêu
- Trẻ tự thiết kế và lập trình robot theo ý tưởng riêng
- Trẻ kết hợp tất cả khối lệnh đã học
- Trẻ trình bày và giải thích dự án trước lớp

### Yêu cầu dự án
```
🎯 Mỗi nhóm (2-3 trẻ) tạo 1 ứng dụng robot sáng tạo:
- Phải sử dụng ít nhất 5 loại khối lệnh khác nhau
- Phải có ít nhất 1 biến số
- Phải có ít nhất 1 hàm tự tạo
- Phải có ít nhất 1 điều kiện phức tạp (VÀ/HOẶC)
```

### Gợi ý dự án
| # | Tên dự án | Mô tả | Khối cần dùng |
|---|-----------|-------|---------------|
| 1 | Robot giao hàng | Đi từ kho đến nhà, tránh vật cản | Line, khoảng cách, VÒNG LẶP |
| 2 | Robot bảo vệ | Canh gác, báo động khi có người | Cảm biến, âm thanh, đèn |
| 3 | Robot phát nhạc | Đi theo nhịp, phát nhạc khi đến đích | Âm thanh, biến, vòng lặp |
| 4 | Robot đo thời tiết | Đo ánh sáng, nhiệt độ, báo cho robot khác | Cảm biến, wireless |
| 5 | Robot vẽ tranh | Vẽ hình theo chương trình tự tạo | Hàm, tham số, vòng lặp |
| 6 | Robot dọn dẹp | Tìm và nhặt rác trong phòng | Cảm biến, điều kiện, game logic |
| 7 | Robot thú cưng | Phản ứng khi vuốt ve, khi gọi | Cảm biến, âm thanh, wireless |
| 8 | Robot vận động viên | Chạy đua, đếm bước, so sánh thành tích | Biến, so sánh, game logic |

### Trình bày dự án
1. **Giới thiệu** (3 phút): Tên dự án, ý tưởng
2. **Demo** (3 phút): Chạy chương trình thực tế
3. **Giải thích** (2 phút): Code quan trọng nhất
4. **Hỏi đáp** (2 phút): Lớp hỏi câu hỏi

### Tiêu chí đánh giá
| Tiêu chí | Xuất sắc (9-10) | Tốt (7-8) | Đang học (5-6) |
|----------|----------------|-----------|----------------|
| Sáng tạo | ý tưởng mới lạ, độc đáo | ý tưởng hay, có cải tiến | ý tưởng bám sát mẫu |
| Kỹ thuật | ≥7 khối, ≥2 hàm, biến phức tạp | ≥5 khối, ≥1 hàm, biến | ≥3 khối, biến cơ bản |
| Hoạt động | Robot chạy mượt, đúng ý | Robot chạy được, cần sửa nhỏ | Robot chạy không ổn định |
| Trình bày | Nói rõ ràng, tự tin, có demo | Nói được, có demo | Cần hỗ trợ nhiều |

---

## Tổng kết Intermediate Curriculum

| Bài | Tên | Khối mới | Kỹ năng |
|-----|------|----------|---------|
| 1 | Chào mừng trở lại | Ôn tập | Tổng hợp |
| 2 | Biến số | 📦 ĐẶT, biến số | Lưu trữ dữ liệu |
| 3 | Nhận dữ liệu | 💬 HỎI | Tương tác người dùng |
| 4 | Điều kiện Nếu-Thì | NẾU... THÌ | Ra quyết định |
| 5 | So sánh | >, <, =, ≥, ≤ | Tư duy logic |
| 6 | Cảm biến Line | CẢM BIẾN LINE | Điều hướng |
| 7 | Cảm biến ánh sáng | CẢM BIẾN ÁNH SÁNG | Phản ứng môi trường |
| 8 | Hàm | TẠO HÀM | Tái sử dụng code |
| 9 | Tham số | Tham số, giá trị trả về | Hàm linh hoạt |
| 10 | Logic phức tạp | VÀ, HOẶC, KHÔNG | Tư duy phức tạp |
| 11 | Biến trong vòng lặp | Biến đếm | Vòng lặp thông minh |
| 12 | Game Logic | Điểm, mạng chơi | Thiết kế game |
| 13 | Giao tiếp không dây | GỬI/NHẬN TIN NHẮN | Kết nối robot |
| 14 | Điều hướng tự động | Thuật toán mê cung | Giải quyết vấn đề |
| 15 | Dự án cuối khóa | TẤT CẢ KHỐI | Sáng tạo, tổng hợp |
| 16 | Robot Đọc Nút Bấm | NÚT A/B, INPUT | Điều khiển tương tác |
| 17 | Robot Đếm Số Đặc Biệt | %, abs(), round() | Toán học nâng cao |
| 18 | Robot Ghi Âm | GHI ÂM, PHÁT ÂM | Âm thanh tùy chỉnh |
| 19 | Robot Bật/Tắt Thiết Bị | ĐÈN, QUẠT, CÒI | Điều khiển đa thiết bị |
| 20 | Dự Án Cuối Khóa v2 | TẤT CẢ KHỐI | Sáng tạo nâng cao |

---

## Tổng kết Intermediate Curriculum (20 bài)

| Tier | Số bài | Độ tuổi | Khối mới |
|------|--------|---------|----------|
| Beginner | 10 bài | 6-8 tuổi | Cơ bản |
| Intermediate | 20 bài | 9-12 tuổi | Cảm biến, Hàm, Logic |
| Advanced | 15 bài | 13-16 tuổi | Arrays, PID, ML |

---

*Hoàn thành: 20 bài Intermediate + 15 bài Advanced = 45 bài học Robotics!*
*Bước tiếp theo: Competition Team (VEX/FLL)*
*RoboKids Vietnam - "Trẻ em Việt Nam học lập trình robot từ 6 tuổi"*
