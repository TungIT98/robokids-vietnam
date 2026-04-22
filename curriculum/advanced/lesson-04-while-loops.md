# Bài 4: Vòng Lặp While - Lặp Đến Khi Đạt Điều Kiện (While Loops)

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
*RoboKids Vietnam - Bài 4/15 lớp robotics 13-16 tuổi - Advanced Curriculum*