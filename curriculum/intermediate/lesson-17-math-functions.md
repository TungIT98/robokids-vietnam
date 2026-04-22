# Bài 17: Robot Đếm Số Đặc Biệt (Math Functions)

## Mục tiêu
- Trẻ làm quen với các phép toán đặc biệt: chia lấy dư, làm tròn
- Trẻ sử dụng khối toán học nâng cao trong lập trình
- Trẻ giải bài toán thực tế bằng toán học

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** 17 ÷ 5 = ? Trẻ dùng máy tính, quan sát kết quả lẻ
- **Giải thích:** Phép chia lấy dư (%) cho biết còn dư bao nhiêu
- **Ví dụ:** 17 % 5 = 2 vì 17 = 5×3 + 2

### 2. Thực hành (25 phút)
- **Bài 1:** Tính tổng các số từ 1 đến 10
- **Bài 2:** Kiểm tra số chẵn/lẻ bằng phép chia lấy dư
- **Bài 3:** Robot đi theo "bàn cờ" - mỗi ô là 2 bước, kiểm tra vị trí

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 📦 tong = 0
├── 🔄 LẶP LẠI 10 lần
│   ├── 📦 dem = dem + 1
│   └── 📦 tong = tong + dem
└── 💬 HIỂN THỊ "TONG 1+...+10 = " + tong

# Kiểm tra chẵn lẻ
🟢 KHI BẮT ĐẦU
├── 📦 so = 7
├── 📦 du = so % 2
└── 🔍 NẾU du = 0
    THÌ 💬 HIỂN THỊ so + " LA SO CHAN"
    NGƯỢC LẠI
    THÌ 💬 HIỂN THỊ so + " LA SO LE"

# Robot đi trên lưới 5x5
🟢 KHI BẮT ĐẦU
├── 📦 cot = 0
├── 📦 hang = 0
└── 🔄 LẶP LẠI 25 lần
    ├── 🔵 TIẾN TỚI 2 bước
    ├── 📦 cot = cot + 1
    └── 🔍 NẾU cot = 5
        THÌ
        ├── 📦 cot = 0
        ├── 📦 hang = hang + 1
        └── 🔵 RẼ PHẢI 90 độ + TIẾN TỚI 2 bước + RẼ TRÁI 90 độ
```

## Phép toán đặc biệt
| Phép toán | Ý nghĩa | Ví dụ |
|-----------|---------|-------|
| % | Chia lấy dư | 17 % 5 = 2 |
| abs() | Giá trị tuyệt đối | abs(-5) = 5 |
| round() | Làm tròn | round(3.7) = 4 |

## Thử thách
> Lập trình "Máy tính tuổi robot": Hỏi năm sinh của bạn. Tính tuổi = năm nay - năm sinh. Kiểm tra tuổi > 10 thì nói "Ban lon!", không thì nói "Ban nho!"

---
