# Bài 13: Cảm Biến Va Chạm (Touch Sensor)

## Mục tiêu
- Trẻ hiểu cảm biến va chạm là "nút bấm" của robot
- Trẻ sử dụng khối "CẢM BIẾN VA CHẠM" để phát hiện chạm
- Trẻ lập trình robot phản ứng khi chạm vào vật

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ chạm tay vào công tắc đèn
- **Giải thích:** Cảm biến va chạm = nút bấm siêu nhạy, phát hiện khi có lực chạm
- **So sánh:** Cảm biến khoảng cách (đo xa) vs cảm biến va chạm (chạm trực tiếp)

### 2. Thực hành (25 phút)
- **Bài 1:** Robot đi thẳng, NẾU chạm vật THÌ lùi lại và rẽ
- **Bài 2:** Robot bật đèn ĐỎ khi va chạm (như đèn phanh ô tô)
- **Bài 3:** Robot đẩy bóng - đẩy đến khi chạm tường thì dừng

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN VA CHẠM = ĐƯỢC NHẤN
        THÌ
        ├── 🔵 DỪNG LẠI
        ├── 🔴 BẬT ĐÈN ĐỎ
        ├── 🔊 PHÁT ÂM THANH "ÚI"
        └── 🔵 LÙI LẠI 2 bước

# Robot đẩy bóng
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN VA CHẠM = ĐƯỢC NHẤN
        THÌ
        ├── 🔵 DỪNG LẠI
        └── 💬 HIỂN THỊ "ĐÃ CHẠM!"
```

## Ứng dụng thực tế
- Công tắc bàn phím
- Đèn pin bật khi chạm
- Robot công nghiệp dừng khi chạm người (an toàn)

## Thử thách
> Lập trình "Robot thu thập": Đặt 5 vật nhỏ trên sàn. Robot đi tìm bằng cách đẩy, khi chạm vật thì nhặt vào rổ. Đếm số vật đã thu thập!

---
