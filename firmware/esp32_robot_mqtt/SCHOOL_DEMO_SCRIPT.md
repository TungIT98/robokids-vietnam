# RoboKids School Demo Script
## 30-45 Minute Interactive STEM Presentation

---

## Materials Needed

### Robot Demo
- Assembled ESP32 robot with demo firmware
- Battery: 2x Li-ion 18650 (fully charged)
- USB cable for programming (backup)

### Technology
- Laptop/Tablet with RoboKids Blockly IDE
- WiFi hotspot (mobile router or phone tethering)
- Projector/Display (optional)

### Handouts
- RoboKids brochures (10-20)
- Feedback forms (10-20)
- Business cards (10)

---

## SCRIPT

### PHASE 1: WELCOME & INTRODUCTION (5 minutes)

**Slide/Visual**: RoboKids logo + "Trẻ em Việt Nam học lập trình robot từ 6 tuổi"

---

**VOICEOVER/COMMENTS**:

> "Xin chào các em! Chào mừng các em đến với RoboKids!"
>
> [PAUSE for greetings]

> "Tớ tên là [TÊN], đến từ RoboKids Vietnam. Chúng tớ dạy trẻ em từ 6 tuổi cách lập trình robot."
>
> [INTERACTION POINT]
> "Có bạn nào đã từng lập trình máy tính chưa? Giơ tay lên nào!"
> [COUNT HANDS - adjust language based on responses]
> "Rất tốt! Dù các em đã lập trình hay chưa, hôm nay các em sẽ được làm quen với robot thật sự!"

---

### PHASE 2: SHOW THE ROBOT (5 minutes)

**Setup**: Place robot on table, visible to all students

---

**VOICEOVER/COMMENTS**:

> "Đây là robot RoboKids - được thiết kế và lập trình bởi đội ngũ Việt Nam!"
>
> [POINT TO COMPONENTS as you explain]

> "Robot có 'bộ não' là ESP32 - cùng loại chip có trong điện thoại thông minh."
>
> "Đây là 2 mô-tơ bánh xe - cho robot di chuyển."
>
> "Cảm biến siêu âm ở trước - giống như 'mắt' để đo khoảng cách."
>
> "Màn hình LED 8x8 - robot có thể hiển thị hình ảnh và ký tự."
>
> "Và đèn RGB - robot có thể thay đổi màu sắc!"

---

### PHASE 3: LIVE DEMO - BASIC MOVEMENTS (5 minutes)

**Setup**: Clear floor space, robot on ground

---

**VOICEOVER/COMMENTS**:

> "Bây giờ tớ sẽ cho các em xem robot di chuyển!"
>
> [SEND COMMANDS via tablet/laptop]

> "Câu lệnh đầu tiên: MOVE FORWARD!"
> [SEND: move_forward]
> [WATCH robot move]

> [EXCITED] "Các em thấy không! Robot vừa tiến về phía trước!"

> "Tiếp theo: TURN LEFT!"
> [SEND: turn_left]
> [WATCH robot turn]

> "Robot có thể quay trái, quay phải, lùi lại - giống như một chiếc xe!"

---

### PHASE 4: THE "DANCE" DEMO (2 minutes)

**Setup**: More space for movement

---

**VOICEOVER/COMMENTS**:

> "Robot không chỉ biết di chuyển đơn giản đâu! Các em muốn xem robot nhảy không?"
>
> [ENTHUSIASTIC] "Đây nè!"
>
> [SEND: dance]

> [LET ROBOT DANCE - ~5 seconds]
> [Point out LED colors changing]

> "Các em thấy không! Đèn LED thay đổi màu theo nhạc!"

---

### PHASE 5: INTRODUCE BLOCKLY CODING (5 minutes)

**Setup**: Show Blockly IDE on screen/projector

---

**VOICEOVER/COMMENTS**:

> "Bây giờ phần thú vị nhất - các em sẽ được tự mình lập trình robot!"
>
> "Chúng tớ sử dụng Blockly - một ngôn ngữ lập trình bằng khối, rất dễ hiểu."

> [SHOW BLOCKLY INTERFACE]

> "Thay vì viết chữ, các em kéo thả các khối màu vào vùng làm việc."
>
> "Khối 'move forward' có nghĩa là cho robot tiến về trước."
> [DEMONSTRATE by dragging a block]

> "Khối 'turn right' cho robot quay phải."
> [DEMONSTRATE]

> "Khối 'repeat' - lặp lại nhiều lần."
> [DEMONSTRATE]

> "Rất dễ phải không? Giống như lắp ghép Lego vậy!"

---

### PHASE 6: LIVE CODING SESSION (10-15 minutes)

**Setup**: Students gathered around laptop/tablet OR projector showing screen

---

**VOICEOVER/COMMENTS**:

> "Bây giờ tớ sẽ viết một chương trình đơn giản cùng các em!"
>
> [BUILD PROGRAM ON SCREEN as you explain]

> "Bước 1: Kéo khối 'move forward' vào vùng làm việc."
> [DEMONSTRATE]

> "Bước 2: Thêm khối 'wait 1 second' để robot dừng lại một chút."
> [DEMONSTRATE]

> "Bước 3: Thêm khối 'turn right'."
> [DEMONSTRATE]

> "Bước 4: Thêm 'move forward' một lần nữa."
> [DEMONSTRATE]

> [RESULTING PROGRAM]:
> ```
> move_forward
> wait 1 second
> turn_right
> move_forward
> ```

