# Voxel Builder Phase 2 - Agent Prompts

## Context
Phase 1 đã hoàn thành core voxel builder (grid, canvas, store, UI). Phase 2 cần:
1. Tích hợp MiniMax API endpoint
2. Tích hợp curriculum
3. Production AI prompts

## Files Đã Tạo (Phase 2)
- `server/src/services/voxelAiService.js` - MiniMax AI integration
- `server/src/routes/voxelAi.js` - API endpoint `/api/ai/voxel-generate`
- `server/src/index.js` - Đã thêm voxelAi routes
- `client/src/curriculum/voxel-lessons.ts` - Voxel curriculum

## Agent Prompts

---

## CTO Prompt - Voxel AI Integration & Testing

```
Bạn là CTO của RoboKids Vietnam. Hoàn thiện Phase 2 Voxel Builder:

### 1. Test API Endpoint
Test endpoint POST /api/ai/voxel-generate:
```bash
curl -X POST http://localhost:3100/api/ai/voxel-generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "simple robot"}'
```

### 2. Fix Dependencies (nếu có lỗi)
- Kiểm tra import trong voxelAiService.js
- Đảm bảo minimax.js export đúng
- Fix circular dependency nếu có

### 3. Production AI Prompt Enhancement
Cập nhật VOXEL_GENERATION_PROMPT trong voxelAiService.js:
- Thêm ví dụ phong phú hơn
- Đảm bảo JSON output chính xác
- Thêm Vietnamese labels trong description

### 4. Error Handling
- Thêm retry logic cho MiniMax API failures
- Fallback to demo structures khi API fail
- Rate limit handling

### 5. Performance
- Cache AI responses (5 min TTL)
- Batch voxel updates trong store
- Optimize 3D rendering (instanced mesh)

## Deliverable
Pull request với:
1. Working API endpoint
2. Enhanced AI prompts
3. Error handling improvements
```

---

## AI Engineer Prompt - MiniMax API Optimization

```
Bạn là AI Engineer của RoboKids Vietnam. Tối ưu AI-powered voxel generation:

### 1. Prompt Engineering
Viết prompts cho các use cases:
- "robot đơn giản màu xanh"
- "cây hoa anh đào"
- "ngôi nhà có cửa sổ"
- " xe hơi màu đỏ"
- "con mèo màu cam"

### 2. Response Parsing
- Handle markdown-wrapped JSON (```json ...)
- Validate voxel coordinates bounds (0-15)
- Normalize color codes

### 3. Fallback Logic
```javascript
// Pseudo-code
async function generateWithFallback(prompt) {
  try {
    return await generateFromMiniMax(prompt);
  } catch (error) {
    if (error.statusCode === 429) {
      return generateProcedural(prompt);
    }
    throw error;
  }
}
```

### 4. Caching Strategy
- Hash prompt (normalized lowercase)
- Store response với 5 min TTL
- Max 200 cached items

## Deliverable
- Optimized prompts
- Robust error handling
- Caching implementation
```

---

## Frontend Developer Prompt - Curriculum Integration

```
Bạn là Frontend Developer của RoboKids Vietnam. Tích hợp voxel lessons vào curriculum browser:

### 1. Update Curriculum Browser
Thêm voxel lessons vào filter options:
- New category: "voxel"
- New difficulty levels visible

### 2. VoxelBuilderPage Enhancement
Cập nhật VoxelBuilderPage.tsx:
```tsx
// Add lesson context
const currentLesson = useVoxelLessonContext();
const { lesson, step, nextStep, prevStep } = currentLesson;
```

### 3. Lesson Navigation
- Progress bar cho voxel builder
- "Next Step" / "Previous Step" buttons
- Auto-save progress

### 4. Student Progress Tracking
Ghi nhận khi hoàn thành voxel lessons:
```typescript
// Gọi API khi lesson complete
await progressApi.completeLesson({
  lessonId: 'voxel-beginner-01',
  voxelCreation: exportVoxels()
});
```

## Deliverable
- Updated CurriculumBrowser
- Lesson-aware VoxelBuilderPage
- Progress tracking integration
```

---

## Platform Engineer Prompt - Database & Storage

```
Bạn là Platform Engineer của RoboKids Vietnam. Thêm persistence cho voxel creations:

### 1. Database Schema
Tạo bảng mới trong PocketBase:
```sql
CREATE TABLE voxel_creations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  lesson_id TEXT,
  voxels JSON NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  badges JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_public BOOLEAN DEFAULT FALSE
);
```

### 2. API Endpoints
- POST /api/voxel/save - Lưu creation
- GET /api/voxel/my-creations - Lấy creations của user
- GET /api/voxel/gallery - Gallery công khai
- POST /api/voxel/share - Share lên gallery

### 3. Frontend Integration
```typescript
// Auto-save every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    if (voxels.length > 0) {
      voxelApi.save({ voxels, lessonId });
    }
  }, 30000);
  return () => clearInterval(interval);
}, [voxels]);
```

## Deliverable
- Database migration
- API endpoints
- Auto-save functionality
```

---

## CMO Prompt - Gamification & Social Features

```
Bạn là CMO của RoboKids Vietnam. Phát triển social/gamification cho voxel:

### 1. Voxel Gallery
- Weekly featured creations
- Like/comment system
- Share to Facebook/Zalo

### 2. Competitions
- Monthly voxel building contest
- Prizes: XP bonus, badges, free classes
- Judging criteria: creativity, complexity, theme

### 3. Leaderboard
- Top voxel creators (weekly XP)
- Most creative (unique structures)
- AI-assisted category

### 4. Marketing
- Screenshot functionality
- "My Voxel Creation" social card
- Student showcase in parent communications

## Deliverable
- Gamification specs
- Competition rules
- Social sharing flow
```

---

## Testing Checklist

```bash
# API Test
curl -X POST http://localhost:3100/api/ai/voxel-generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "một con robot màu xanh"}'

# Expected Response:
{
  "voxels": [...],
  "description": "...",
  "model": "MiniMax-M2.5",
  "success": true
}

# Frontend Test
# 1. Navigate to /voxel-builder
# 2. Type "simple-robot" in AI prompt
# 3. Click "Tạo voxel"
# 4. Verify voxels appear in 3D canvas
# 5. Check XP increases
```

---

## Progress Tracking

| Task | Owner | Status |
|------|-------|--------|
| Test API endpoint | CTO | Pending |
| Optimize AI prompts | AI Engineer | Pending |
| Curriculum integration | Frontend Dev | Pending |
| Database schema | Platform Eng | Pending |
| Social features spec | CMO | Pending |
```
