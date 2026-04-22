# Bài 18: Robot Ghi Âm (Sound Recording)

## Mục tiêu
- Trẻ hiểu robot có thể ghi và phát âm thanh tùy chỉnh
- Trẻ sử dụng khối "GHI ÂM" và "PHÁT ÂM THANH TÙY CHỈNH"
- Trẻ lập trình robot chào hỏi bằng giọng nói riêng

## Hoạt động chính

### 1. Giới thiệu (10 phút)
- **Thí nghiệm:** Trẻ ghi âm "Xin chào" vào robot, phát lại
- **Giải thích:** Micro ghi âm thanh thành dữ liệu số, loa phát lại
- **So sánh:** Âm thanh cố định (beep) vs Âm thanh tùy chỉnh (ghi âm)

### 2. Thực hành (25 phút)
- **Bài 1:** Ghi âm lời chào riêng, phát khi bắt đầu
- **Bài 2:** Robot ghi âm phản ứng: gặp vật cản → "Oops!"
- **Bài 3:** Robot đọc số điểm: "Diem cua ban la 85!"

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 🎤 GHI ÂM "Xin chao, toi la Robot!"
├── 🔵 TIẾN TỚI 3 bước
└── 🎵 PHÁT ÂM THANH "Xin chao, toi la Robot!"

# Robot phản ứng với âm thanh tùy chỉnh
🟢 KHI BẮT ĐẦU
└── 🔄 LẶP LẠI mãi mãi
    ├── 🔵 TIẾN TỚI 1 bước
    └── 🔍 NẾU CẢM BIẾN KHOẢNG CÁCH < 10cm
        THÌ
        ├── 🔵 DỪNG LẠI
        └── 🎵 PHÁT ÂM THANH "CO VAT CAN!"
```

## Ứng dụng thực tế
- Robot hướng dẫn du lịch
- Máy phát thanh trường học
- Đồ chơi nói tiếng Việt

## Thử thách
> Lập trình "Robot phóng viên": Ghi âm 5 câu hỏi khác nhau. Khi nhấn nút A → hỏi câu 1, nút B → hỏi câu 2, v.v. Robot đọc to câu hỏi để cả lớp nghe!

---
