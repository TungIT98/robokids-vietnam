---
performance:
  loadTime: 1.3
  videoCount: 1
  hasQuiz: true
  hasOffline: true
  lazyLoadVideo: true
---

# Bài 4: Robot Lùi Lại (Robot Moves Backward)

## Mục tiêu
- Trẻ hiểu và sử dụng thành thạo khối "LÙI LẠI"
- Trẻ kết hợp được TIẾN TỚI và LÙI LẠI trong một chương trình
- Trẻ hiểu khái niệm "quay về" và điều khiển robot ra- vào vị trí
- Trẻ phát triển tư duy không gian (trước/sau)

## Hoạt động chính

### 1. Ôn bài cũ (5 phút)
- Hỏi nhanh: Khối nào giúp robot quay sang trái/phải?
- Gọi 1 trẻ lên bảng: Lập trình robot đi hình vuông
- Thảo luận: Robot có thể đi lùi không? Robot cần đi lùi khi nào?

### 2. Khởi động - Trò chơi "Lái xe" (5 phút)
- **Trò chơi đóng vai:**
  - Một trẻ điều khiển robot bằng giọng nói
  - Trẻ kia đóng vai robot
  - "Tiến lên 2 bước... Lùi lại 1 bước... Rẽ phải..."
- **Mục đích:** Trẻ hiểu TIẾN = đi về phía trước, LÙI = đi ngược ra sau

### 3. Giảng giải lý thuyết (10 phút)
- **Khối "LÙI LẠI":** Di chuyển về phía sau (ngược hướng robot đang nhìn)
- **So sánh:**
  - TIẾN TỚI: Đi về phía trước (hướng robot nhìn)
  - LÙI LẠI: Đi về phía sau (hướng ngược lại)
- **Ứng dụng thực tế:**
  - Xe ô tô lùi vào bãi đỗ
  - Robot đẩy thùng hàng
  - Robot ra khỏi góc hẹp

### 4. Thực hành Blockly (25 phút)
- **Bước 1:** Kéo KHI BẮT ĐẦU
- **Bước 2:** Kéo TIẾN TỚI 3 bước
- **Bước 3:** Kéo LÙI LẠI 1 bước
- **Bước 4:** Nhấn chạy và quan sát!

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
└── 🔵 LÙI LẠI 1 bước
```

```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 5 bước
├── 🔵 RẼ PHẢI 90 độ
└── 🔵 LÙI LẠI 3 bước
```

## Từ vựng mới
- **Lùi lại**: Di chuyển ngược ra phía sau (hướng ngược với hướng robot đang nhìn)
- **Xuất phát**: Điểm bắt đầu, nơi robot bắt đầu di chuyển
- **Đích**: Nơi robot cần đến cuối chương trình
- **Quay về**: Trở lại vị trí ban đầu

## Thử thách
> **Điều khiển robot ra khỏi mê cung đơn giản!**
>
> Robot bắt đầu trong góc, cần đi ra ngoài:
> ```
> 🟢 KHI BẮT ĐẦU
> ├── 🔵 LÙI LẠI 2 bước
> ├── 🔵 RẼ TRÁI 90 độ
> ├── 🔵 TIẾN TỚI 3 bước
> └── 🔵 RẼ PHẢI 90 độ
> ```

## Tình huống thực hành (Test Scenarios)

### Tình huống 1: Robot Đậu Xe
> Robot cần đậu vào bãi đỗ phía sau. Em hãy lập trình robot đi từ vị trí xuất phát vào bãi đỗ (đi lùi).

**Phân tích:**
1. Robot tiến về phía bãi đỗ
2. Robot lùi vào bãi đỗ

### Tình huống 2: Robot Quay Về
> Robot đi thẳng 5 bước rồi cần quay về vị trí xuất phát. Em hãy lập trình robot quay về.

**Chương trình mẫu:**
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 5 bước
├── 🔵 RẼ TRÁI 90 độ
├── 🔵 RẼ TRÁI 90 độ
├── 🔵 TIẾN TỚI 5 bước
```

### Tình huống 3: Robot Đẩy Hộp
> Robot cần đẩy một hộp hàng ra khỏi phòng. Hộp ở phía trước robot. Em hãy lập trình robot đẩy hộp bằng cách lùi lại đẩy hộp ra sau.

**Gợi ý:**
```
🟢 KHI BẮT ĐẦU
└── 🔵 LÙI LẠI 5 bước  (đẩy hộp ra sau)
```

## Câu hỏi kiểm tra

### Câu 1 (Hiểu khái niệm)
**Khối "LÙI LẠI 3 bước" có nghĩa là gì?**
- A) Robot đi về phía trước 3 bước
- B) Robot đi ngược ra sau 3 bước
- C) Robot quay 3 vòng
- D) Robot đứng yên

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: B** - LÙI LẠI nghĩa là robot di chuyển ngược ra phía sau, theo hướng ngược với hướng robot đang nhìn.
</details>

### Câu 2 (Vận dụng)
**Robot đang ở vị trí A, cần quay về A (xuất phát). Robot đã đi TIẾN TỚI 4 bước. Em cần thêm gì để robot quay về?**
- A) LÙI LẠI 4 bước
- B) LÙI LẠI 8 bước
- C) RẼ TRÁI 90 độ
- D) Không cần thêm gì

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: A** - LÙI LẠI 4 bước sẽ đưa robot quay về vị trí xuất phát (đi bao xa thì lùi bấy nhiêu).
</details>

### Câu 3 (Phân tích)
**Khi nào robot CẦN lùi lại?**
- A) Chỉ khi chơi trò chơi
- B) Khi cần đi ra phía sau (đậu xe, ra khỏi góc, đẩy hàng ra sau)
- C) Robot không bao giờ cần lùi
- D) Chỉ khi hết pin

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: B** - Robot cần lùi trong nhiều tình huống thực tế như đậu xe lùi, ra khỏi không gian hẹp, hoặc đẩy vật thể ra sau.
</details>

## Ghi nhớ
> **TIẾN TỚI = Đi về phía trước**
> **LÙI LẠI = Đi ngược ra phía sau**
> Đi bao xa → Lùi bấy nhiêu → Quay về vị trí cũ!

---
*RoboKids Vietnam - Bài 4/10 lớp robotics 6-8 tuổi - Beta Curriculum*