> "Xong! Chương trình rất đơn giản:"
> "Robot sẽ tiến về trước, dừng lại, quay phải, rồi tiếp tục đi!"

---

### PHASE 7: RUN THE PROGRAM (3 minutes)

**Setup**: Robot on floor, clear path

---

**VOICEOVER/COMMENTS**:

> "Bây giờ là lúc chạy chương trình! Các em sẵn sàng chưa?"
>
> [EXCITED TONE] "3... 2... 1... CHẠY!"
>
> [CLICK RUN BUTTON]
> [WATCH robot execute]

> [REACT WITH ENTHUSIASM]
> "Các em thấy không! Robot thực hiện đúng như chương trình!"
>
> "Tiến về trước... dừng... quay phải... và tiếp tục đi!"
>
> [CLAPPING] "Các em đã lập trình thành công!"

---

### PHASE 8: STUDENT HANDS-ON (10 minutes)

**Setup**: 2-3 students at a time try Blockly

---

**VOICEOVER/COMMENTS**:

> "Bây giờ, [GỌI TÊN 2-3 HỌC SINH] lên đây thử nhé!"
>
> [ASSIST STUDENTS at laptop]

> "Em hãy thử kéo khối 'move forward' vào đây."
> [GUIDE gently]

> "Tốt lắm! Bây giờ em thêm khối 'turn left'."
> [ASSIST as needed]

> "Được rồi! Em bấm nút RUN đi!"
> [LET student press button]

> [CELEBRATE SUCCESS]
> "Tuyệt vời! Robot của em đã hoạt động!"

> [ALLOW 2-3 students to try, adjust time accordingly]

---

### PHASE 9: WHAT CAN ROBOT DO? (3 minutes)

**Setup**: Show slides or continue with live demo

---

**VOICEOVER/COMMENTS**:

> "Robot RoboKids có thể làm được nhiều thứ thú vị:"
>
> "1. Tránh vật cản - nhờ cảm biến siêu âm, robot biết khi nào có vật cản phía trước."
>
> "2. Theo đường line - robot có thể đi theo một đường kẻ trên sàn nhờ cảm biến hồng ngoại."
>
> "3. Hiển thị hình ảnh trên LED matrix - robot có thể vẽ hình và chữ."
>
> "4. Phát nhạc - robot có thể chơi các bài hát khác nhau!"
>
> [DEMONSTRATE sing command if time allows]
> [SEND: sing]

---

### PHASE 10: WRAP-UP & CALL TO ACTION (5 minutes)

**Setup**: Distribute materials, show contact info

---

**VOICEOVER/COMMENTS**:

> "Các em đã học được gì hôm nay?"
>
> [ENGAGE STUDENTS] "Robot có 'bộ não' là chip ESP32."
> "Robot có thể được lập trình bằng Blockly - kéo thả khối."
> "Chúng ta có thể ra lệnh cho robot di chuyển, quay, thậm chí nhảy!"

> "Nếu các em muốn học thêm về lập trình robot, RoboKids có các khóa học:"
>
> "Khóa Robot Cơ Bản: 6-10 tuổi - học về robot, cảm biến, Blockly"
> "Khóa Robot Nâng Cao: 11-16 tuổi - Python, AI, dự án thực tế"
>
> [HAND OUT brochures]

> "Dưới đây là thông tin về RoboKids. Các em có thể mang về cho ba mẹ."
>
> [SHOW CONTACT INFO]
> "Phụ huynh có thể liên hệ: [SỐ ĐIỆN THOẠI] hoặc [EMAIL]"

> "Cảm ơn các em đã tham gia buổi demo hôm nay!"
>
> "Tạm biệt và hẹn gặp lại các em tại RoboKids!"

---

## DEMO VARIATIONS

### For Younger Students (6-8 years) - 30 min
- Focus on: Fun movements, dance, colors
- Keep coding very simple (2-3 blocks max)
- More time for robot demo, less explanation
- Emphasis on: "Các em có thể làm được!"

### For Older Students (11-14 years) - 45 min
- Include more technical details
- Show sensor data (distance readings)
- Let students build more complex programs
- Mention Python programming for advanced

### For Parents/Administrators - 20 min
- Focus on educational value
- Show curriculum progression
- Mention pricing/packages for schools
- Shorter hands-on, longer presentation

---

## TIPS FOR SUCCESS

1. **Energy** - Speak with enthusiasm! Students respond to excitement
2. **Interaction** - Ask questions, get students involved
3. **Celebrate** - Make a big deal of successful runs
4. **Patience** - Some students need more guidance
5. **Safety** - Keep robot on table or contained area for young students
6. **Backup** - Have a recorded video of robot working in case of technical issues

---

## EMERGENCY SCRIPTS

### If Robot Stops Working
> "Ồ, robot của chúng ta đang nghỉ ngơi một chút! [humorous] Đây là lúc chúng ta kiểm tra pin và kết nối - đúng như kỹ sư robot thật sự!"

### If WiFi Fails
> "Không sao! Robot của chúng ta còn có Bluetooth - vẫn có thể điều khiển được!"

### If Student is Struggling
> "[TÊN EM] đang làm rất tốt! Chúng ta cùng xem khối này nha..."

---

## FOLLOW-UP CHECKLIST

After demo:
- [ ] Collect feedback forms
- [ ] Note interested students/parents
- [ ] Send thank-you to school
- [ ] Add leads to CRM
- [ ] Log demo in tracking sheet

---

*Script version: 1.0*
*Created: 2026-04-15*
*Agent: Hardware Engineer (ROB-579)*
*Last updated: 2026-04-15*
