---
performance:
  loadTime: 1.4
  videoCount: 2
  hasQuiz: true
  hasOffline: true
  lazyLoadVideo: true
---

# Bài 5: Ghép Lệnh Thành Chương Trình (Sequencing Commands)

## Mục tiêu
- Trẻ hiểu chuỗi lệnh (sequence) là gì và tại sao thứ tự lệnh quan trọng
- Trẻ lập trình robot vẽ hình đơn giản bằng cách ghép nhiều lệnh
- Trẻ tự debug (tìm và sửa lỗi) đơn giản trong chương trình
- Trẻ phát triển tư duy logic và khả năng lập kế hoạch

## Hoạt động chính

### 1. Ôn bài cũ (5 phút)
- Hỏi nhanh: Liệt kê 4 khối đã học: TIẾN TỚI, LÙI LẠI, RẼ TRÁI, RẼ PHẢI
- Gọi 1 trẻ: Lập trình robot đi thẳng 3 bước rồi quay trái
- Hỏi: Nếu đổi thứ tự lệnh, robot sẽ đi đúng không?

### 2. Giảng giải lý thuyết (10 phút)
- **Chuỗi lệnh (Sequence):** Các lệnh được chạy theo thứ tự TỪ TRÊN XUỐNG DƯỚI
- **Ví dụ thực tế:** Pha một ly nước cam
  1. Chuẩn bị ly
  2. Cho nước
  3. Cho cam vắt
  4. Khuấy đều
  → Nếu đổi thứ tự (vắt cam trước khi có ly) → X卧洒!
- **Quy tắc vàng:** Lệnh trên chạy TRƯỚC, lệnh dưới chạy SAU
- **Debug là gì?** Tìm và sửa lỗi trong chương trình

### 3. Thực hành theo trạm (25 phút)
- **Trạm 1 - Vẽ chữ "L":**
  ```
  🟢 KHI BẮT ĐẦU
  ├── 🔵 TIẾN TỚI 3 bước
  ├── 🔵 RẼ TRÁI 90 độ
  └── 🔵 TIẾN TỚI 2 bước
  ```
- **Trạm 2 - Vẽ chữ "Z":**
  ```
  🟢 KHI BẮT ĐẦU
  ├── 🔵 TIẾN TỚI 3 bước
  ├── 🔵 RẼ TRÁI 90 độ
  ├── 🔵 TIẾN TỚI 3 bước
  ├── 🔵 RẼ PHẢI 90 độ
  └── 🔵 TIẾN TỚI 3 bước
  ```
- **Trạm 3 - Sáng tạo:** Tự thiết kế một hình của riêng mình

## Chương trình mẫu - Vẽ chữ "L"
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ TRÁI 90 độ
└── 🔵 TIẾN TỚI 2 bước
```

## Chương trình mẫu - Vẽ chữ "Z"
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ TRÁI 90 độ
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ PHẢI 90 độ
└── 🔵 TIẾN TỚI 3 bước
```

## Từ vựng mới
- **Chuỗi lệnh (Sequence)**: Các lệnh được sắp xếp và chạy theo thứ tự từ trên xuống dưới
- **Debug**: Tìm và sửa lỗi trong chương trình để robot hoạt động đúng
- **Logic**: Cách sắp xếp suy nghĩ và hành động theo trình tự hợp lý
- **Lập trình**: Viết ra các lệnh để robot thực hiện

## Thử thách
> **Tạo chương trình cho robot vẽ một hình mà em thích!**
>
> *Gợi ý hình: tam giác, chữ V, chữ U, hình thang...*
>
> *Trước khi lập trình, hãy vẽ ra giấy con đường robot sẽ đi!*

## Dấu hiệu debug
| Vấn đề | Nguyên nhân có thể | Cách sửa |
|--------|-------------------|----------|
| Robot không di chuyển | Khối chưa gắn vào KHI BẮT ĐẦU | Gắn khối vào bên dưới khối bắt đầu |
| Robot đi sai hướng | Thứ tự lệnh sai | Kiểm tra lại thứ tự lệnh |
| Robot quay nhầm | Nhầm RẼ TRÁI với RẼ PHẢI | Đổi sang khối khác |
| Robot đi lệch | Số bước không đúng | Thử tăng/giảm số bước |

## Tình huống thực hành (Test Scenarios)

