# Bài 3: Hàm Có Kết Quả Trả Về (Functions with Return Values)

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
*RoboKids Vietnam - Bài 3/15 lớp robotics 13-16 tuổi - Advanced Curriculum*