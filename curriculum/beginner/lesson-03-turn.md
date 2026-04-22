---
performance:
  loadTime: 1.3
  videoCount: 1
  hasQuiz: true
  hasOffline: true
  lazyLoadVideo: true
---

# Bài 3: Robot Rẽ Trái và Rẽ Phải (Robot Turns)

## Mục tiêu
- Trẻ hiểu và sử dụng thành thạo khối "RẼ TRÁI" và "RẼ PHẢI"
- Trẻ phân biệt rõ ràng hướng trái và hướng phải của robot
- Trẻ hiểu khái niệm góc 90 độ (góc vuông)
- Trẻ kết hợp tiến và rẽ để điều khiển robot theo đường thẳng góc

## Hoạt động chính

### 1. Khởi động - Trò chơi "Robot nhỏ" (10 phút)
- **Trò chơi đóng vai:**
  - Một trẻ đóng vai Robot đứng giữa lớp (bịt mắt)
  - Một trẻ là Người lập trình
  - Người lập trình ra lệnh: "Rẽ trái!", "Rẽ phải!", "Tiến lên!"
- **Thử thách:** Người lập trình điều khiển Robot đi từ cửa đến bảng mà không va vào bàn
- **Thảo luận:** Khi nào robot cần rẽ? (quanh góc phòng, trán vật cản, đi theo đường vuông góc)

### 2. Giảng giải lý thuyết (10 phút)
- **Hướng của Robot:**
  - Đứng sau robot → nhìn theo hướng robot đi
  - Tay trái của robot = hướng RẼ TRÁI
  - Tay phải của robot = hướng RẼ PHẢI
- **Góc 90 độ:**
  - Đặt tay theo hướng robot đang nhìn
  - Xoay một góc bằng góc tờ giấy = 90 độ
  - Robot quay đúng một góc vuông
- **Quy tắc:** RẼ TRÁI + RẼ PHẢI = Quay 180 độ (quay ngược lại)

### 3. Thực hành Blockly (25 phút)
- **Bước 1:** Kéo khối KHI BẮT ĐẦU
- **Bước 2:** Kéo khối TIẾN TỚI 2 bước
- **Bước 3:** Kéo khối RẼ TRÁI 90 độ, gắn vào bên dưới
- **Bước 4:** Kéo khối TIẾN TỚI 2 bước, gắn tiếp
- **Bước 5:** Nhấn chạy và quan sát!
- **Thử thêm:** Rẽ phải thay vì rẽ trái

## Khối lệnh học
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 2 bước
├── 🔵 RẼ TRÁI 90 độ
├── 🔵 TIẾN TỚI 2 bước
└── 🔵 RẼ PHẢI 90 độ
```

## Từ vựng mới
- **Rẽ trái**: Quay robot sang hướng bên trái (90 độ)
- **Rẽ phải**: Quay robot sang hướng bên phải (90 độ)
- **90 độ**: Quay một góc vuông, bằng góc của tờ giấy hay cạnh bàn học
- **Hướng**: Phía mà robot đang nhìn và di chuyển tới

## Thử thách
> **Làm robot đi hình vuông hoàn chỉnh!**
>
> *Gợi ý: Hình vuông có 4 cạnh bằng nhau và 4 góc vuông (90 độ)*
>
> ```
> 🟢 KHI BẮT ĐẦU
> ├── 🔵 TIẾN TỚI 2 bước
> ├── 🔵 RẼ PHẢI 90 độ
> ├── 🔵 TIẾN TỚI 2 bước
> ├── 🔵 RẼ PHẢI 90 độ
> ├── 🔵 TIẾN TỚI 2 bước
> ├── 🔵 RẼ PHẢI 90 độ
> └── 🔵 TIẾN TỚI 2 bước
> ```

## Tình huống thực hành (Test Scenarios)

### Tình huống 1: Robot Đi Góc Phòng
> Robot đang ở góc phòng A, cần đi đến góc phòng B (đối diện qua 1 góc). Em hãy lập trình robot đi từ A đến B.

**Phân tích:**
- Robot cần rẽ 2 lần để đi qua 1 góc
- Mỗi lần rẽ = 90 độ

### Tình huống 2: Robot Tránh Vật Cản
> Có một vật cản trước mặt robot. Robot cần đi vòng qua vật cản để đến đích.

**Yêu cầu:**
1. Robot đi thẳng đến trước vật cản
2. Rẽ trái/và đi vòng
3. Rẽ phải/v để quay về hướng ban đầu

### Tình huống 3: Robot Vẽ Chữ L
> Em hãy lập trình robot vẽ chữ "L" trên sàn.

**Gợi ý:**
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ TRÁI 90 độ
└── 🔵 TIẾN TỚI 2 bước
```

## Câu hỏi kiểm tra

### Câu 1 (Hiểu khái niệm)
**Khi robot rẽ phải 90 độ, robot sẽ quay sang đâu?**
- A) Quay ngược lại
- B) Quay sang bên trái
- C) Quay sang bên phải của robot (hướng tay phải robot đang chỉ)
- D) Quay một vòng tròn

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: C** - RẼ PHẢI có nghĩa là robot quay sang hướng bên phải của nó (theo hướng tay phải robot đang chỉ).
</details>

### Câu 2 (Vận dụng)
**Muốn robot quay ngược lại (180 độ), em cần làm gì?**
- A) Rẽ trái 2 lần (90 độ + 90 độ = 180 độ)
- B) Rẽ phải 1 lần 180 độ
- C) Tiến tới 100 bước
- D) Không thể quay 180 độ

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: A** - Rẽ trái 90 độ + Rẽ trái 90 độ = 180 độ (quay ngược). Hoặc RẼ PHẢI 2 lần cũng cho kết quả tương tự.
</details>

### Câu 3 (Phân tích)
**Hình vuông có mấy góc vuông (90 độ)?**
- A) 2 góc
- B) 3 góc
- C) 4 góc
- D) 6 góc

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: C** - Hình vuông có 4 góc vuông, mỗi góc = 90 độ.
</details>

## Ghi nhớ
> **RẼ TRÁI + RẼ PHẢI = Điều khiển robot theo góc vuông**
> Rẽ 2 lần cùng hướng = Quay 180 độ (ngược lại)!

---
*RoboKids Vietnam - Bài 3/10 lớp robotics 6-8 tuổi - Beta Curriculum*
