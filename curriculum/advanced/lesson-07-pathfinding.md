# Bài 7: Tìm Đường Ngắn Nhất - Thuật Toán A* (Pathfinding - A* Algorithm)

### Mục tiêu
- Trẻ hiểu "tìm đường" là bài toán quan trọng trong robotics
- Trẻ làm quen với khái niệm đồ thị (graph) và nút (node)
- Trẻ hiểu thuật toán A* cơ bản: đánh giá chi phí để tìm đường tối ưu

### Hoạt động chính
1. **Giới thiệu** (10 phút): GPS tìm đường ngắn nhất từ A đến B
2. **Thực hành** (25 phút):
   - Trẻ vẽ bản đồ 5x5 ô trên giấy
   - Đánh dấu vật cản
   - Tìm đường bằng tay từ start đến goal
   - Đánh giá chi phí mỗi đường đi

### Sơ đồ đồ thị
```
    A ---1--- B ---2--- C
    |       X   |       |
    4       3   1       5
    |       |   |       |
    D ---2--- E ---1--- F
    |               |
    3               2
    |               |
    G ---4--- H ---1--- I

Đường A→B→C→F→I: 1+2+5+2 = 10
Đường A→D→E→F→I: 4+2+1+2 = 9 (tốt hơn!)
```

### Thuật toán A* cơ bản (giản lược)
```
Hàm tìmĐường(start, goal):
1. Cho start vào danh sách mở
2. Lặp:
   a. Chọn nút có chi phí thấp nhất trong danh sách mở
   b. Nếu là goal → tìm thấy!
   c. Xem xét tất cả nút láng giềng:
      - Tính chi phí mới = chi phí hiện tại + khoảng cách đến nút láng giềng
      - Nếu chi phí mới tốt hơn → cập nhật
   d. Di chuyển nút hiện tại sang danh sách đóng
3. Không tìm thấy → không có đường
```

### Khối lệnh học (giả lập trên máy tính)
```
📦 TẠO HÀM timDuong(bando, start, goal)
│   ├── 📦 danhSachMo = [start]
│   ├── 📦 chiPhi = {start: 0}
│   └── 🔄 LẶP LẠI đến khi goal trong danhSachMo = SAI
│       └── 🔍 ... (thuật toán A*)

🟢 KHI BẮT ĐẦU
├── 📦 bando = TẠO BẢN ĐỒ 5x5
├── 📦 vatCan = [[1,1], [2,2], [3,3]]  # Tọa độ vật cản
├── 📦 duongDi = ▶️ timDuong(bando, [0,0], [4,4])
└── 💬 HIỂN THỊ "Đường đi: " + duongDi
```

### Thử thách
> Trên giấy 10x10 ô, đặt 5 vật cản. Tìm đường từ góc trên-trái đến góc dưới-phải sao cho:
> 1. Đường đi ngắn nhất
> 2. Không đi qua vật cản
> 3. Robot đi theo đường đã tìm được!

---
*RoboKids Vietnam - Bài 7/15 lớp robotics 13-16 tuổi - Advanced Curriculum*