---
performance:
  loadTime: 1.3
  videoCount: 1
  hasQuiz: true
  hasOffline: true
  lazyLoadVideo: true
---

# Bài 2: Robot Đi Thẳng (Robot Moves Forward)

## Mục tiêu
- Trẻ hiểu và sử dụng thành thạo khối "TIẾN TỚI"
- Trẻ điều khiển robot đi thẳng với số bước chính xác
- Trẻ hiểu mối quan hệ giữa số bước và khoảng cách di chuyển
- Trẻ phát triển tư duy đếm và ước lượng khoảng cách

## Hoạt động chính

### 1. Ôn bài cũ (5 phút)
- Hỏi nhanh: Robot cần gì để hoạt động?
- Nhắc lại khối "KHI BẮT ĐẦU" - khối nào phải có đầu tiên?
- Gọi 1-2 trẻ lên thực hành: Kéo khối KHI BẮT ĐẦU vào vùng lập trình

### 2. Giảng giải mới (10 phút)
- **Giới thiệu khối "TIẾN TỚI":** Di chuyển về phía trước theo hướng robot đang nhìn
- **Số bước:** Mỗi bước = khoảng cách bằng chiều rộng robot
- **Hướng dẫn kéo-thả:**
  1. Kéo khối "KHI BẮT ĐẦU" vào vùng lập trình
  2. Kéo khối "TIẾN TỚI" và gắn vào bên dưới
  3. Chọn số bước (1, 2, 3...)
  4. Nhấn nút chạy!
- **Thực hành mẫu:** Robot tiến 1 bước trước mặt cả lớp

### 3. Thực hành theo trạm (25 phút)
- **Trạm 1 - Cơ bản:** Robot tiến 1 bước, 2 bước, 3 bước
- **Trạm 2 - Đếm số:** Đặt vật cản cách robot 5 bước, điều khiển robot chạm đúng vật cản
- **Trạm 3 - Thi đua:** Thi xem ai điều khiển robot đi thẳng chính xác nhất đến vạch đích

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
└── 🔵 TIẾN TỚI 1 bước
```

```
🟢 KHI BẮT ĐẦU
└── 🔵 TIẾN TỚI 5 bước
```

## Từ vựng mới
- **Tiến tới**: Di chuyển về phía trước (theo hướng robot đang nhìn)
- **Bước**: Đơn vị đo khoảng cách di chuyển của robot (1 bước ≈ chiều rộng robot)
- **Phía trước**: Hướng mà robot đang đối diện

## Thử thách
> **Làm robot đi thẳng 5 bước mà không lệch khỏi đường thẳng!**
>
> *Tip: Nếu robot lệch, thử điều chỉnh số bước ít hơn và nhắm hướng robot chính xác trước khi chạy!*

## Tình huống thực hành (Test Scenarios)

### Tình huống 1: Robot Giao Hàng
> Robot cần giao một gói hàng đến vị trí cách nó 4 bước. Em hãy lập trình robot đi đúng 4 bước để đến nơi giao hàng.

**Chương trình mẫu:**
```
🟢 KHI BẮT ĐẦU
└── 🔵 TIẾN TỚI 4 bước
```

### Tình huống 2: Robot Vượt Rào
> Trước mặt robot có một hàng rào nhỏ cách 3 bước. Robot cần đi vòng qua hàng rào (cần đi thẳng 3 bước, quay, đi tiếp).

**Gợi ý:** Cần thêm khối RẼ TRÁI hoặc RẼ PHẢI (sẽ học ở bài sau!)

### Tình huống 3: Robot Đếm Bước
> Em hãy điều khiển robot đi thẳng 10 bước. Sau đó điều khiển robot lùi lại đúng 10 bước để quay về vị trí ban đầu.

**Gợi ý:** Bài sau sẽ học khối LÙI LẠI!

## Câu hỏi kiểm tra

### Câu 1 (Hiểu khái niệm)
**Khối "TIẾN TỚI 3 bước" có nghĩa là gì?**
- A) Robot quay 3 vòng
- B) Robot đi lùi 3 bước
- C) Robot đi về phía trước 3 khoảng cách bằng bước chân robot
- D) Robot dừng lại 3 giây

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: C** - Khối TIẾN TỚI di chuyển robot về phía trước theo hướng robot đang nhìn, với số bước tương ứng.
</details>

### Câu 2 (Vận dụng)
**Muốn robot đi xa hơn, em cần làm gì?**
- A) Tăng số bước lên (ví dụ: từ 2 bước lên 5 bước)
- B) Giảm số bước xuống
- C) Thay khối TIẾN TỚI bằng khối khác
- D) Nhấn nút chạy nhiều lần

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: A** - Tăng số bước sẽ làm robot đi xa hơn, giảm số bước sẽ làm robot đi ngắn hơn.
</details>

### Câu 3 (Phân biệt)
**Khối nào phải có TRƯỚC khối TIẾN TỚI?**
- A) Không cần khối nào, TIẾN TỚI có thể đứng một mình
- B) 🔵 LÙI LẠI
- C) 🟢 KHI BẮT ĐẦU
- D) 🔄 LẶP LẠI

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: C** - Mọi chương trình đều phải bắt đầu bằng khối KHI BẮT ĐẦU.
</details>

## Ghi nhớ
> **TIẾN TỚI + SỐ BƯỚC = Robot đi về phía trước**
> Số bước càng lớn → Robot đi càng xa!

---
*RoboKids Vietnam - Bài 2/10 lớp robotics 6-8 tuổi - Beta Curriculum*
