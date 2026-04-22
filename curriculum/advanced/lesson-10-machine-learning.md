# Bài 10: Machine Learning Cơ Bản - Robot Học Từ Dữ Liệu

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
*RoboKids Vietnam - Bài 10/15 lớp robotics 13-16 tuổi - Advanced Curriculum*