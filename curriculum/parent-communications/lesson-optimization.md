# Hướng Dẫn Tối Ưu Thời Gian Tải Bài Học

## Tổng Quan

Tài liệu này hướng dẫn việc tối ưu hóa thời gian tải cho các bài học RoboKids Vietnam, đảm bảo trẻ em có trải nghiệm học tập liền mạch với thời gian phản hồi dưới 1.5 giây.

---

## Tiêu Chuẩn Thời Gian Tải

### Yêu Cầu Hiệu Suất

| Chỉ số | Mục tiêu | Tối đa |
|--------|----------|--------|
| TTI (Time to Interactive) | 1.5 giây | 2.0 giây |
| First Contentful Paint | < 1.0 giây | 1.5 giây |
| Largest Contentful Paint | < 2.0 giây | 3.0 giây |
| Lesson Load Time | < 2.0 giây | 3.0 giây |

### Nguyên Tắc Lazy Loading

**1. Ưu tiên nội dung trên màn hình đầu tiên:**
- Giao diện chính, nút bắt đầu
- Hướng dẫn cơ bản
- Khối lệnh đầu tiên

**2. Tải sau nội dung phụ:**
- Video hướng dẫn
- Hình ảnh minh họa bổ sung
- Quiz nâng cao

---

## Video Content Optimization

### Tiêu Chuẩn Nén Video

| Loại | Độ phân giải | Bitrate | Dung lượng/Phút |
|------|-------------|---------|------------------|
| Intro | 720p | 1.5 Mbps | ~11 MB |
| Tutorial | 720p | 1.0 Mbps | ~7.5 MB |
| Reference | 480p | 0.5 Mbps | ~4 MB |
| Thumbnail | 240p | 0.1 Mbps | ~0.5 MB |

### Hướng Dẫn Tối Ưu Video

**1. Format khuyến nghị:** WebM (cho web), MP4 H.264 (cho mobile)

**2. Lazy load video:**
```markdown
- Video intro: Load ngay khi mở bài
- Video tutorial: Load khi cuộn đến phần đó
- Video tham khảo: Load khi nhấn nút "Xem thêm"
```

**3. Poster image:**
- Hiển thị hình nền trước khi video tải
- Kích thước: 720x480 pixel
- Định dạng: WebP (nén tốt)

---

## Hình Ảnh & Assets

### Tiêu Chuẩn Hình Ảnh

| Loại | Kích thước | Format | Nén |
|------|------------|--------|-----|
| Block preview | 200x200 | WebP | 80% |
| Illustration | 800x600 | WebP | 85% |
| Background | 1920x1080 | WebP | 75% |
| Icon | 64x64 | SVG | - |

### CSS/Sprite Optimization

- Sử dụng CSS sprites cho icons nhỏ
- Gộp các file CSS nhỏ thành 1 file lớn
- Inline critical CSS trong HTML

---

## Code Splitting

### Nguyên Tắc

**1. Phân chia theo cấp độ:**
```javascript
// Beginner lessons - load cơ bản
import './blocks/basic-blocks';

// Intermediate - thêm sensor blocks
import './blocks/sensor-blocks';

// Advanced - thêm AI blocks
import './blocks/ai-blocks';
```

**2. Lazy load quiz:**
```javascript
// Chỉ load quiz khi trẻ đến phần quiz
const QuizComponent = lazy(() => import('./Quiz'));
```

---

## Data & API Optimization

### Caching Strategy

| Dữ liệu | Cache Strategy | Thời gian |
|---------|---------------|-----------|
| Lesson content | Immutable | Vĩnh viễn (versioned) |
| User progress | LocalStorage | Theo session |
| Block definitions | IndexedDB | 7 ngày |
| Video list | API cache | 1 giờ |

### API Response Optimization

```javascript
// Chỉ gửi dữ liệu cần thiết
GET /api/lessons/:id?fields=title,blocks,estimatedTime

// Response mẫu (nên có):
{
  "id": "lesson-01",
  "title": "Chào Robot!",
  "blocks": [...],
  "estimatedTime": 30,
  "videoUrl": null, // Lazy load
  "quizUrl": null  // Lazy load
}
```

---

## Performance Checklist

### Trước Khi Publish Bài Học Mới

- [ ] Video đã nén đúng tiêu chuẩn
- [ ] Hình ảnh đã chuyển sang WebP
- [ ] Lazy loading đã implement
- [ ] First paint < 1.0 giây
- [ ] TTI < 1.5 giây
- [ ] Không có network request blocking
- [ ] Cache headers đã set đúng

### Testing Checklist

1. **Lần đầu load:** Xóa cache, đo thời gian
2. **Load lại:** Kiểm tra cache hoạt động
3. **Slow 3G:** Test với network chậm
4. **Offline:** Test lazy load fail gracefully

---

## Công Cụ Kiểm Tra

### Browser DevTools

**Chrome Lighthouse:**
```
1. F12 > Lighthouse tab
2. Chọn "Performance"
3. Run audit
4. Kiểm tra TTI < 1.5s
```

**Network Tab:**
```
1. F12 > Network tab
2. Filter: "Doc" để xem HTML
3. Disable cache
4. Reload và đo thời gian
```

### Performance Budget

| Metric | Budget |
|--------|--------|
| Total JS | < 500 KB |
| Total CSS | < 100 KB |
| Total Images | < 1 MB |
| Total Video | < 20 MB |
| Initial Bundle | < 200 KB |

---

## Monitoring & Alerts

### Khi Nào Cần Cảnh Báo

| Metric | Warning | Critical |
|--------|---------|----------|
| TTI | > 2.0s | > 3.0s |
| FCP | > 1.5s | > 2.5s |
| LCP | > 3.0s | > 4.0s |
| Error Rate | > 1% | > 5% |

### Công Cụ Monitoring

- **Sentry:** Track JavaScript errors
- **Firebase Performance:** Real user monitoring
- **Lighthouse CI:** Automated testing trong CI/CD

---

## Best Practices Tóm Tắt

1. **Luôn lazy load video** - không blocking initial render
2. **Sử dụng WebP** cho tất cả hình ảnh
3. **Code splitting** theo cấp độ học
4. **Cache aggressive** - lesson content không đổi
5. **Preload** khối lệnh cơ bản cho lesson tiếp theo
6. **Measure** trước và sau khi thay đổi
7. **Test trên thiết bị thật** - không chỉ dev tools

---

*RoboKids Vietnam - Technical Documentation*
