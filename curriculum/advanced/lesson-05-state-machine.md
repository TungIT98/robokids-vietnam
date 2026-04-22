# Bài 5: State Machine - Máy Trạng Thái

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
*RoboKids Vietnam - Bài 5/15 lớp robotics 13-16 tuổi - Advanced Curriculum*