### Tình huống 1: Debug Chương Trình
> Chương trình sau có lỗi. Em hãy tìm và sửa lỗi!
>
> ```
> 🟢 KHI BẮT ĐẦU
> ├── 🔵 RẼ TRÁI 90 độ  (robot không di chuyển trước!)
> ├── 🔵 TIẾN TỚI 2 bước
> └── 🔵 RẼ TRÁI 90 độ
> ```

**Phân tích lỗi:** Robot rẽ trái ngay khi bắt đầu mà không tiến lên → Robot xoay tại chỗ rồi đi lệch

**Sửa:**
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 2 bước
├── 🔵 RẼ TRÁI 90 độ
└── 🔵 TIẾN TỚI 2 bước
```

### Tình huống 2: Lập Trình Cho Robot Vẽ Tam Giác
> Em hãy lập trình robot vẽ một tam giác đều.
>
> **Gợi ý:**
> - Tam giác có 3 cạnh bằng nhau
> - Mỗi góc = 60 độ (hoặc quay tổng cộng 180 độ ở mỗi đỉnh)
> - Với robot: TIẾN → RẼ → TIẾN → RẼ → TIẾN → RẼ

**Chương trình mẫu:**
```
🟢 KHI BẮT ĐẦU
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ PHẢI 120 độ  (quay tạo góc tam giác)
├── 🔵 TIẾN TỚI 3 bước
├── 🔵 RẼ PHẢI 120 độ
├── 🔵 TIẾN TỚI 3 bước
└── 🔵 RẼ PHẢI 120 độ
```

### Tình huống 3: Robot Đi Qua Đường
> Robot cần đi qua đường (2 làn xe) để đến trường. Mô phỏng:
> - Đi thẳng qua làn 1
> - Rẽ phải qua làn 2
> - Đi thẳng đến đích

## Câu hỏi kiểm tra

### Câu 1 (Hiểu khái niệm)
**Tại sao thứ tự lệnh trong chương trình quan trọng?**
- A) Không quan trọng, robot hiểu hết
- B) Vì robot chạy lệnh theo thứ tự từ trên xuống, đổi thứ tự sẽ ra kết quả khác
- C) Chỉ cần một lệnh duy nhất
- D) Thứ tự chỉ quan trọng khi có vòng lặp

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: B** - Robot chạy các lệnh theo thứ tự từ trên xuống dưới. Nếu đổi thứ tự, robot sẽ thực hiện hành động khác so với mong muốn.
</details>

### Câu 2 (Vận dụng)
**Em muốn robot vẽ chữ "L". Lệnh nào đúng thứ tự?**
- A) RẼ TRÁI → TIẾN TỚI → TIẾN TỚI
- B) TIẾN TỚI → RẼ TRÁI → TIẾN TỚI
- C) TIẾN TỚI → TIẾN TỚI → RẼ TRÁI
- D) RẼ TRÁI → RẼ TRÁI → TIẾN TỚI

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: B** - Để vẽ chữ L: đi lên (TIẾN TỚI), quay trái, đi ngang (TIẾN TỚI). Thứ tự đúng tạo hình đúng.
</details>

### Câu 3 (Debug)
**Robot không di chuyển khi nhấn chạy. Khối TIẾN TỚI đã gắn vào KHI BẮT ĐẦU. Lỗi có thể là gì?**
- A) Robot hết pin
- B) Khối TIẾN TỚI chưa được gắn BÊN DƯỚI KHI BẮT ĐẦU (có thể đứng riêng)
- C) Khối TIẾN TỚI bị hỏng
- D) Robot cần thêm khối LÙI LẠI

<details>
<summary><b>Đáp án</b></summary>
**Đáp án: B** - Khối cần được gắn bên trong (nested) hoặc nối tiếp (stacked) với khối KHI BẮT ĐẦU. Nếu khối đứng riêng trong vùng lập trình, robot sẽ không chạy lệnh đó.
</details>

## Ghi nhớ
> **CHUỖI LỆNH = Lệnh trên → Lệnh dưới → Lệnh dưới nữa...**
> Đổi thứ tự = Kết quả khác = Robot đi sai!
> Debug = Tìm lỗi và sửa để robot hoạt động đúng

---
*RoboKids Vietnam - Bài 5/10 lớp robotics 6-8 tuổi - Beta Curriculum*
